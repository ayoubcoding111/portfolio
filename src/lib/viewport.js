/* A stable viewport height for phones. Safari and in-app browsers (Instagram) show and hide their toolbars while you scroll,
   which changes innerHeight and makes anything sized from it, like the hero's "O", jump. On a touch screen this keeps the
   tallest height seen at the current width (the toolbars-hidden height) and only resets it when the width changes, which
   means a rotation. On a mouse device it simply follows innerHeight. It also publishes the value as --lvh on <html>. */
const touch = () => window.matchMedia('(pointer: coarse)').matches;

let width = 0;
let height = 0;
let started = false;

const read = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!touch() || Math.abs(w - width) > 1) { height = h; } else if (h > height) { height = h; }
  width = w;
  document.documentElement.style.setProperty('--lvh', height + 'px');
};

export function stableViewH() { return height || window.innerHeight; }

export function startViewport() {
  if (started) { return; }
  started = true;
  read();
  window.addEventListener('resize', read, { passive: true });
  window.addEventListener('orientationchange', () => { width = 0; setTimeout(read, 250); });
}
