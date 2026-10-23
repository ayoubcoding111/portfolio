/* The footer's halftone wordmark, ported unchanged from the design canvas. */
import { pfClamp, pfRgb } from "./util.js";

export function pfHalftone(box, canvas, cfg) {
  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx) { return null; }
  var WORD = cfg.word || 'ayoub';
  var FAMILY = '"Archivo", "Arial Black", sans-serif';
  var RADIUS = 90, K = 0.14, DAMP = 0.8, RING_MS = 900, NB = 6;
  var reduced = !!cfg.reduced;
  var INK = [238, 242, 248], ACC = [43, 69, 255], styles = [];
  var W = 0, H = 0, dpr = 1, gap = 6, dots = [], bx = [], bc = [];
  var ptr = { x: -9999, y: -9999, on: false }, ring = null;
  var reveal = 1, running = false, visible = true, raf = 0, dead = false;
  var ro = null, io = null, rt = 0, lastW = -1, withFont = false, fontPoll = 0;

  function setFont(c, px) {
    c.font = '800 ' + px + 'px ' + FAMILY;
    if ('fontStretch' in c) { c.fontStretch = 'expanded'; }
  }

  /* True once Archivo really renders (its width differs from the monospace fallback). */
  function fontReady() {
    try {
      var c = document.createElement('canvas').getContext('2d');
      c.font = '800 40px monospace';
      var a = c.measureText(WORD).width;
      c.font = '800 40px "Archivo", monospace';
      return Math.abs(c.measureText(WORD).width - a) > 0.5;
    } catch (e) { return true; }
  }

  function to255(hex) { var c = pfRgb(hex); return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)]; }
  function tint(w) {
    return 'rgb(' + Math.round(INK[0] + (ACC[0] - INK[0]) * w) + ',' + Math.round(INK[1] + (ACC[1] - INK[1]) * w) + ',' + Math.round(INK[2] + (ACC[2] - INK[2]) * w) + ')';
  }
  function palette() { styles = []; for (var b = 0; b < NB; b++) { styles.push(tint(b / (NB - 1))); } }
  ACC = to255(cfg.accent);
  INK = to255(cfg.ink || '#EEF2F8');
  palette();

  /* Rasterise the word once, then sample its coverage on a dot grid. */
  function build() {
    if (dead) { return; }
    W = Math.max(1, Math.round(box.clientWidth));
    lastW = W;
    withFont = fontReady();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    gap = W < 600 ? 4 : 6;
    var m = document.createElement('canvas');
    m.width = W; m.height = 8;
    var mc = m.getContext('2d', { willReadFrequently: true });
    if (!mc) { return; }
    setFont(mc, 100);
    var w100 = mc.measureText(WORD).width || 1;
    var size = ((W * 1.02) / w100 * 100).toFixed(2);
    setFont(mc, size);
    var tm = mc.measureText(WORD);
    var asc = tm.actualBoundingBoxAscent || size * 0.74;
    var desc = tm.actualBoundingBoxDescent || size * 0.2;
    var gh = asc + desc;
    H = Math.max(8, Math.ceil(gh * 1.04 + 4));
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    m.height = H;
    setFont(mc, size);
    mc.textAlign = 'center'; mc.textBaseline = 'alphabetic'; mc.fillStyle = '#fff';
    mc.fillText(WORD, W / 2, H - desc - gh * 0.02);
    var data = mc.getImageData(0, 0, W, H).data;
    dots = [];
    var cols = Math.ceil(W / gap), rows = Math.ceil(H / gap);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var sum = 0;
        for (var sy = 0; sy < 3; sy++) {
          for (var sx = 0; sx < 3; sx++) {
            var px = Math.min(W - 1, Math.floor(i * gap + (sx + 0.5) * gap / 3));
            var py = Math.min(H - 1, Math.floor(j * gap + (sy + 0.5) * gap / 3));
            sum += data[(py * W + px) * 4 + 3];
          }
        }
        var cov = sum / (9 * 255);
        if (cov > 0.04) {
          var cx = i * gap + gap / 2;
          dots.push({ x: cx, y: j * gap + gap / 2, r: Math.sqrt(cov) * gap * 0.56, ox: 0, oy: 0, vx: 0, vy: 0, w: 0, t: (cx / W) * 0.62 + Math.random() * 0.13 });
        }
      }
    }
    bx = []; bc = [];
    for (var b = 0; b < NB; b++) { bx.push(new Float32Array(dots.length * 3)); bc.push(0); }
    draw(performance.now());
    if (cfg.onResize) { cfg.onResize(); }
  }

  /* Spring each dot away from the pointer; the further it travels, the warmer it gets. */
  function step() {
    var moving = false, pr = ptr.on ? RADIUS : 0;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i], tx = 0, ty = 0;
      if (pr) {
        var dx = d.x - ptr.x, dy = d.y - ptr.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pr) {
          var f = 1 - dist / pr, push = f * f * pr * 0.55;
          if (dist < 0.001) { dx = 1; dy = 0; dist = 1; }
          tx = dx / dist * push; ty = dy / dist * push;
        }
      }
      d.vx = (d.vx + K * (tx - d.ox)) * DAMP;
      d.vy = (d.vy + K * (ty - d.oy)) * DAMP;
      d.ox += d.vx; d.oy += d.vy;
      var mag = Math.sqrt(d.ox * d.ox + d.oy * d.oy);
      d.w = Math.min(1, mag / 28);
      if (mag > 0.05 || Math.abs(d.vx) > 0.02 || Math.abs(d.vy) > 0.02) { moving = true; }
      else { d.ox = 0; d.oy = 0; d.vx = 0; d.vy = 0; d.w = 0; }
    }
    return moving || ptr.on || !!ring;
  }

  function draw(now) {
    if (!W || !H) { return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var b, i, d;
    for (b = 0; b < NB; b++) { bc[b] = 0; }
    var revealing = reveal < 1;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      var e = 1, rise = 0, w = d.w;
      if (revealing) {
        var a = (reveal - d.t) / 0.25;
        if (a <= 0) { continue; }
        if (a < 1) { var inv = 1 - a; e = 1 - inv * inv * inv; rise = (1 - e) * 10; w = Math.max(w, (1 - e) * 0.95); }
      }
      var r = d.r * e;
      if (r < 0.2) { continue; }
      b = w < 0.02 ? 0 : Math.min(NB - 1, 1 + Math.floor(w * (NB - 1)));
      var arr = bx[b], k = bc[b] * 3;
      arr[k] = d.x + d.ox; arr[k + 1] = d.y + d.oy + rise; arr[k + 2] = r;
      bc[b]++;
    }
    for (b = 0; b < NB; b++) {
      var n = bc[b];
      if (!n) { continue; }
      var list = bx[b];
      ctx.fillStyle = styles[b];
      ctx.beginPath();
      for (i = 0; i < n; i++) {
        var x = list[i * 3], y = list[i * 3 + 1], rr = list[i * 3 + 2];
        ctx.moveTo(x + rr, y);
        ctx.arc(x, y, rr, 0, 6.2832);
      }
      ctx.fill();
    }
    if (ring) {
      var p = (now - ring.t) / RING_MS;
      if (p >= 1) { ring = null; }
      else {
        var e2 = 1 - Math.pow(1 - p, 3);
        ctx.strokeStyle = 'rgba(' + ACC.join(',') + ',' + (0.6 * (1 - p)).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, 12 + e2 * 260, 0, 6.2832);
        ctx.stroke();
      }
    }
  }

  function frame(now) {
    raf = 0;
    if (dead) { return; }
    var keep = step();
    draw(now);
    if (keep && visible) { raf = requestAnimationFrame(frame); } else { running = false; }
  }
  function wake() {
    if (dead || reduced || running || !visible) { return; }
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function local(e) { var r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }
  function onMove(e) { ptr.on = true; local(e); wake(); }
  function onLeave() { ptr.on = false; wake(); }
  function onDown(e) {
    if (e.target && e.target.closest && e.target.closest('a, button')) { return; }
    ptr.on = true; local(e);
    ring = { x: ptr.x, y: ptr.y, t: performance.now() };
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i], dx = d.x - ptr.x, dy = d.y - ptr.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 240 && dist > 0.001) { var f = 1 - dist / 240; d.vx += dx / dist * f * 12; d.vy += dy / dist * f * 12; }
    }
    wake();
  }
  function onUp(e) { if (e.pointerType !== 'mouse') { ptr.on = false; wake(); } }
  function relayout() { rt = 0; if (!dead) { build(); } }
  function onResize() { clearTimeout(rt); rt = setTimeout(relayout, 120); }

  if (!reduced) {
    box.addEventListener('pointermove', onMove, { passive: true });
    box.addEventListener('pointerleave', onLeave, { passive: true });
    box.addEventListener('pointerdown', onDown, { passive: true });
    box.addEventListener('pointerup', onUp, { passive: true });
  }
  if (window.IntersectionObserver) {
    io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { wake(); } }, { rootMargin: '120px' });
    io.observe(box);
  }
  if (window.ResizeObserver) {
    ro = new ResizeObserver(function () { if (Math.round(box.clientWidth) === lastW) { return; } clearTimeout(rt); rt = setTimeout(relayout, 80); });
    ro.observe(box);
  } else { window.addEventListener('resize', onResize); }

  build();
  /* The wordmark is measured from the real glyphs: rebuild once Archivo has arrived. */
  function fontCheck() { if (!dead && !withFont && fontReady()) { build(); } }
  if (document.fonts) {
    try { if (document.fonts.load) { document.fonts.load('800 100px "Archivo"').then(fontCheck, function () {}); } } catch (e) {}
    if (document.fonts.ready) { document.fonts.ready.then(fontCheck); }
    if (document.fonts.addEventListener) { document.fonts.addEventListener('loadingdone', fontCheck); }
  }
  var polls = 0;
  if (!withFont) { fontPoll = setInterval(function () { polls++; fontCheck(); if (withFont || dead || polls > 40) { clearInterval(fontPoll); fontPoll = 0; } }, 250); }

  return {
    setReveal: function (v) { reveal = pfClamp(v, 0, 1); if (!running) { draw(performance.now()); } },
    setAccent: function (hex) { ACC = to255(hex); palette(); if (!running) { draw(performance.now()); } },
    setInk: function (hex) { INK = to255(hex); palette(); if (!running) { draw(performance.now()); } },
    destroy: function () {
      dead = true; running = false;
      if (raf) { cancelAnimationFrame(raf); }
      raf = 0;
      clearTimeout(rt);
      if (fontPoll) { clearInterval(fontPoll); }
      fontPoll = 0;
      if (document.fonts && document.fonts.removeEventListener) { document.fonts.removeEventListener('loadingdone', fontCheck); }
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerleave', onLeave);
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      if (io) { io.disconnect(); }
      if (ro) { ro.disconnect(); }
    }
  };
}
