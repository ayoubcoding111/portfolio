/**
 * Portfolio interactions:
 *  - GLOBAL word-by-word staggered entrance (any [data-animate-words],
 *    triggered by IntersectionObserver when scrolled into view)
 *  - generic [data-animate="fade-up"] reveals
 *  - full-screen snap navigation (small scroll => full section change)
 *  - hero exit animation (hero fades/lifts away as About takes over)
 *  - mobile menu open/close
 *  - skills marquee duplication for a seamless left->right loop
 *  - seamless boomerang video background (see bottom section)
 */

/* --------------------------------------------------------------------------
 * Global animated words
 * ------------------------------------------------------------------------ */

/**
 * Split text into words and stagger a fade/slide-up entrance across them.
 * Returns a DocumentFragment of spans; spacing uses non-breaking spaces so
 * words never wrap inside a span.
 */
function buildAnimatedWords(text, baseDelay, stagger) {
  const frag = document.createDocumentFragment();
  const words = text.split(" ");
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.style.animationDelay = `${baseDelay + i * stagger}s`;
    span.textContent = word;
    if (i !== words.length - 1) span.appendChild(document.createTextNode("\u00A0"));
    frag.appendChild(span);
  });
  return frag;
}

// Build spans for every global animated-words target from its data attrs.
document.querySelectorAll(".animate-words[data-animate-words]").forEach((el) => {
  if (el.childElementCount > 0) return; // already built
  const text = el.getAttribute("data-animate-words") || el.textContent || "";
  const base = parseFloat(el.getAttribute("data-base-delay") || "0.1");
  const stagger = parseFloat(el.getAttribute("data-stagger") || "0.05");
  el.appendChild(buildAnimatedWords(text.trim(), base, stagger));
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion) {
  // Show everything immediately, no scroll choreography.
  document
    .querySelectorAll('.animate-words, [data-animate="fade-up"]')
    .forEach((el) => el.classList.add("in-view"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          // Every text animation plays only once, hero included.
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3, rootMargin: "0px 0px -8% 0px" }
  );

  document
    .querySelectorAll('.animate-words, [data-animate="fade-up"]')
    .forEach((el) => revealObserver.observe(el));
}

/* --------------------------------------------------------------------------
 * Mobile menu
 * ------------------------------------------------------------------------ */

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const iconOpen = document.getElementById("icon-open");
const iconClose = document.getElementById("icon-close");

function setMenuOpen(open) {
  if (!mobileMenu) return;
  mobileMenu.classList.toggle("is-open", open);
  if (iconOpen) iconOpen.classList.toggle("hidden", open);
  if (iconClose) iconClose.classList.toggle("hidden", !open);
  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  document.body.style.overflow = open ? "hidden" : "";
}

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", (e) => {
    e.preventDefault();
    setMenuOpen(!mobileMenu.classList.contains("is-open"));
  });

  // Close buttons and menu links carry data-close-menu.
  // Anchor links still navigate to their section after closing.
  mobileMenu.querySelectorAll("[data-close-menu]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const href = el.getAttribute("href");
      setMenuOpen(false);
      if (href && href.startsWith("#") && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        // Wait a tick for the overlay to hide so scroll-snap can engage.
        setTimeout(() => {
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }, 60);
      } else if (el.tagName === "A") {
        e.preventDefault();
      }
    });
  });

  // Reset state if the viewport grows past the mobile breakpoint.
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) setMenuOpen(false);
  });
}

/* --------------------------------------------------------------------------
 * Full-screen snap: small scroll => complete section change + hero exit
 * ------------------------------------------------------------------------ */

const panels = Array.from(document.querySelectorAll(".panel"));
const heroContent = document.getElementById("hero-content");
const scrollHint = document.querySelector(".scroll-hint");

function currentPanelIndex() {
  const y = window.scrollY + window.innerHeight * 0.4;
  let idx = 0;
  panels.forEach((p, i) => {
    if (p.offsetTop <= y) idx = i;
  });
  return idx;
}

function updateHeroExit() {
  if (!heroContent) return;
  // Once ~25% of the viewport is scrolled, hero lifts away.
  // Scrolling back up removes the class so the hero re-appears.
  const progress = window.scrollY / Math.max(1, window.innerHeight);
  const exiting = progress > 0.22;
  heroContent.classList.toggle("is-exiting", exiting);
  // Same moment: the fixed video blurs into the moving backdrop for
  // all other pages (see body.is-blur-bg .bg-media in styles.css).
  document.body.classList.toggle("is-blur-bg", exiting);
  if (scrollHint) scrollHint.style.opacity = exiting ? "0" : "1";
}

window.addEventListener("scroll", updateHeroExit, { passive: true });
updateHeroExit();

// Snap mode manager: fixes the "small scroll down from About yanks me back"
// pull-back. The instant the user pushes DOWN while on/near About top we
// kill CSS snap so the browser can't snap back; updateSnapMode re-arms it
// only once safely back in the Home/About lock zone.
const aboutSection = document.getElementById("about");

function getAboutTop() {
  if (aboutSection) return aboutSection.offsetTop;
  return panels[1] ? panels[1].offsetTop : window.innerHeight;
}

function setSnapType(t) {
  if (reduceMotion) return;
  if (document.documentElement.style.scrollSnapType !== t) {
    document.documentElement.style.scrollSnapType = t;
  }
}

let suspendSnapUntil = 0;

// Re-arm snap only when at/above About top; anything past it stays free
// so Projects+ scrolls smoothly with zero pull-back.
function updateSnapMode() {
  if (reduceMotion) return;
  if (performance.now() < suspendSnapUntil) {
    setSnapType("none");
    return;
  }
  const y = window.scrollY;
  setSnapType(y > getAboutTop() + 24 ? "none" : "y proximity");
}

window.addEventListener("scroll", updateSnapMode, { passive: true });
window.addEventListener("resize", updateSnapMode);
updateSnapMode();

// Wheel assist guarantees "even a small scroll jumps a full page" ONLY for
// Home <-> About. Everything after About (Projects / Pricing / Footer)
// keeps native smooth scrolling for that free, expensive feel.
// CSS uses `scroll-snap-type: y proximity` + snap-align only on Home/About,
// so Projects+ can rest anywhere without snapping back.
let snapLock = false;
window.addEventListener(
  "wheel",
  (e) => {
    // Escape hatch (runs before every early-return): pushing DOWN while
    // on/near About top kills snap instantly + 1s cooldown so the whole
    // gesture stays free and can never yank back mid-scroll.
    if (!reduceMotion && e.deltaY > 4 && !e.ctrlKey) {
      const y = window.scrollY;
      const top = getAboutTop();
      if (y >= top - 40 && y <= top + 40) {
        setSnapType("none");
        suspendSnapUntil = performance.now() + 1000;
      }
    }

    if (reduceMotion || snapLock || panels.length < 2) return;
    if (Math.abs(e.deltaY) < 18) return;
    // Don't hijack touchpads doing horizontal gestures or pinch-zoom.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.ctrlKey) return;

    const idx = currentPanelIndex();

    const next =
      e.deltaY > 0
        ? Math.min(panels.length - 1, idx + 1)
        : Math.max(0, idx - 1);
    if (next === idx) return;

    // Only hijack when LANDING on Home (0) or About (1).
    // Scrolling TOWARD Projects+ (next >= 2) stays native/smooth.
    const SNAP_LAST_INDEX = 1;
    if (next > SNAP_LAST_INDEX) return;

    const panel = panels[idx];
    if (!panel) return;
    // If the current panel is taller than the viewport, only snap when
    // the user is at its edge in the scroll direction.
    const rect = panel.getBoundingClientRect();
    const tall = panel.offsetHeight > window.innerHeight + 40;
    if (tall) {
      const atBottom = rect.bottom <= window.innerHeight + 8;
      const atTop = rect.top >= -8;
      if (e.deltaY > 0 && !atBottom) return;
      if (e.deltaY < 0 && !atTop) return;
    }

    e.preventDefault();
    snapLock = true;
    panels[next].scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      snapLock = false;
    }, 1100);
  },
  { passive: false }
);

// Touch equivalent of the escape hatch: dragging up (scrolling down)
// from About top kills snap so mobile can't yank back either.
let lastTouchY = null;
window.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length) lastTouchY = e.touches[0].clientY;
  },
  { passive: true }
);
window.addEventListener(
  "touchmove",
  (e) => {
    if (reduceMotion || !e.touches.length || lastTouchY === null) return;
    const touchY = e.touches[0].clientY;
    const dy = lastTouchY - touchY; // > 0 = scrolling down toward Projects
    lastTouchY = touchY;
    if (dy > 4) {
      const y = window.scrollY;
      const top = getAboutTop();
      if (y >= top - 40 && y <= top + 40) {
        setSnapType("none");
        suspendSnapUntil = performance.now() + 1000;
      }
    }
  },
  { passive: true }
);
window.addEventListener(
  "touchend",
  () => {
    lastTouchY = null;
  },
  { passive: true }
);

// Active nav-link highlight.
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
if ("IntersectionObserver" in window && navLinks.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((a) =>
          a.classList.toggle("is-active", a.getAttribute("href") === id)
        );
      });
    },
    { threshold: 0.55 }
  );
  panels.forEach((p) => sectionObserver.observe(p));
}

/* --------------------------------------------------------------------------
 * Skills marquee: duplicate content once for a seamless -50% -> 0 loop
 * ------------------------------------------------------------------------ */
const skillsTrack = document.getElementById("skills-track");
if (skillsTrack && !skillsTrack.dataset.cloned) {
  skillsTrack.dataset.cloned = "true";
  skillsTrack.innerHTML += skillsTrack.innerHTML;
}

/* --------------------------------------------------------------------------
 * Boomerang video background
 * ------------------------------------------------------------------------ */

const video = document.getElementById("hero-video");
const canvas = document.getElementById("hero-canvas");

if (video && canvas) {
  const frames = [];
  const MAX_WIDTH = 960;
  const MAX_FRAMES = 450; // ~15s at 30fps, caps memory on long clips

  let capturing = true;
  let lastTime = -1;
  let loopStarted = false;
  let rafId = 0;
  let vfcId = 0;
  let renderRaf = 0;

  const captureFrame = () => {
    if (!capturing || video.readyState < 2) return;
    if (video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || frames.length >= MAX_FRAMES) return;
    const scale = Math.min(1, MAX_WIDTH / vw);
    const w = Math.max(2, Math.round(vw * scale));
    const h = Math.max(2, Math.round(vh * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, w, h);
    } catch {
      return;
    }
    frames.push(c);
  };

  const hasVFC = typeof video.requestVideoFrameCallback === "function";

  const rafLoop = () => {
    captureFrame();
    if (capturing) rafId = requestAnimationFrame(rafLoop);
  };

  const vfcLoop = () => {
    captureFrame();
    if (capturing && typeof video.requestVideoFrameCallback === "function") {
      vfcId = video.requestVideoFrameCallback(vfcLoop);
    }
  };

  const startCaptureLoop = () => {
    if (loopStarted) return;
    loopStarted = true;
    if (hasVFC) {
      try {
        vfcId = video.requestVideoFrameCallback(vfcLoop);
        return;
      } catch {
        // fall through to rAF
      }
    }
    rafId = requestAnimationFrame(rafLoop);
  };

  const startBoomerangLoop = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx || frames.length === 0) return;

    if (frames.length === 1) {
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;
      try {
        ctx.drawImage(frames[0], 0, 0);
      } catch {
        // ignore
      }
      canvas.classList.add("is-live");
      return;
    }

    canvas.width = frames[0].width;
    canvas.height = frames[0].height;
    // Start on the LAST frame going backward: the video just ended there, so
    // the first boomerang loop reverses instead of jumping to the start.
    const lastIdx = frames.length - 1;
    try {
      ctx.drawImage(frames[lastIdx], 0, 0);
    } catch {
      // ignore
    }
    // Canvas already holds the handoff frame before the video hides —
    // no blank frame, no blink.
    canvas.classList.add("is-live");

    let index = Math.max(0, lastIdx - 1);
    let dir = -1;
    let last = performance.now();
    const interval = 1000 / 30;

    const render = (now) => {
      renderRaf = requestAnimationFrame(render);
      if (now - last < interval) return;
      last = now;
      try {
        ctx.drawImage(frames[index], 0, 0);
      } catch {
        return;
      }
      // Bounce without repeating end frames, so there's no 1-frame pause.
      if (dir > 0) {
        if (index >= frames.length - 1) {
          dir = -1;
          index = frames.length - 2;
        } else {
          index += 1;
        }
      } else {
        if (index <= 0) {
          dir = 1;
          index = 1;
        } else {
          index -= 1;
        }
      }
    };
    renderRaf = requestAnimationFrame(render);
  };

  const onEnded = () => {
    capturing = false;
    if (frames.length > 0) {
      video.style.display = "none";
      startBoomerangLoop();
    } else {
      // Capture failed: fall back to a plain restart so we never freeze.
      try {
        video.currentTime = 0;
        video.play().catch(() => {});
      } catch {
        // ignore
      }
      capturing = true;
      lastTime = -1;
      startCaptureLoop();
    }
  };

  const onCanPlay = () => {
    video.classList.add("is-visible");
    if (loopStarted) return;
    // Restart from 0 (only once — `canplay` fires repeatedly) so the capture
    // covers the FULL clip.
    try {
      if (video.currentTime > 0.1) video.currentTime = 0;
    } catch {
      // ignore
    }
    lastTime = -1;
    video.play().catch(() => {});
    startCaptureLoop();
  };

  const onError = () => {
    capturing = false;
  };

  video.addEventListener("canplay", onCanPlay);
  video.addEventListener("ended", onEnded);
  video.addEventListener("error", onError);
  if (video.readyState >= 3) onCanPlay();

  window.addEventListener("pagehide", () => {
    capturing = false;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(renderRaf);
    try {
      if (hasVFC && typeof video.cancelVideoFrameCallback === "function" && vfcId) {
        video.cancelVideoFrameCallback(vfcId);
      }
    } catch {
      // ignore
    }
  });
}
