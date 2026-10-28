/* The page's motion and behaviour, ported from the design canvas's controller. React renders the markup; this class wires
   the scroll engine (Lenis), every GSAP ScrollTrigger timeline, the point field, the menu, the form, the clock and the
   footer wordmark. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SITE } from '../config.js';
import { FORM_ENDPOINT } from '../content.js';
import { pfClamp } from './util.js';
import { pfField } from './field.js';
import { pfHalftone } from './halftone.js';

const PF_TZ = SITE.timeZone;
const PF_SITE_STRICTNESS = SITE.siteStrictness;

export class PortfolioMotion {
  /* root: the .pf element. opts: { accent, smoothScroll, loader } from config.js. */
  constructor(root, opts) {
    this.opts = opts || {};
    this.pfRoot = root;
    this.pfDoc = root.ownerDocument;
    this.pfWin = this.pfDoc.defaultView;
    this.pfOff = [];
    this.pfMotionOff = [];
    this.pfSplits = [];
    this.pfMode = 'static';
    root.setAttribute('data-motion', 'static');
    this.pfMountAt = performance.now();
    this.pfApplyAccent();
    this.pfBindUI();
    this.pfGrain();
    this.pfCreateField();
    this.pfCreateHalftone();
    this.pfCreateLayers();
    this.pfStartClock();
    this.pfSyncTheme();
    this.pfWaitForGsap(0);
  }

  /* Call after React has changed data-theme on the root. */
  syncTheme() { this.pfSyncTheme(); }

  destroy() {
    this.pfDead = true;
    this.pfTeardownMotion();
    (this.pfOff || []).forEach((off) => off());
    this.pfOff = [];
    clearTimeout(this.pfPoll);
    clearTimeout(this.pfResizeTimer);
    clearTimeout(this.pfFaqTimer);
    clearTimeout(this.pfSentTimer);
    clearInterval(this.pfClockId);
    if (this.pfField) { this.pfField.destroy(); this.pfField = null; }
    if (this.pfHt) { this.pfHt.destroy(); this.pfHt = null; }
    if (this.pfLayers) { this.pfLayers.destroy(); this.pfLayers = null; }
  }

  /* ---------- helpers ---------- */
  pfQ(sel) { return Array.prototype.slice.call(this.pfRoot.querySelectorAll(sel)); }
  pfOne(sel) { return this.pfRoot.querySelector(sel); }
  pfMatch(query) { return this.pfWin.matchMedia(query).matches; }
  pfOn(target, type, fn, opts, motion) {
    target.addEventListener(type, fn, opts);
    (motion ? this.pfMotionOff : this.pfOff).push(() => target.removeEventListener(type, fn, opts));
  }

  pfApplyAccent() {
    const v = this.opts.accent;
    const css = this.pfWin.CSS;
    if (typeof v === 'string' && css && css.supports('color', v)) { this.pfRoot.style.setProperty('--accent', v); }
    else { this.pfRoot.style.removeProperty('--accent'); }
  }

  pfEffectiveTheme() {
    const t = this.pfRoot.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') { return t; }
    return this.pfMatch('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  }

  pfSyncTheme() {
    const dark = this.pfEffectiveTheme() === 'dark';
    if (this.pfField) { this.pfField.setTheme(!dark); }
    if (this.pfHt) { this.pfHt.setInk(dark ? '#EEF2F8' : '#0D1230'); }
    if (this.pfLayers) { this.pfLayers.setTheme(!dark); }
  }

  /* commit(next) must apply the theme synchronously (React: flushSync(() => setTheme(next))). The new theme wipes in as a
     circle from the toggle. */
  toggleTheme(ev, commit) {
    const next = this.pfEffectiveTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => { commit(next); this.pfSyncTheme(); };
    const doc = this.pfDoc;
    if (!doc.startViewTransition || this.pfMatch('(prefers-reduced-motion: reduce)')) { apply(); return; }
    const btn = ev && ev.currentTarget;
    const r = btn ? btn.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const w = this.pfWin.innerWidth;
    const h = this.pfWin.innerHeight;
    const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      doc.documentElement.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 650, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }

  /* ---------- always-on interface ---------- */
  pfBindUI() {
    const menu = this.pfOne('#pf-menu');
    if (menu) {
      menu.setAttribute('inert', '');
      this.pfQ('[data-menu-open]').forEach((b) => this.pfOn(b, 'click', () => this.pfOpenMenu()));
      this.pfQ('[data-menu-close]').forEach((b) => this.pfOn(b, 'click', () => this.pfCloseMenu(true)));
      this.pfOn(menu, 'keydown', (e) => this.pfMenuKeys(e, menu));
    }
    this.pfOn(this.pfRoot, 'click', (e) => this.pfOnLink(e));
    this.pfBindForm();
    this.pfBindFaq();
  }

  pfOpenMenu() {
    const menu = this.pfOne('#pf-menu');
    if (!menu || this.pfMenuOpen) { return; }
    this.pfMenuOpen = true;
    this.pfLastFocus = this.pfDoc.activeElement;
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    menu.setAttribute('data-open', 'true');
    this.pfQ('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    if (this.pfLenis) { this.pfLenis.stop(); }
    this.pfDoc.documentElement.style.overflow = 'hidden';
    const first = menu.querySelector('a[href], button');
    if (first) { setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (err) { first.focus(); } }, 60); }
  }

  pfCloseMenu(restoreFocus) {
    const menu = this.pfOne('#pf-menu');
    if (!menu || !this.pfMenuOpen) { return; }
    this.pfMenuOpen = false;
    menu.setAttribute('data-open', 'false');
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    this.pfQ('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (this.pfLenis) { this.pfLenis.start(); }
    this.pfDoc.documentElement.style.overflow = '';
    const last = this.pfLastFocus;
    if (restoreFocus && last && last.focus) { try { last.focus({ preventScroll: true }); } catch (err) { last.focus(); } }
  }

  pfMenuKeys(e, menu) {
    if (e.key === 'Escape') { e.preventDefault(); this.pfCloseMenu(true); return; }
    if (e.key !== 'Tab') { return; }
    const items = Array.prototype.filter.call(menu.querySelectorAll('a[href], button:not([disabled])'), (el) => el.getClientRects().length > 0);
    if (!items.length) { return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.pfDoc.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  pfOnLink(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) { return; }
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id ? this.pfDoc.getElementById(id) : null;
    if (!target || !this.pfRoot.contains(target)) { return; }
    e.preventDefault();
    if (this.pfMenuOpen) { this.pfCloseMenu(false); }
    this.pfScrollTo(target);
  }

  pfScrollTo(target) {
    const w = this.pfWin;
    const reduce = this.pfMatch('(prefers-reduced-motion: reduce)');
    const settle = () => {
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
      try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    };
    if (this.pfLenis && !reduce) {
      // A link's own scroll is never slowed on its way past the hero.
      this.pfNavUntil = performance.now() + 1700;
      this.pfLenis.scrollTo(target, { offset: 0, duration: 1.5, onComplete: settle });
      return;
    }
    const sc = this.pfScroller && this.pfScroller !== w ? this.pfScroller : null;
    const top = target.getBoundingClientRect().top;
    if (sc) { sc.scrollTo({ top: sc.scrollTop + top - sc.getBoundingClientRect().top, behavior: reduce ? 'auto' : 'smooth' }); }
    else { w.scrollTo({ top: w.pageYOffset + top, behavior: reduce ? 'auto' : 'smooth' }); }
    settle();
  }

  pfBindForm() {
    const form = this.pfOne('[data-contact-form]');
    if (!form) { return; }
    form.setAttribute('novalidate', '');
    const fields = { name: form.querySelector('#cf-name'), email: form.querySelector('#cf-email'), message: form.querySelector('#cf-message') };
    const status = form.querySelector('[data-status]');
    const button = form.querySelector('[data-submit]');
    const label = button.querySelector('[data-submit-label]') || button;
    const idleText = label.textContent;
    // The state drives the icon in CSS: arrow when idle, spinner while sending, a check for a moment once sent.
    const setState = (state, text) => { button.dataset.state = state; label.textContent = text; };
    const check = (key) => {
      const v = (fields[key].value || '').trim();
      if (key === 'name') { return v ? '' : 'Enter your name.'; }
      if (key === 'email') {
        if (!v) { return 'Enter your email address.'; }
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email address like name@example.com.';
      }
      return v.length >= 10 ? '' : 'Write a short message (at least 10 characters).';
    };
    const show = (key, msg) => {
      const input = fields[key];
      const err = form.querySelector('#' + input.id + '-err');
      if (msg) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); }
      if (err) { err.textContent = msg; }
    };
    Object.keys(fields).forEach((key) => {
      const input = fields[key];
      if (!input) { return; }
      this.pfOn(input, 'input', () => { if (input.getAttribute('aria-invalid') === 'true') { show(key, check(key)); } });
      this.pfOn(input, 'blur', () => { if (input.value) { show(key, check(key)); } });
    });
    this.pfOn(form, 'submit', (e) => {
      e.preventDefault();
      if (status) { status.textContent = ''; }
      let firstBad = null;
      Object.keys(fields).forEach((key) => {
        const msg = check(key);
        show(key, msg);
        if (msg && !firstBad) { firstBad = fields[key]; }
      });
      if (firstBad) { firstBad.focus(); return; }

      if (!FORM_ENDPOINT) {
        if (status) { status.textContent = 'Thanks! This form isn’t connected yet, so nothing was sent. Please email me directly for now.'; }
        return;
      }
      clearTimeout(this.pfSentTimer);
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      setState('sending', 'Sending…');
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) })
        .then((res) => {
          if (!res.ok) { throw new Error('HTTP ' + res.status); }
          form.reset();
          if (status) { status.textContent = 'Message sent. I’ll reply soon.'; }
          return true;
        })
        .catch(() => { if (status) { status.textContent = 'Your message couldn’t be sent. Check your connection and try again, or email me directly.'; } return false; })
        .then((sent) => {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          if (!sent) { setState('idle', idleText); return; }
          setState('sent', 'Sent');
          this.pfSentTimer = setTimeout(() => setState('idle', idleText), 2400);
        });
    });
  }

  /* The FAQ: each question opens its answer in place, one at a time. With a mouse, a pale band slides over the row from
     the edge the pointer came in by and leaves through the edge it goes out by. The strip inside moves the opposite way,
     so it holds still while the band wipes across it, and it only scrolls (CSS) while the row is hot. Under reduced
     motion the band fades in and out instead. Touch has no hover: a tap just opens the answer. */
  pfBindFaq() {
    const items = this.pfQ('[data-faq-item]').map((item) => ({
      item,
      q: item.querySelector('[data-faq-q]'),
      row: item.querySelector('[data-faq-row]'),
      band: item.querySelector('[data-faq-band]'),
      track: item.querySelector('[data-faq-track]')
    }));
    const setOpen = (it, open) => {
      it.item.classList.toggle('is-open', open);
      it.q.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    items.forEach((it) => {
      this.pfOn(it.q, 'click', () => {
        const open = !it.item.classList.contains('is-open');
        items.forEach((other) => { if (other !== it && other.item.classList.contains('is-open')) { setOpen(other, false); } });
        setOpen(it, open);
        // Everything below has moved, so re-measure the scroll animations once the answer has settled.
        clearTimeout(this.pfFaqTimer);
        this.pfFaqTimer = setTimeout(() => { if (this.pfReady && this.pfMode !== 'static') { ScrollTrigger.refresh(); } }, 260);
      });

      const { row, band, track } = it;
      gsap.set(band, { y: 0, yPercent: 101 });
      gsap.set(track, { y: 0, yPercent: -101 });
      const edge = (e) => { const r = row.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? -1 : 1; };
      const reduce = () => this.pfMatch('(prefers-reduced-motion: reduce)');
      this.pfOn(row, 'pointerenter', (e) => {
        if (e.pointerType !== 'mouse') { return; }
        row.classList.add('is-hot');
        if (reduce()) {
          gsap.set([band, track], { yPercent: 0 });
          gsap.fromTo(band, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out', overwrite: true });
          return;
        }
        // A band still on its way out just turns round; otherwise it starts from the edge the pointer crossed.
        if (!gsap.isTweening(band)) {
          const d = edge(e);
          gsap.set(band, { yPercent: d * 101, autoAlpha: 1 });
          gsap.set(track, { yPercent: -d * 101 });
        }
        gsap.to([band, track], { yPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: true });
      });
      this.pfOn(row, 'pointerleave', (e) => {
        if (e.pointerType !== 'mouse') { return; }
        const cool = () => row.classList.remove('is-hot');
        if (reduce()) { gsap.to(band, { autoAlpha: 0, duration: 0.2, ease: 'power1.out', overwrite: true, onComplete: cool }); return; }
        const d = edge(e);
        gsap.to(band, { yPercent: d * 101, duration: 0.6, ease: 'expo.out', overwrite: true, onComplete: cool });
        gsap.to(track, { yPercent: -d * 101, duration: 0.6, ease: 'expo.out', overwrite: true });
      });
    });
  }

  /* ---------- motion lifecycle ---------- */
  pfWaitForGsap() {
    // GSAP is bundled, so it is always here; wait a tick so React has laid the page out.
    this.pfGsapLate = false;
    this.pfPoll = setTimeout(() => this.pfInitMotion(), 0);
  }

  pfInitMotion() {
    const w = this.pfWin;
    const ST = ScrollTrigger;
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    this.pfReady = true;
    this.pfLastW = w.innerWidth;
    this.pfLastH = w.innerHeight;
    this.pfRebuild();
    this.pfOn(w, 'resize', () => {
      clearTimeout(this.pfResizeTimer);
      this.pfResizeTimer = setTimeout(() => {
        const W = w.innerWidth;
        const H = w.innerHeight;
        if (W >= 900 && this.pfMenuOpen) { this.pfCloseMenu(false); }
        const big = Math.abs(W - this.pfLastW) > 1 || Math.abs(H - this.pfLastH) > this.pfLastH * 0.25;
        if (!big) { return; }
        this.pfLastW = W;
        this.pfLastH = H;
        this.pfRebuild();
      }, 220);
    });
    const fonts = this.pfDoc.fonts;
    if (fonts && fonts.ready) { fonts.ready.then(() => { if (this.pfMode !== 'static' && this.pfReady) { ST.refresh(); } }); }
    const mqMotion = w.matchMedia('(prefers-reduced-motion: reduce)');
    const mqScheme = w.matchMedia('(prefers-color-scheme: dark)');
    const onMotion = () => this.pfRebuild();
    const onScheme = () => this.pfSyncTheme();
    if (mqMotion.addEventListener) {
      mqMotion.addEventListener('change', onMotion);
      mqScheme.addEventListener('change', onScheme);
      this.pfOff.push(() => { mqMotion.removeEventListener('change', onMotion); mqScheme.removeEventListener('change', onScheme); });
    }
  }

  pfFindScroller() {
    const w = this.pfWin;
    let el = this.pfRoot.parentElement;
    while (el && el !== this.pfDoc.documentElement) {
      const s = w.getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) { return el; }
      el = el.parentElement;
    }
    return w;
  }

  pfGetMode() {
    const w = this.pfWin;
    const sc = this.pfFindScroller();
    const viewH = sc === w ? w.innerHeight : sc.clientHeight;
    const fullH = sc === w ? this.pfDoc.documentElement.scrollHeight : sc.scrollHeight;
    // On the canvas the frame is as tall as the page, so nothing can scroll: show the finished layout.
    if (fullH - viewH < 240) { return 'static'; }
    return this.pfMatch('(prefers-reduced-motion: reduce)') ? 'reduced' : 'cinematic';
  }

  pfRebuild() {
    this.pfTeardownMotion();
    this.pfApplyMode(this.pfGetMode());
  }

  pfApplyMode(mode) {
    const w = this.pfWin;
    const ST = ScrollTrigger;
    this.pfMode = mode;
    this.pfRoot.setAttribute('data-motion', mode);
    if (this.pfField) { this.pfField.setLive(mode === 'cinematic'); }
    if (mode === 'static') { return; }
    const sc = this.pfFindScroller();
    this.pfScroller = sc;
    ST.defaults({ scroller: sc });
    if (mode === 'cinematic') { this.pfRoot.classList.add('is-cine'); }
    this.pfCtx = gsap.context(() => {
      if (mode === 'cinematic') { this.pfCinematic(gsap, ST, sc); }
      else { this.pfReduced(gsap, ST); }
    }, this.pfRoot);
    ST.refresh();
  }

  pfTeardownMotion() {
    const w = this.pfWin;
    if (!w) { return; }
    (this.pfMotionOff || []).forEach((off) => off());
    this.pfMotionOff = [];
    if (this.pfLoaderFinish) { this.pfLoaderFinish(true); this.pfLoaderFinish = null; }
    if (this.pfNameReset) { this.pfNameReset(); this.pfNameReset = null; }
    if (this.pfLenis) { this.pfLenis.destroy(); this.pfLenis = null; }
    if (this.pfRaf) { gsap.ticker.remove(this.pfRaf); gsap.ticker.lagSmoothing(500, 33); }
    this.pfRaf = null;
    if (this.pfCtx) { this.pfCtx.revert(); this.pfCtx = null; }
    if (this.pfLayersReset) { this.pfLayersReset(); this.pfLayersReset = null; }
    (this.pfSplits || []).slice().forEach((s) => this.pfRevertSplit(s));
    this.pfSplits = [];
    if (this.pfField) { this.pfField.out(); this.pfField.setHeroScroll(0); this.pfField.setOpacity(1); this.pfField.setIntro(1); }
    if (this.pfHt) { this.pfHt.setReveal(1); }
    if (this.pfRoot) {
      this.pfRoot.classList.remove('is-cine', 'is-lx-pin', 'is-loading');
      this.pfNameScrolled = false;
      const nav = this.pfOne('.pf-nav');
      if (nav) { nav.classList.remove('is-scrolled', 'is-hidden'); }
      this.pfQ('.pf-nav__list a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
      this.pfQ('[data-cursor]').forEach((c) => c.classList.remove('is-on', 'is-hover', 'is-down', 'is-ink'));
      this.pfDoc.documentElement.classList.remove('pf-has-cursor');
      const spot = this.pfOne('[data-spot]');
      if (spot) { spot.classList.remove('is-on'); }
    }
  }

  /* Wrap each word in spans for animation. Text stays real text for screen readers;
     links and buttons are never split, and everything is put back on teardown. */
  pfSplitWords(el, mask) {
    const doc = this.pfDoc;
    const split = { words: [], inners: [], records: [] };
    const walker = doc.createTreeWalker(el, 4);
    const nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    nodes.forEach((node) => {
      if (!node.nodeValue.trim()) { return; }
      if (node.parentElement && node.parentElement.closest('a, button')) { return; }
      const frag = doc.createDocumentFragment();
      const created = [];
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) { return; }
        if (/^\s+$/.test(part)) { const sp = doc.createTextNode(part); frag.appendChild(sp); created.push(sp); return; }
        const word = doc.createElement('span');
        word.className = mask ? 'pf-wm' : 'pf-w';
        if (mask) {
          const inner = doc.createElement('span');
          inner.className = 'pf-wi';
          inner.textContent = part;
          word.appendChild(inner);
          split.inners.push(inner);
        } else {
          word.textContent = part;
        }
        frag.appendChild(word);
        created.push(word);
        split.words.push(word);
      });
      const parent = node.parentNode;
      parent.insertBefore(frag, node);
      parent.removeChild(node);
      split.records.push({ node: node, parent: parent, created: created });
    });
    this.pfSplits.push(split);
    return split;
  }

  /* Split el into words for animation, keeping its accessible name: a hidden copy of the text stays in place and the
     visible words are aria-hidden. pfRevertSplit puts everything back. */
  pfSplitHidden(el) {
    const label = el.textContent;
    const split = this.pfSplitWords(el, false);
    const sr = this.pfDoc.createElement('span');
    sr.className = 'pf-sr';
    sr.textContent = label;
    el.insertBefore(sr, el.firstChild);
    split.cleanup = () => { if (sr.parentNode) { sr.parentNode.removeChild(sr); } };
    split.words.forEach((word) => { word.setAttribute('aria-hidden', 'true'); word.classList.add('pf-dw'); });
    return split;
  }

  /* Blur-and-drift text. Each word is a state { q } running 0 to 1: it sharpens out of a blur while it drifts dx pixels
     sideways into place. Tween q (any ease, any scrub), then call arr.render() to paint the words. */
  pfFocus(el, dx) {
    const split = this.pfSplitHidden(el);
    const states = split.words.map((word) => ({ q: 0, last: NaN, word: word }));
    const paint = (s) => {
      if (s.q === s.last) { return; }
      s.last = s.q;
      const q = pfClamp(s.q, 0, 1);
      const w = s.word;
      if (q >= 1) { w.style.filter = ''; w.style.opacity = ''; w.style.transform = ''; return; }
      const e = 1 - Math.pow(1 - q, 3);
      const blur = (1 - e) * 8;
      w.style.filter = blur > 0.2 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      w.style.opacity = pfClamp(q * 2.2, 0, 1).toFixed(3);
      w.style.transform = 'translate3d(' + (dx * (1 - e)).toFixed(2) + 'px,0,0)';
    };
    states.render = () => { states.forEach(paint); };
    states.render();
    return states;
  }

  /* Blur-and-decode text. Each word is a state { q } running 0 to 1: its letters flicker through look-alike glyphs and lock
     in left to right while the word sharpens out of a blur. Tween q (any ease, any scrub), then call arr.render() to paint the words.
     The real text is restored at q = 1 and words keep their measured width while they flicker so nothing around them shifts. */
  pfDecode(el) {
    const split = this.pfSplitHidden(el);
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const MARKS = '#%&*+=/<>_';
    const FRAMES = 26;
    const states = split.words.map((word, wi) => {
      return { q: 0, last: NaN, key: -1, word: word, text: word.textContent, seed: (wi + 1) * 7919 };
    });
    const paint = (s) => {
      if (s.q === s.last) { return; }
      s.last = s.q;
      const q = pfClamp(s.q, 0, 1);
      const w = s.word;
      if (q >= 1) {
        if (s.key !== -1) { s.key = -1; w.textContent = s.text; w.style.width = ''; w.style.filter = ''; w.style.opacity = ''; }
        return;
      }
      if (s.key === -1) {
        // Leaving the resting state: measure the real word, then hold that width while its letters change.
        w.textContent = s.text;
        w.style.width = w.getBoundingClientRect().width.toFixed(2) + 'px';
        s.key = -2;
      }
      const key = Math.floor(q * FRAMES);
      if (key !== s.key) {
        s.key = key;
        const n = s.text.length;
        let out = '';
        for (let i = 0; i < n; i++) {
          const ch = s.text.charAt(i);
          if (!/[A-Za-z0-9]/.test(ch) || q >= 0.15 + 0.8 * (i + 1) / n) { out += ch; continue; }
          const h = (Math.imul(i + 1, 2654435761) ^ Math.imul(key + 1, 40503) ^ s.seed) >>> 0;
          if (h % 4 === 0) { out += MARKS.charAt((h >>> 3) % MARKS.length); }
          else { const pool = /[A-Z]/.test(ch) ? UPPER : LOWER; out += pool.charAt((h >>> 3) % pool.length); }
        }
        w.textContent = out;
      }
      const e = 1 - Math.pow(1 - q, 3);
      const blur = (1 - e) * 9;
      w.style.filter = blur > 0.2 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      w.style.opacity = pfClamp(q * 3, 0, 1).toFixed(3);
    };
    // Paints whatever q now holds. Call it from the tween's onUpdate and onComplete, or from a scrubbed timeline's own
    // onUpdate, so a jump straight to the end can't leave a word half-decoded.
    states.render = () => { states.forEach(paint); };
    states.render();
    return states;
  }

  pfRevertSplit(split) {
    if (split.cleanup) { split.cleanup(); split.cleanup = null; }
    split.records.forEach((r) => {
      const first = r.created[0];
      if (first && first.parentNode === r.parent) { r.parent.insertBefore(r.node, first); }
      r.created.forEach((c) => { if (c.parentNode) { c.parentNode.removeChild(c); } });
    });
    split.records = [];
    this.pfSplits = this.pfSplits.filter((s) => s !== split);
  }

  pfViewH() {
    const sc = this.pfScroller;
    return sc && sc !== this.pfWin ? sc.clientHeight : this.pfWin.innerHeight;
  }

  /* Speed limit. Through the hero's scroll range, the Skills story and the keyboard's flight (the capped ranges, kept in
     pfCaps) the scroll target can only run a short way ahead of where the page is, so each plays at a steady, cinematic pace
     however hard the wheel is spun. Everywhere else the same limit applies at
     PF_SITE_STRICTNESS of the hero's strength (0.3: the target may lead about 3.3 times as far), so the page still feels
     weighted but a fast flick gets somewhere. Nothing scrolls by itself, and a gentle scroll is untouched. Lenis calls
     this for every wheel event and applies deltaY after. */
  pfCapWheel(data) {
    const lenis = this.pfLenis;
    if (!lenis || !data || !data.event || data.event.type !== 'wheel') { return true; }
    if (performance.now() < (this.pfNavUntil || 0)) { return true; }
    this.pfTrackWheel(data.deltaY);
    const a = lenis.animatedScroll;
    const t0 = lenis.targetScroll;
    const t1 = t0 + data.deltaY;
    const cap = this.pfCapFor(a, t1);
    if (Math.abs(t1 - a) <= cap) { return true; }
    let d = a + pfClamp(t1 - a, -cap, cap) - t0;
    // A zero delta would let the browser scroll natively, so keep it a hair off zero.
    if (Math.abs(d) < 0.01) { d = d < 0 ? -0.01 : 0.01; }
    data.deltaY = d;
    return true;
  }

  /* The capped range the scroll between a and t touches, with a run-up of three caps either side so a flick that starts
     just outside can't launch into it (a range's after() replaces the run-up past its end); null elsewhere. A range is
     { start(), end(), cap(), after?() } in scroll pixels. */
  pfCapAt(a, t) {
    const lo = Math.min(a, t);
    const hi = Math.max(a, t);
    const caps = this.pfCaps || [];
    for (let i = 0; i < caps.length; i++) {
      const c = caps[i];
      const pad = c.cap() * 3;
      const after = c.after ? c.after() : pad;
      if (!(hi < c.start() - pad || lo > c.end() + after)) { return c; }
    }
    return null;
  }

  // How far the scroll target may lead the page where the scroll between a and t is: the range's own limit, else the site-wide one.
  pfCapFor(a, t) {
    const range = this.pfCapAt(a, t);
    return range ? range.cap() : this.pfSiteCap();
  }

  pfAddCap(range) {
    if (!this.pfCaps) { this.pfCaps = []; }
    this.pfCaps.push(range);
    this.pfMotionOff.push(() => { this.pfCaps = (this.pfCaps || []).filter((c) => c !== range); });
  }

  // How far the scroll target may lead the page inside a capped range, as a share of the screen's height (the one number to
  // raise or lower to speed up or slow down the hero, the Skills story and the keyboard's flight together).
  pfCapPx() { return Math.max(100, this.pfViewH() * 0.17); }

  /* How hard the wheel is being spun, as a smoothed rate in px/ms that fades out within a few hundred ms of the last event.
     A gentle scroll stays near 0-1; a fast spin or a hard trackpad flick runs 3-10. */
  pfTrackWheel(dy) {
    const now = performance.now();
    const dt = Math.max(8, now - (this.pfWheelT || 0));
    const k = Math.min(1, dt / 120);
    this.pfWheelRate = this.pfWheelRate0() * (1 - k) + (Math.abs(dy) / dt) * k;
    this.pfWheelT = now;
  }

  pfWheelRate0() { return (this.pfWheelRate || 0) * Math.exp(-(performance.now() - (this.pfWheelT || 0)) / 250); }

  // The limit for the Skills story and the keyboard's flight that follows it: the hero's at a normal pace, loosening up
  // to 2.2x as the wheel spins faster, so a fast scroll still gets through quicker while a gentle one plays every chapter.
  pfFastCapPx() {
    const boost = pfClamp((this.pfWheelRate0() - 1.2) / 5, 0, 1);
    return this.pfCapPx() * (1 + 1.2 * boost);
  }

  /* The keyboard's flight is driven by scroll position (lib/keyboard.js): it begins when the section's top is 1.55 screens
     down and lands when the stage's centre reaches 55% of the screen's height. Cap the scroll across that stretch. */
  pfKeyboardCap(ST) {
    const sec = this.pfOne('.pf-kb');
    const stage = this.pfOne('.pf-kb__stage');
    if (!this.pfLenis || !sec || !stage) { return; }
    const w = this.pfWin;
    let range = null;
    const measure = () => {
      const sc = this.pfScroller;
      const y = sc && sc !== w ? sc.scrollTop : w.pageYOffset;
      const vh = this.pfViewH();
      const top = sec.getBoundingClientRect().top + y;
      const mid = stage.getBoundingClientRect().top + y + stage.offsetHeight / 2;
      return { start: top - vh * 1.55, end: mid - vh * 0.55 };
    };
    const get = () => range || (range = measure());
    const stale = () => { range = null; };
    ST.addEventListener('refresh', stale);
    this.pfMotionOff.push(() => ST.removeEventListener('refresh', stale));
    // The slow limit ends the moment it has landed (no run-up past the end); the site-wide limit takes over below it. It
    // starts while the Skills story is still ending, so it loosens on a fast scroll the same way the story does.
    this.pfAddCap({ start: () => get().start, end: () => get().end, cap: () => this.pfFastCapPx(), after: () => 0 });
  }

  // The rest of the site: the hero's allowed lead divided by PF_SITE_STRICTNESS.
  pfSiteCap() { return Math.max(80, this.pfViewH() * 0.13) / PF_SITE_STRICTNESS; }

  /* ---------- the cinematic page ---------- */
  pfCinematic(gsap, ST, sc) {
    const w = this.pfWin;
    const fine = this.pfMatch('(hover: hover) and (pointer: fine)');
    if (fine && this.opts.smoothScroll !== false ) {
      const opts = { lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, virtualScroll: (data) => this.pfCapWheel(data) };
      if (sc !== w) { opts.wrapper = sc; opts.content = sc.firstElementChild || this.pfRoot; }
      const lenis = new Lenis(opts);
      lenis.on('scroll', ST.update);
      this.pfRaf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(this.pfRaf);
      gsap.ticker.lagSmoothing(0);
      this.pfLenis = lenis;
      // Trim any lead a flick left over to the limit of the range it is in, or the site-wide one outside them all.
      lenis.on('scroll', (l) => {
        if (l.isScrolling !== 'smooth' || performance.now() < (this.pfNavUntil || 0)) { return; }
        const a = l.animatedScroll;
        const lead = l.targetScroll - a;
        const cap = this.pfCapFor(a, a);
        if (Math.abs(lead) > cap + 1) { lenis.scrollTo(a + Math.sign(lead) * cap, { programmatic: false }); }
      });
    }
    this.pfFieldLive(ST);
    const playIntro = this.pfHero(gsap);
    this.pfHeadings(gsap);
    this.pfAbout(gsap);
    this.pfSkills(gsap, ST, true);
    this.pfKeyboardCap(ST);
    this.pfProjects(gsap);
    this.pfFaq(gsap);
    this.pfContact(gsap);
    this.pfFooterReveal(gsap);
    if (fine) { this.pfMagnets(gsap); this.pfNameLight(gsap); this.pfTilt(gsap); this.pfCursor(gsap); }
    this.pfChrome(gsap, ST, true);
    this.pfLoader(gsap, ST, () => { if (playIntro) { playIntro(); } });
  }

  pfReduced(gsap, ST) {
    gsap.from(this.pfOne('.pf-hero__inner'), { opacity: 0, duration: 0.6, ease: 'power1.out' });
    this.pfSkills(gsap, ST, false);
    this.pfChrome(gsap, ST, false);
  }

  /* The field sits fixed behind the page while the hero is on screen, then fades as it scrolls away. */
  pfFieldLive(ST) {
    const field = this.pfField;
    const hero = this.pfOne('.pf-hero');
    if (!field || !hero) { return; }
    const w = this.pfWin;
    // Its scroll fade is driven by the hero's pinned zoom (see pfHero).
    this.pfOn(w, 'pointermove', (e) => field.pointer(e.clientX, e.clientY), { passive: true }, true);
    this.pfOn(w, 'pointerdown', (e) => field.pulse(e.clientX, e.clientY), { passive: true }, true);
    this.pfOn(this.pfDoc, 'mouseout', (e) => { if (!e.relatedTarget) { field.out(); } }, false, true);
  }

  pfHero(gsap) {
    const hero = this.pfOne('.pf-hero');
    if (!hero) { return null; }
    const nameEl = this.pfOne('.pf-name');
    const letters = this.pfQ('[data-hn-letter]');
    const glowWrap = this.pfOne('.pf-name__glow');
    const field = this.pfField;
    let playIntro = null;
    // The intro plays once per visit. A resize rebuilds the motion but never replays it.
    if (!this.pfIntroPlayed && hero.getBoundingClientRect().bottom > 0) {
      const role = this.pfOne('.pf-hero__role');
      const intro = { v: 0 };
      if (field) { field.setIntro(0); }
      // A calm fade: the name, role, buttons and lede simply fade in together, with no movement.
      const introTl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      introTl.to(intro, { v: 1, duration: 2.8, ease: 'power2.out', onUpdate: () => { if (field) { field.setIntro(intro.v); } } }, 0)
        .from(this.pfOne('.pf-nav__inner'), { opacity: 0, duration: 0.9 }, 0.1)
        .from(letters, { opacity: 0, duration: 1.1 }, 0.1)
        .from(role ? [role] : [], { opacity: 0, duration: 1 }, 0.3)
        .from(this.pfQ('.pf-hero__ctas .pf-btn'), { opacity: 0, duration: 1, stagger: 0.08 }, 0.45)
        .from(this.pfOne('.pf-hero__lede'), { opacity: 0, duration: 1 }, 0.55);
      playIntro = () => {
        this.pfIntroPlayed = true;
        introTl.play();
        // On slow devices lag smoothing can stretch the intro; a wall-clock guard finishes it on time.
        const guard = setTimeout(() => { if (introTl.progress() < 1) { introTl.progress(1); } }, 3300);
        this.pfMotionOff.push(() => clearTimeout(guard));
      };
    }
    // Scrolling away, you fly into the screen through the counter of the O. The whole hero plane (role, name,
    // lede and buttons) scales as one from the O's centre, so it reads as the camera moving, not one word growing.
    // The scale is exponential in scroll (each stretch of scroll doubles it, which is how a steady zoom feels) and
    // ends once the O's hole is wider than the hero on every side. force3D stays off: in GSAP's default 3D mode the
    // hero is cached as a GPU bitmap and stretched as it grows, which softens the type; in 2D it is repainted sharp
    // at every size. The hero pins while the zoom plays, so you fly through the O instead of watching it leave.
    const inner = this.pfOne('.pf-hero__inner');
    if (!inner || !nameEl) { return playIntro; }
    const about = this.pfOne('#about');
    const zoom = { s: 16 };
    // How far About's text has risen into the bottom of the screen when the zoom ends, as a share of the screen's height.
    // The bigger it is, the earlier About shows: its text reaches the bottom edge SHOW of the way through the scroll
    // (0.05 was the very last moment, 0.16 about 87%, 0.28 about 77%).
    const PEEK = 0.28;
    const SHOW = 1 - PEEK / 1.2;
    const scrollLen = () => Math.round(this.pfViewH() * 1.2);
    const measure = () => {
      // Layout offsets ignore transforms, so this reads true at any point of the zoom.
      const nw = nameEl.offsetWidth;
      const nh = nameEl.offsetHeight;
      const ox = nameEl.offsetLeft + nw * 0.48403;
      const oy = nameEl.offsetTop + nh * 0.5;
      inner.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
      // The O's counter as the ellipse inside it; the real counter is fuller, so this errs on the safe side.
      const a = nw * 0.200875 * (410 / 918) / 2;
      const b = nh * (370 / 712) / 2;
      const cx = inner.offsetLeft + ox;
      const cy = inner.offsetTop + oy;
      const W = hero.offsetWidth;
      const H = Math.min(hero.offsetHeight, this.pfViewH());
      let need = 0;
      [[0, 0], [W, 0], [0, H], [W, H]].forEach((c) => {
        const dx = (c[0] - cx) / a;
        const dy = (c[1] - cy) / b;
        need = Math.max(need, Math.sqrt(dx * dx + dy * dy));
      });
      zoom.s = a > 1 && b > 1 && isFinite(need) ? pfClamp(need * 1.12, 6, 80) : 16;
      if (about) {
        // The real About section rises from the bottom of the screen as you scroll, like any section after the hero. It is
        // timed so it meets the bottom edge just as the zoom ends, so only the very top of its first line shows then and
        // further scrolling brings in the rest normally. Its place in the flow is the hero plus the pin's scroll length
        // (that cancels out below), minus this margin; the gap above its text is its own section padding.
        const vh = this.pfViewH();
        const pad = parseFloat(this.pfWin.getComputedStyle(about).paddingTop) || 0;
        const peek = Math.round(vh * PEEK);
        about.style.marginTop = Math.round(vh - peek - pad - hero.offsetHeight) + 'px';
      }
    };
    measure();
    this.pfMotionOff.push(() => {
      inner.style.transformOrigin = '';
      if (about) { about.style.marginTop = ''; }
    });
    const zoomEase = (p) => (Math.pow(zoom.s, p) - 1) / (zoom.s - 1);
    // No copy of the section and no fill inside the hole. The real About section simply arrives from the bottom of the
    // screen (its margin, set in measure(), times that). The hero sits above it (see .pf-hero), so About only shows where
    // the hero lets it through: inside the O's hole, with the ring hiding it everywhere else.
    const out = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
      trigger: hero, start: 'top top', end: () => '+=' + scrollLen(),
      pin: true, anticipatePin: 1, scrub: 1, invalidateOnRefresh: true, refreshPriority: 2,
      onRefreshInit: measure,
      onUpdate: (self) => {
        this.pfNameScrolled = self.progress > 0.002;
        if (this.pfNameScrolled && glowWrap) { glowWrap.classList.remove('is-lit'); }
        if (field) { field.setHeroScroll(self.progress); field.setOpacity(1 - pfClamp((self.progress - (SHOW - 0.2)) / 0.2, 0, 1)); }
      }
    } });
    // The cursor light is the heaviest layer, so it goes first to keep frames smooth.
    if (glowWrap) { out.to(glowWrap, { autoAlpha: 0, duration: 0.08 }, 0); }
    // The hero's own background (the dots, faded in the scroll callback above, and the soft glow behind the name) clears
    // just before About's text arrives, so the section shows on a clean page inside the O.
    out.fromTo(nameEl, { '--name-glow': 1 }, { '--name-glow': 0, duration: 0.2 }, SHOW - 0.2);
    // The role, lede and buttons stay solid and ride the zoom with the name; the whole plane lets go only in the last stretch,
    // just as the top of About's text meets the bottom edge of the screen.
    out.fromTo(inner, { scale: 1 }, { scale: () => zoom.s, duration: 1, ease: zoomEase, force3D: false }, 0)
      .to(inner, { autoAlpha: 0, duration: 0.05 }, 0.95);
    // Speed limit: through the hero (and a short run-up to it) the scroll target may only lead the page by this much, which
    // caps the pace at roughly 600px a second, so the zoom takes about two seconds however hard the wheel is spun. Wheel
    // events are trimmed in pfCapWheel and whatever lead is left over in the scroll listener (see pfCinematic).
    if (this.pfLenis) { this.pfAddCap({ start: () => 0, end: scrollLen, cap: () => this.pfCapPx() }); }
    return playIntro;
  }

  /* Loading screen, from the earlier portfolio: the name rises, three layer cards fan in, a counter runs
     to 100, then the panel wipes up into the hero. It plays once, full-window only. */
  pfLoader(gsap, ST, play) {
    const ld = this.pfOne('[data-loader]');
    const late = !!this.pfGsapLate;
    if (!ld || this.pfLoaderDone || this.opts.loader === false || late) { this.pfLoaderDone = true; play(); return; }
    this.pfLoaderDone = true;
    const root = this.pfRoot;
    const all = (s) => Array.prototype.slice.call(ld.querySelectorAll(s));
    const fades = all('[data-ld-fade]');
    const covers = all('[data-ld-cover]');
    const tag = ld.querySelector('[data-ld-tag]');
    const line = ld.querySelector('[data-ld-line]');
    const count = ld.querySelector('[data-ld-count]');
    const bar = ld.querySelector('[data-ld-bar]');
    const behind = Array.prototype.slice.call(root.children).filter((el) => el !== ld);
    root.classList.add('is-loading');
    behind.forEach((el) => el.setAttribute('inert', ''));
    try { this.pfWin.scrollTo(0, 0); } catch (e) {}
    if (this.pfLenis) { this.pfLenis.stop(); }
    const spread = this.pfMatch('(max-width: 760px)') ? 0.34 : 0.62;
    const fan = [{ x: -spread, y: 0.04, r: -7 }, { x: 0, y: -0.06, r: 0 }, { x: spread, y: 0.05, r: 7 }];
    const cnt = { v: 0 };
    let done = false;
    const finish = (quiet) => {
      if (done) { return; }
      done = true;
      root.classList.remove('is-loading');
      behind.forEach((el) => el.removeAttribute('inert'));
      if (this.pfLenis) { this.pfLenis.start(); }
      this.pfLoaderFinish = null;
      if (!quiet) { try { ST.refresh(); } catch (e) {} }
    };
    this.pfLoaderFinish = finish;
    gsap.set(tag, { autoAlpha: 0, y: 18 });
    gsap.set(line, { autoAlpha: 0 });
    gsap.set(fades, { autoAlpha: 0, y: 10 });
    gsap.set(covers, { autoAlpha: 0, yPercent: 70, scale: 0.9, rotation: 0 });
    const tl = gsap.timeline({ paused: true, onComplete: () => finish(false) });
    // Text first; then the cards rise up and land on top of it, covering it, while the line underneath fills with the count.
    tl.to(tag, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' }, 0.1)
      .to([line].concat(fades), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.35)
      .to(cnt, { v: 100, duration: 2.9, ease: 'power1.inOut', onUpdate: () => {
        const v = Math.round(cnt.v);
        if (count) { count.textContent = (v < 10 ? '00' : v < 100 ? '0' : '') + v; }
        if (bar) { bar.style.transform = 'scaleX(' + (cnt.v / 100).toFixed(4) + ')'; }
      } }, 0.1);
    covers.forEach((c, i) => {
      const f = fan[i] || fan[1];
      tl.to(c, { autoAlpha: 1, yPercent: f.y * 100, xPercent: f.x * 100, rotation: f.r, scale: 1, duration: 1.1, ease: 'expo.out' }, 1.0 + i * 0.1);
    });
    // The text sinks back a little as the cards land on it, so any edge peeking out reads as underneath.
    tl.to(tag, { opacity: 0.35, scale: 0.97, duration: 0.9, ease: 'power2.out' }, 1.05);
    tl.addLabel('out', 3.1)
      .to(covers, { yPercent: '-=24', autoAlpha: 0, duration: 0.5, ease: 'power3.inOut', stagger: 0.04 }, 'out')
      .to([tag, line].concat(fades), { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, 'out')
      .fromTo(ld, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut', immediateRender: false }, 'out+=0.22')
      .call(play, null, 'out+=0.5');
    const skip = () => { if (tl.time() < tl.labels.out) { tl.seek('out'); } };
    this.pfOn(ld, 'keydown', (e) => { if (e.key === 'Escape') { skip(); } }, false, true);
    // Start once the setup work is behind us, so the first frames aren't skipped, and never
    // leave the overlay up for long if frames stall on a busy device.
    const w = this.pfWin;
    let guard = 0;
    let focusT = 0;
    const raf = w.requestAnimationFrame(() => w.requestAnimationFrame(() => {
      if (done) { return; }
      tl.play();
      // Focus the panel so Escape skips the intro straight away.
      focusT = setTimeout(() => { if (!done) { try { ld.focus({ preventScroll: true }); } catch (e) {} } }, 450);
      guard = setTimeout(() => { if (!done) { tl.progress(1); finish(false); } }, 6500);
    }));
    this.pfMotionOff.push(() => { w.cancelAnimationFrame(raf); clearTimeout(guard); clearTimeout(focusT); });
  }

  pfHeadings(gsap) {
    this.pfQ('[data-split]').forEach((el) => {
      // data-split="focus": the words only sharpen out of a blur, with no scrambling (the Contact title).
      const calm = el.getAttribute('data-split') === 'focus';
      const words = calm ? this.pfFocus(el, 0) : this.pfDecode(el);
      gsap.to(words, {
        q: 1, duration: calm ? 1.1 : 1, ease: calm ? 'power2.out' : 'none', stagger: 0.09, onUpdate: words.render, onComplete: words.render,
        scrollTrigger: { trigger: el, start: 'top 87%', once: true }
      });
    });
  }

  pfAbout(gsap) {
    const statement = this.pfOne('[data-highlight]');
    if (statement) {
      const split = this.pfSplitWords(statement, false);
      gsap.fromTo(split.words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.08,
        scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 42%', scrub: 0.9 }
      });
    }
    const body = this.pfOne('.pf-about__body');
    if (body) {
      gsap.from(body.children, { y: 44, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: 0.14, scrollTrigger: { trigger: body, start: 'top 86%', once: true } });
    }
    const list = this.pfOne('.pf-principles');
    if (list) {
      gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 86%', once: true } })
        .from(this.pfQ('.pf-rule'), { scaleX: 0, duration: 1.6, ease: 'expo.inOut', stagger: 0.12 }, 0)
        .from(this.pfQ('.pf-principle h3, .pf-principle p'), { y: 26, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, 0.35);
    }
  }

  /* Skills: the story of one click through four metal layers (lib/layers.js). On large screens one scrubbed timeline runs
     from the section's top entering to the end of its pin. The closed stack rises beside the title and opens; the camera
     dives to the top layer, where a cursor presses the button and the request leaves as a pulse of light; the pulse falls
     down the stack to each layer in turn while the camera follows, swinging side to side, and each chapter reads
     opposite the stack; the response climbs back up, the camera pulls out to the whole stack, lit and labelled, and it
     closes again as the keyboard flies in. Hovering a layer, or its label, lifts it. On small screens the stack opens
     and the pulse falls as it scrolls past, above the list; with reduced motion it stays open and still. */
  pfSkills(gsap, ST, cinematic) {
    const sec = this.pfOne('.pf-lx');
    // Still loading three.js: pfCreateLayers runs this once it's in.
    if (!sec || this.pfLayersWait) { return; }
    const all = (sel) => Array.prototype.slice.call(sec.querySelectorAll(sel));
    const items = all('[data-lx-item]');
    const title = sec.querySelector('[data-lx-title]');
    const intro = sec.querySelector('[data-lx-intro]');
    // Unpinned, the title and intro reveal like every other heading; pinned, the story's timeline owns them, so nothing
    // else can bring them back over a later chapter.
    const revealHead = () => {
      if (title) {
        const words = this.pfDecode(title);
        gsap.to(words, { q: 1, duration: 1, ease: 'none', stagger: 0.09, onUpdate: words.render, onComplete: words.render, scrollTrigger: { trigger: title, start: 'top 87%', once: true } });
      }
      if (intro) { gsap.from(intro, { y: 28, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: intro, start: 'top 88%', once: true } }); }
    };
    const revealList = () => gsap.from(items, { y: 40, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: items[0] || sec, start: 'top 85%', once: true } });
    const layers = this.pfLayers;
    if (!layers) { if (cinematic) { revealHead(); revealList(); } return; }
    const S = layers.state;
    const pinEl = sec.querySelector('[data-lx-pin]');
    const stage = sec.querySelector('[data-lx-stage]');
    const chapters = all('[data-lx-ch]');
    const outro = sec.querySelector('[data-lx-outro]');
    const cursor = sec.querySelector('[data-lx-cursor]');
    const click = sec.querySelector('[data-lx-click]');
    const rail = sec.querySelector('.pf-lx__rail');
    const steps = all('[data-lx-step]');
    const labels = all('[data-lx-label]');
    const labs = all('[data-lx-lab]');
    const legs = all('[data-lx-leg]');
    const dots = all('[data-lx-dot]');
    layers.setReduced(!cinematic);
    this.pfLayersReset = () => {
      this.pfRoot.classList.remove('is-lx-pin');
      layers.onFrame = null;
      layers.onHover = null;
      layers.onTap = null;
      gsap.killTweensOf(S);
      layers.reset();
      labels.forEach((l) => { l.style.transform = ''; l.classList.remove('is-on', 'is-hover'); });
      steps.forEach((s) => s.classList.remove('is-on', 'is-done'));
      if (cursor) { cursor.style.transform = ''; }
    };
    this.pfLayersHover(gsap, labels, labs);
    // The story needs a landscape screen (it sets the stack and the text side by side), but not a tall one: short laptop
    // windows get it too, with the type scaled to the height.
    const vw = this.pfWin.innerWidth;
    const vh = this.pfViewH();
    const canPin = cinematic && pinEl && stage && outro && cursor && click && rail && chapters.length === 4 && labels.length === 4 && vw >= 720 && vh >= 480 && vw > vh;
    if (!canPin) {
      if (cinematic) {
        // The stack opens and turns as it scrolls past, and the pulse falls through it, lighting each layer.
        const mt = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stage, start: 'top 90%', end: 'bottom 20%', scrub: 1 } });
        mt.fromTo(S, { explode: 0.06, yaw: -1.3, rise: -0.3 }, { explode: 1, yaw: -0.5, rise: 0, duration: 1, ease: 'power2.out' }, 0)
          .to(S, { beam: 1, k0: 1, duration: 0.08 }, 0.7)
          .to(S, { reach: 3, duration: 0.15, ease: 'power2.in' }, 0.7)
          .to(S, { head: 3, duration: 0.9, ease: 'power1.inOut' }, 0.75);
        for (let i = 1; i < 4; i++) { mt.to(S, { ['k' + i]: 1, duration: 0.08 }, 0.75 + i * 0.3); }
        revealHead();
        revealList();
      }
      return;
    }
    this.pfRoot.classList.add('is-lx-pin');

    // The labels, measured, so their leader lines start just past them; and how big the open stack is at zoom 1.
    const M = { x: 0, w: [0, 0, 0, 0], h: [0, 0, 0, 0] };
    const measure = () => {
      M.x = labels[0].parentElement.offsetLeft;
      labs.forEach((el, i) => { M.w[i] = el.offsetWidth; M.h[i] = el.offsetHeight; });
      layers.setFrame({ w: stage.clientWidth * 0.62, h: stage.clientHeight * 0.66 });
    };

    // Each frame: the labels sit level with their layer's near corner, with a leader line drawn out to it, and the cursor
    // sits on the top layer's button. draw holds how far each leader line has drawn.
    const draw = { l0: 0, l1: 0, l2: 0, l3: 0 };
    const attrs = (el, a) => { Object.keys(a).forEach((k) => el.setAttribute(k, a[k].toFixed(1))); };
    const place = (a) => {
      for (let i = 0; i < 4; i++) {
        const ax = a.left[i][0];
        const ay = a.left[i][1];
        const d = draw['l' + i];
        const x1 = M.x + M.w[i] + 18;
        labels[i].style.transform = 'translate3d(0,' + (ay - M.h[i] / 2).toFixed(1) + 'px,0)';
        attrs(legs[i], { x1, y1: ay, x2: x1 + Math.max(0, ax - 8 - x1) * d, y2: ay });
        attrs(dots[i], { cx: ax, cy: ay });
        dots[i].style.opacity = pfClamp((d - 0.75) * 4, 0, 1);
      }
      cursor.style.transform = 'translate3d(' + a.center[0][0].toFixed(1) + 'px,' + a.center[0][1].toFixed(1) + 'px,0)';
    };

    // Story time: STORY units across the pin at PACE screens of scroll each, and the screen of scroll before the pin at the
    // same pace (E units).
    const STORY = 8.1;
    const PACE = 0.7;
    const PIN = STORY * PACE;
    const E = 1 / PACE;
    const T = (u) => E + u;
    let tl = null;
    // The rail marks the chapter you're in; in the outro every label lights.
    const sync = () => {
      const u = tl ? tl.time() - E : 0;
      const on = u >= 1 && u < 5 ? Math.floor(u - 1) : -1;
      if (on !== this.pfLxOn) {
        this.pfLxOn = on;
        steps.forEach((s, i) => { s.classList.toggle('is-on', i === on); s.classList.toggle('is-done', on < 0 ? u >= 5 : i < on); });
      }
      const end = u >= 5;
      if (end !== this.pfLxEnd) {
        this.pfLxEnd = end;
        labels.forEach((l) => l.classList.toggle('is-on', end));
      }
      if (this.pfLxAnchors) { place(this.pfLxAnchors); }
    };
    this.pfLxOn = -2;
    this.pfLxEnd = null;
    this.pfLxAnchors = null;

    // Each chapter's headline sharpens out of a blur word by word, drifting in from the outer edge (the chapters alternate
    // sides, the closing line sits on the right), and the rest of it follows. The section title alone decodes (pfDecode).
    const lines = chapters.concat(outro).map((ch, i) => this.pfFocus(ch.querySelector('[data-lx-line]'), i < 4 && i % 2 === 0 ? -18 : 18));
    const rests = chapters.map((ch) => ch.querySelectorAll('.pf-lx__eyebrow, .pf-lx__ctext, .pf-lx__tools li'));
    const headWords = title ? this.pfDecode(title) : [];
    // The words start blurred and unseen (q = 0 is painted up front) and the rest is hidden up front, so a staggered reveal never shows a word before its turn.
    const wordsIn = (words, at, duration, stagger) => tl.fromTo(words, { q: 0 }, { q: 1, duration, ease: 'none', stagger, immediateRender: false }, at);
    const wordsOut = (words, at, duration, stagger) => tl.fromTo(words, { q: 1 }, { q: 0, duration, ease: 'none', stagger, immediateRender: false }, at);
    gsap.set([].concat.apply([], rests.map((r) => Array.prototype.slice.call(r))), { autoAlpha: 0 });
    gsap.set(labs, { autoAlpha: 0, x: -16 });
    gsap.set([rail, click], { autoAlpha: 0 });
    // The timeline repaints every decoding headline after each render, wherever the scrub landed.
    const decodes = lines.concat([headWords]);
    tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: () => { sync(); decodes.forEach((d) => { if (d.render) { d.render(); } }); } });
    const chIn = (i, at) => {
      tl.set(chapters[i], { autoAlpha: 1 }, at);
      wordsIn(lines[i], at, 0.5, 0.04);
      tl.fromTo(rests[i], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.025, immediateRender: false }, at + 0.12);
    };
    const chOut = (i, at) => {
      wordsOut(lines[i], at, 0.26, 0.015);
      tl.to(rests[i], { autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in' }, at);
      tl.set(chapters[i], { autoAlpha: 0 }, at + 0.3);
    };

    // Arrival: the closed stack comes up beside the title, turning, as the section scrolls in; the title rises into view
    // with it, then the intro.
    tl.fromTo(S,
      { rise: -1.7, yaw: -1.7, explode: 0, zoom: 0.92, look: 1.5, tilt: 0, fx: 0.68, fy: 0.54 },
      { rise: 0, yaw: -1.08, explode: 0.06, zoom: 0.92, look: 1.5, tilt: 0, fx: 0.68, fy: 0.54, duration: E, ease: 'power1.out' }, 0);
    if (headWords.length) { wordsIn(headWords, E * 0.4, 0.6, 0.07); }
    if (intro) { tl.fromTo(intro, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, E * 0.55); }
    // It opens, and the title steps aside.
    tl.to(S, { explode: 1, yaw: -0.74, duration: 0.95, ease: 'power2.inOut' }, T(0));
    if (headWords.length) { wordsOut(headWords, T(0.7), 0.3, 0.02); }
    if (intro) { tl.fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -16, duration: 0.28, ease: 'power2.in', immediateRender: false }, T(0.72)); }
    tl.to(rail, { autoAlpha: 1, duration: 0.3 }, T(0.9));

    // 01 Frontend: the camera dives to the top layer and it lights. A cursor comes in over the button and presses it: a
    // beam of light shoots down through all four layers, and the request's bright head sets off along it.
    tl.to(S, { zoom: 1.42, look: 0, tilt: 0.24, fx: 0.66, fy: 0.5, yaw: -0.56, duration: 0.7, ease: 'power2.inOut' }, T(1));
    tl.to(S, { f0: 1, duration: 0.4, ease: 'power2.out' }, T(1.2));
    chIn(0, T(1.25));
    tl.fromTo(click, { autoAlpha: 0, x: 70, y: 46 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.25, ease: 'power3.out', immediateRender: false }, T(1.5));
    tl.to(click, { scale: 0.72, duration: 0.06, ease: 'power2.in' }, T(1.78));
    tl.to(click, { scale: 1, duration: 0.14, ease: 'power2.out' }, T(1.84));
    tl.to(S, { k0: 1, beam: 1, duration: 0.12, ease: 'power2.out' }, T(1.8));
    tl.to(S, { k0: 0.4, duration: 0.35, ease: 'power2.out' }, T(1.95));
    tl.to(S, { r0: 1, duration: 0.5, ease: 'power2.out' }, T(1.8));
    tl.to(S, { reach: 3, duration: 0.3, ease: 'power2.in' }, T(1.82));
    tl.to(click, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, T(1.98));

    // 02 Backend, 03 Databases, 04 DevOps: the head falls down the beam to the next layer and the camera follows it down,
    // swinging to the other side. It swoops low and pulls back while the pulse is in the gap, so you watch the light fall between the
    // layers, then pushes back in over the layer it reaches, which lights up; a ring runs out from the hit, and its
    // chapter reads opposite.
    for (let i = 1; i < 4; i++) {
      const at = T(1 + i);
      const left = i % 2 === 1;
      chOut(i - 1, at);
      tl.to(S, { head: i, duration: 0.45, ease: 'power1.inOut' }, at);
      // The layer the light has just left lifts away above, so nothing hangs over the one it reaches.
      tl.to(S, { split: i, duration: 0.55, ease: 'power2.inOut' }, at);
      tl.to(S, { look: i, fx: left ? 0.34 : 0.66, yaw: left ? -0.86 : -0.56, duration: 0.7, ease: 'power2.inOut' }, at);
      tl.to(S, { tilt: -0.3, zoom: 1.2, duration: 0.35, ease: 'power2.inOut' }, at);
      tl.to(S, { tilt: 0.24, zoom: 1.42, duration: 0.45, ease: 'power2.inOut' }, at + 0.4);
      tl.to(S, { ['f' + (i - 1)]: 0.15, duration: 0.4, ease: 'power2.inOut' }, at);
      tl.to(S, { ['f' + i]: 1, duration: 0.4, ease: 'power2.out' }, at + 0.35);
      tl.to(S, { ['k' + i]: 1, duration: 0.12, ease: 'power2.out' }, at + 0.45);
      tl.to(S, { ['k' + i]: 0.4, duration: 0.35, ease: 'power2.out' }, at + 0.6);
      tl.to(S, { ['r' + i]: 1, duration: 0.5, ease: 'power2.out' }, at + 0.45);
      chIn(i, at + 0.45);
    }

    // The response: the camera pulls out to the whole stack, then the light climbs back up through it, flashing each
    // layer's edge as it passes. Labels draw out to every layer and the closing line reads beside it.
    const R = T(5);
    chOut(3, R);
    tl.to(S, { zoom: 0.86, look: 1.5, tilt: 0.06, fx: 0.47, fy: 0.52, yaw: -0.5, split: 0, duration: 0.75, ease: 'power2.out' }, R);
    tl.to(S, { head: 0, duration: 0.6, ease: 'power2.inOut' }, R + 0.25);
    [3, 2, 1, 0].forEach((i, n) => {
      tl.to(S, { ['w' + i]: 1, duration: 0.1, ease: 'power2.out' }, R + 0.25 + n * 0.17);
      tl.to(S, { ['w' + i]: 0, duration: 0.45, ease: 'power2.inOut' }, R + 0.35 + n * 0.17);
    });
    tl.to(S, { f0: 0.35, f1: 0.35, f2: 0.35, f3: 0.35, duration: 0.6, ease: 'power2.inOut' }, R + 0.3);
    tl.to(labs, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out', stagger: 0.08 }, R + 0.85);
    for (let i = 0; i < 4; i++) { tl.to(draw, { ['l' + i]: 1, duration: 0.4, ease: 'power2.out' }, R + 0.95 + i * 0.08); }
    tl.set(outro, { autoAlpha: 1 }, R + 1);
    wordsIn(lines[4], R + 1, 0.5, 0.03);

    // Close: the labels, the line and the beam go, and the stack shuts before the keyboard flies in.
    const C = T(7.2);
    tl.to(S, { beam: 0, duration: 0.35, ease: 'power1.in' }, C);
    wordsOut(lines[4], C, 0.28, 0.012);
    tl.set(outro, { autoAlpha: 0 }, C + 0.32);
    tl.to(labs, { autoAlpha: 0, x: -12, duration: 0.3, ease: 'power2.in', stagger: { each: 0.05, from: 'end' } }, C);
    for (let i = 0; i < 4; i++) { tl.to(draw, { ['l' + i]: 0, duration: 0.3, ease: 'power2.in' }, C + (3 - i) * 0.05); }
    tl.to(rail, { autoAlpha: 0, duration: 0.25 }, C);
    tl.to(S, { explode: 0.14, yaw: -0.32, f0: 0, f1: 0, f2: 0, f3: 0, k0: 0, k1: 0, k2: 0, k3: 0, duration: 0.7, ease: 'power2.inOut' }, C + 0.1);
    tl.to({}, { duration: 0.1 }, C + 0.8);

    const pinLen = () => Math.round(this.pfViewH() * PIN);
    const story = ST.create({ trigger: pinEl, start: 'top bottom', end: () => '+=' + (this.pfViewH() + pinLen()), scrub: 1, animation: tl, invalidateOnRefresh: true });
    // The story gets a speed limit across its whole run (the screen before the pin, and the pin), so the chapters can't
    // be flicked past, though a fast scroll is let through faster than a gentle one.
    if (this.pfLenis) { this.pfAddCap({ start: () => story.start, end: () => story.end, cap: () => this.pfFastCapPx() }); }
    ST.create({ trigger: pinEl, start: 'top top', end: () => '+=' + pinLen(), pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1, onRefresh: measure });
    layers.onFrame = (a) => { this.pfLxAnchors = a; place(a); };
    measure();
  }

  /* Hover lifts a layer, whether you point at it in 3D or at its label; GSAP eases each layer's hover in and out. */
  pfLayersHover(gsap, labels, labs) {
    const layers = this.pfLayers;
    if (!layers) { return; }
    const S = layers.state;
    const fine = this.pfMatch('(hover: hover) and (pointer: fine)');
    let pick = -1;
    let label = -1;
    let now = -1;
    const to = (i) => {
      if (i === now) { return; }
      now = i;
      for (let k = 0; k < 4; k++) {
        const on = k === i;
        gsap.to(S, { ['h' + k]: on ? 1 : 0, duration: on ? 0.45 : 0.6, ease: on ? 'expo.out' : 'power3.out', overwrite: 'auto' });
      }
      labels.forEach((l, k) => l.classList.toggle('is-hover', k === i));
    };
    const resolve = () => to(label >= 0 ? label : pick);
    if (!fine) {
      // Touch: a tap lifts a layer (or its label) and keeps it up; tapping it again, or off the stack, lets it down.
      const tapTo = (i) => { pick = i === now ? -1 : i; resolve(); };
      layers.onTap = tapTo;
      labs.forEach((el, i) => this.pfOn(el, 'click', () => tapTo(i), false, true));
      return;
    }
    layers.onHover = (i) => { pick = i; resolve(); };
    labs.forEach((el, i) => {
      this.pfOn(el, 'pointerenter', (e) => { if (e.pointerType === 'mouse') { label = i; resolve(); } }, false, true);
      this.pfOn(el, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { label = -1; resolve(); } }, false, true);
    });
  }

  pfProjects(gsap) {
    const cards = this.pfQ('.pf-card');
    cards.forEach((card) => {
      const media = card.querySelector('.pf-card__media');
      const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
      if (media) {
        tl.fromTo(media, { clipPath: 'inset(100% 0% 0% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.6, ease: 'expo.out', clearProps: 'clipPath' }, 0);
        const floats = media.querySelectorAll('[data-z]');
        if (floats.length) { tl.from(floats, { y: 26, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0.55); }
      }
      tl.from(card.querySelectorAll('.pf-card__body > *'), { y: 30, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, 0.3);
    });
    const grid = this.pfOne('.pf-grid');
    if (grid && this.pfWin.innerWidth >= 900) {
      const even = cards.filter((c, i) => i % 2 === 1);
      gsap.fromTo(even, { y: 50 }, { y: -50, ease: 'none', scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: 1.2 } });
    }
  }

  /* The FAQ arrives once: the lede and link rise, the rules draw across and the questions follow them in. */
  pfFaq(gsap) {
    const list = this.pfOne('[data-faq]');
    if (!list) { return; }
    const intro = this.pfQ('.pf-faq__lede, .pf-faq__ask');
    if (intro.length) { gsap.from(intro, { y: 24, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: intro[0], start: 'top 87%', once: true } }); }
    gsap.timeline({ defaults: { ease: 'expo.out' }, scrollTrigger: { trigger: list, start: 'top 82%', once: true } })
      .from(list.querySelectorAll('.pf-faq__rule'), { scaleX: 0, duration: 1.4, stagger: 0.08 }, 0)
      .from(list.querySelectorAll('.pf-faq__q'), { y: 28, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.15);
  }

  pfContact(gsap) {
    const section = this.pfOne('.pf-contact');
    const panel = this.pfOne('.pf-contact__panel');
    if (!section || !panel) { return; }
    gsap.fromTo(panel,
      { clipPath: 'inset(7% 3.5% 0% 3.5% round 72px 72px 0px 0px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 32px 32px 0px 0px)', ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 30%', scrub: 0.8 } });
    gsap.from(this.pfQ('.pf-contact__lede, .pf-email, .pf-socials, .pf-form'), { y: 36, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: panel, start: 'top 70%', once: true } });
  }

  pfMagnets(gsap) {
    this.pfQ('[data-magnetic]').forEach((el) => {
      const toX = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' });
      const toY = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' });
      const move = (e) => {
        const r = el.getBoundingClientRect();
        toX((e.clientX - (r.left + r.width / 2)) * 0.28);
        toY((e.clientY - (r.top + r.height / 2)) * 0.28);
      };
      const reset = () => { toX(0); toY(0); };
      this.pfOn(el, 'pointermove', move, false, true);
      this.pfOn(el, 'pointerleave', reset, false, true);
      this.pfOn(this.pfWin, 'blur', reset, false, true);
    });
  }

  pfAccentHex() {
    const v = this.opts.accent;
    return typeof v === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim() : '#2B45FF';
  }

  /* Film grain, generated once and shared by the page overlay and the footer wordmark. */
  pfGrain() {
    const els = this.pfQ('[data-grain], [data-hwf-grain]');
    if (!els.length) { return; }
    try {
      const gc = this.pfDoc.createElement('canvas');
      gc.width = 128; gc.height = 128;
      const g = gc.getContext('2d');
      const id = g.createImageData(128, 128);
      for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
      const url = 'url(' + gc.toDataURL('image/png') + ')';
      els.forEach((el) => { el.style.backgroundImage = url; });
    } catch (e) {}
  }

  pfCreateField() {
    const canvas = this.pfOne('[data-gl]');
    if (!canvas) { return; }
    const field = pfField(canvas, { coarse: !this.pfMatch('(hover: hover) and (pointer: fine)'), reduced: true, light: this.pfEffectiveTheme() === 'light' });
    if (!field) { canvas.style.display = 'none'; return; }
    field.setAccent(this.pfAccentHex());
    field.start();
    this.pfField = field;
  }

  pfCreateHalftone() {
    const box = this.pfOne('[data-hwf]');
    const canvas = this.pfOne('[data-hwf-canvas]');
    if (!box || !canvas) { return; }
    this.pfHt = pfHalftone(box, canvas, {
      word: 'ayoub', accent: this.pfAccentHex(), ink: this.pfEffectiveTheme() === 'dark' ? '#EEF2F8' : '#0D1230',
      reduced: this.pfMatch('(prefers-reduced-motion: reduce)'),
      onResize: () => { const ST = ScrollTrigger; if (ST && this.pfReady && this.pfMode !== 'static') { ST.refresh(); } }
    });
  }

  /* The skills section's metal layers (lib/layers.js). three.js only matters this far down the page, so it loads on its
     own after the first paint; the section's motion waits for it, then joins the page's. Without WebGL2 the section
     shows its plain list instead. */
  pfCreateLayers() {
    const stage = this.pfOne('[data-lx-stage]');
    const canvas = this.pfOne('[data-lx-canvas]');
    if (!stage || !canvas) { return; }
    const sec = stage.closest('section');
    this.pfLayersWait = true;
    import('./layers.js')
      .then((mod) => mod.createLayers(stage, canvas, { light: this.pfEffectiveTheme() === 'light', accent: this.pfAccentHex(), reduced: this.pfMatch('(prefers-reduced-motion: reduce)') }))
      .catch(() => null)
      .then((layers) => {
        if (this.pfDead) { if (layers) { layers.destroy(); } return; }
        this.pfLayersWait = false;
        if (layers) { this.pfLayers = layers; } else if (sec) { sec.setAttribute('data-gl', 'off'); }
        if (this.pfCtx && this.pfMode !== 'static') {
          this.pfCtx.add(() => this.pfSkills(gsap, ScrollTrigger, this.pfMode === 'cinematic'));
          ScrollTrigger.refresh();
        }
      });
  }

  pfStartClock() {
    const el = this.pfOne('[data-clock]');
    if (!el) { return; }
    let fmt = null;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: PF_TZ }); } catch (e) { fmt = null; }
    const tick = () => { el.textContent = fmt ? fmt.format(new Date()) : '--:--:--'; };
    tick();
    this.pfClockId = setInterval(tick, 1000);
  }

  /* A circle of light follows the cursor over the hero, lighting the letter edges underneath. The name itself stays put. */
  pfNameLight(gsap) {
    const hero = this.pfOne('.pf-hero');
    const glows = this.pfQ('[data-hn-glow]');
    if (!hero) { return; }
    const w = this.pfWin;
    const st = { px: 0, py: 0, on: false, gx: 0, gy: 0, r: 0, tr: 0, ticking: false };
    const radius = () => Math.max(150, Math.min(320, (w.innerWidth || 1280) * 0.17));
    const stop = () => { if (st.ticking) { st.ticking = false; gsap.ticker.remove(tick); } };
    const start = () => { if (!st.ticking) { st.ticking = true; gsap.ticker.add(tick); } };
    const tick = () => {
      const dr = gsap.ticker.deltaRatio(60);
      let moving = false;
      const kp = 1 - Math.pow(0.78, dr);
      const kr = 1 - Math.pow(0.86, dr);
      const ex = st.px - st.gx;
      const ey = st.py - st.gy;
      const er = st.tr - st.r;
      if (Math.abs(ex) > 0.3 || Math.abs(ey) > 0.3 || Math.abs(er) > 0.3) { st.gx += ex * kp; st.gy += ey * kp; st.r += er * kr; moving = true; }
      else { st.gx = st.px; st.gy = st.py; st.r = st.tr; }
      const wrap = this.pfOne('.pf-name__glow');
      if (wrap) { wrap.classList.toggle('is-lit', !this.pfNameScrolled && (st.on || st.r > 1)); }
      if (!this.pfNameScrolled) {
        glows.forEach((g) => {
          const gb = g.getBoundingClientRect();
          g.style.setProperty('--mx', (st.gx - gb.left).toFixed(1) + 'px');
          g.style.setProperty('--my', (st.gy - gb.top).toFixed(1) + 'px');
          g.style.setProperty('--r', st.r.toFixed(1) + 'px');
        });
      }
      if (!moving) { stop(); }
    };
    const rest = () => { st.on = false; st.tr = 0; start(); };
    const aim = (e) => {
      st.px = e.clientX; st.py = e.clientY; st.on = true;
      if (st.r < 1) { st.gx = st.px; st.gy = st.py; }
      st.tr = radius();
      start();
    };
    this.pfOn(hero, 'pointermove', (e) => { if (e.pointerType === 'mouse') { aim(e); } }, false, true);
    this.pfOn(hero, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { rest(); } }, false, true);
    this.pfOn(w, 'blur', rest, false, true);
    const kick = () => { if (st.on || st.r > 0.5) { start(); } };
    if (this.pfLenis) { this.pfLenis.on('scroll', kick); } else { this.pfOn(w, 'scroll', kick, { passive: true }, true); }
    this.pfNameReset = () => {
      stop();
      glows.forEach((g) => { g.style.removeProperty('--mx'); g.style.removeProperty('--my'); g.style.removeProperty('--r'); });
    };
  }

  /* Project cards tip toward the cursor in 3D; the detail shots float forward and a glare follows. */
  pfTilt(gsap) {
    this.pfQ('[data-tilt]').forEach((vis) => {
      const stage = vis.querySelector('[data-tilt-stage]');
      const glare = vis.querySelector('[data-glare]');
      const floats = Array.prototype.slice.call(vis.querySelectorAll('[data-z]'));
      if (!stage) { return; }
      const rx = gsap.quickTo(stage, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const ry = gsap.quickTo(stage, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      floats.forEach((f) => gsap.set(f, { z: parseFloat(f.getAttribute('data-z')) || 0 }));
      const lift = (on) => floats.forEach((f) => {
        const z = parseFloat(f.getAttribute('data-z')) || 0;
        gsap.to(f, { z: on ? z * 1.55 : z, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
      });
      const aim = (e) => {
        const r = vis.getBoundingClientRect();
        const px = pfClamp((e.clientX - r.left) / r.width, 0, 1);
        const py = pfClamp((e.clientY - r.top) / r.height, 0, 1);
        ry((px - 0.5) * 12);
        rx((0.5 - py) * 9);
        if (glare) { glare.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); glare.style.setProperty('--gy', (py * 100).toFixed(1) + '%'); }
      };
      this.pfOn(vis, 'pointerenter', (e) => { if (e.pointerType === 'mouse') { lift(true); } }, false, true);
      this.pfOn(vis, 'pointermove', (e) => { if (e.pointerType === 'mouse') { aim(e); } }, false, true);
      this.pfOn(vis, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { rx(0); ry(0); lift(false); } }, false, true);
    });
  }

  /* A ring that trails the mouse, a small dot that sticks to it, and a soft accent spotlight. */
  pfCursor(gsap) {
    const ring = this.pfOne('[data-cursor="ring"]');
    const dot = this.pfOne('[data-cursor="dot"]');
    const spot = this.pfOne('[data-spot]');
    if (!ring || !dot) { return; }
    const cursor = { classList: { add: (...c) => { ring.classList.add(...c); dot.classList.add(...c); }, remove: (...c) => { ring.classList.remove(...c); dot.classList.remove(...c); }, toggle: (c, on) => { ring.classList.toggle(c, on); dot.classList.toggle(c, on); } } };
    const w = this.pfWin;
    const cx = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
    const cy = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.06, ease: 'power2.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.06, ease: 'power2.out' });
    const sx = spot ? gsap.quickTo(spot, 'x', { duration: 1.2, ease: 'power3.out' }) : null;
    const sy = spot ? gsap.quickTo(spot, 'y', { duration: 1.2, ease: 'power3.out' }) : null;
    let shown = false;
    this.pfOn(w, 'pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') { return; }
      if (!shown) {
        shown = true;
        gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
        cursor.classList.add('is-on');
        this.pfDoc.documentElement.classList.add('pf-has-cursor');
        if (spot) { gsap.set(spot, { x: e.clientX, y: e.clientY }); spot.classList.add('is-on'); }
      }
      cx(e.clientX); cy(e.clientY); dx(e.clientX); dy(e.clientY);
      if (sx) { sx(e.clientX); sy(e.clientY); }
    }, { passive: true }, true);
    this.pfOn(this.pfDoc, 'mouseout', (e) => {
      if (e.relatedTarget) { return; }
      shown = false;
      cursor.classList.remove('is-on');
      if (spot) { spot.classList.remove('is-on'); }
    }, false, true);
    this.pfOn(this.pfRoot, 'pointerover', (e) => {
      const t = e.target;
      if (!t || !t.closest) { return; }
      cursor.classList.toggle('is-hover', !!t.closest('a, button, label, input, textarea, select'));
      cursor.classList.toggle('is-ink', !!t.closest('[data-faq-row]'));
    }, false, true);
    this.pfOn(w, 'pointerdown', () => cursor.classList.add('is-down'), false, true);
    this.pfOn(w, 'pointerup', () => cursor.classList.remove('is-down'), false, true);
  }

  /* The halftone wordmark assembles left to right as it scrolls in, then rises into place. */
  pfFooterReveal(gsap) {
    const ht = this.pfHt;
    const stage = this.pfOne('[data-hwf-stage]');
    const canvas = this.pfOne('[data-hwf-canvas]');
    if (!ht || !stage || !canvas) { return; }
    const hv = { v: 0 };
    ht.setReveal(0);
    gsap.to(hv, { v: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => ht.setReveal(hv.v), scrollTrigger: { trigger: stage, start: 'top 92%', once: true } });
    gsap.fromTo(canvas, { yPercent: 16 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  }

  /* Nav state, the active section and the progress line. Created last so 'max' includes the pinned scroll. */
  pfChrome(gsap, ST, allowHide) {
    const nav = this.pfOne('.pf-nav');
    const bar = this.pfOne('.pf-progress span');
    if (bar) { gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.4 } }); }
    if (nav) {
      ST.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          const y = self.scroll();
          nav.classList.toggle('is-scrolled', y > 24);
          // Pushed up the moment you start scrolling down; it comes back as soon as you scroll up or reach the top.
          const hide = allowHide && self.direction === 1 && y > 4 && !this.pfMenuOpen && !nav.matches(':focus-within');
          nav.classList.toggle('is-hidden', hide);
        }
      });
    }
    const links = this.pfQ('.pf-nav__list a[href^="#"]');
    links.forEach((a) => {
      const section = this.pfDoc.getElementById(a.getAttribute('href').slice(1));
      if (!section) { return; }
      ST.create({
        trigger: section, start: 'top 45%', end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) {
            links.forEach((l) => l.removeAttribute('aria-current'));
            a.setAttribute('aria-current', 'true');
          } else if (a.getAttribute('aria-current')) {
            a.removeAttribute('aria-current');
          }
        }
      });
    });
  }
}
