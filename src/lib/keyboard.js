/* The Stack: a mechanical keyboard in raw WebGL2, one tool per key.

   Built on the keycap engine you supplied (the tapered, dish-topped caps, the studio lighting, the engraved legends and the
   press and ripple physics), laid out as a 9u-wide, four-row board instead of a ball. It flies in on scroll from the
   bottom-right corner, rolling over once, and settles turned 30° to the left. Hovering a key presses it and lights it in
   the tool's colour; clicking (or Enter) sends a ripple across the board. Legends are drawn at runtime into one atlas.

   createKeyboard(stage, canvas, opts) → { setTheme(light), destroy() } or null without WebGL2. */

// ---------------------------------------------------------------- maths

const clamp = (v, lo, hi) => (v > hi ? hi : v >= lo ? v : lo);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const qAxis = (axis, angle) => { const s = Math.sin(angle / 2); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)]; };
const qConj = (q) => [-q[0], -q[1], -q[2], q[3]];
const qRotate = (q, v) => {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx];
};

const perspective = (fovY, aspect, near, far) => {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
};
const lookAt = (eye, target) => {
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return {
    m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1],
    right: x, up: y, forward: [-z[0], -z[1], -z[2]]
  };
};
const mul4 = (a, b) => {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) { o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; }
  }
  return o;
};
const project = (m, p) => {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [x / w, y / w];
};

/* Slab test of a ray against an axis-aligned box. Nearest hit, or -1. */
const rayBox = (o, d, lo, hi) => {
  let t0 = -Infinity, t1 = Infinity;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) { if (o[a] < lo[a] || o[a] > hi[a]) { return -1; } continue; }
    const ta = (lo[a] - o[a]) / d[a], tb = (hi[a] - o[a]) / d[a];
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
  }
  if (t1 < Math.max(t0, 0)) { return -1; }
  return t0 >= 0 ? t0 : t1;
};

const hexToLinear = (hex, fallback) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) { return fallback; }
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return [lin(parseInt(h.slice(0, 2), 16)), lin(parseInt(h.slice(2, 4), 16)), lin(parseInt(h.slice(4, 6), 16))];
};
const hexToSrgb = (hex) => {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};
const luminance = (hex) => { const c = hexToLinear(hex, [0, 0, 0]); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

// ---------------------------------------------------------------- board

/* Cap geometry in key pitches (1u). Each cap is drawn at SCALE so neighbours keep a gap. */
const SCALE = 0.94;
const KEY_H = 0.52;
const TOP_HALF = 0.37;
const BEVEL = 0.055;
const DISH = 0.026;
const CELL = 128;
const BOARD_W = 9;
const ROWS = 4;
const CASE_PAD = 0.38;
const CASE_DEPTH = 0.42;
const FOV = (26 * Math.PI) / 180;
/* Fastest the fly-in may play, in flights per second: a full flight takes at least ~1.4 s however fast the scroll. */
const FLIGHT_SPEED = 0.7;
/* Slowest it settles, in flights per second, so the last stretch lands crisply instead of creeping in. */
const FLIGHT_MIN_SPEED = 0.35;
/* How far into the flight the roll starts (0 = board enters, 1 = touchdown); it always ends at the touchdown. */
const FLIP_START = 0.55;
/* How far the landed board sits above the stage's centre, as a fraction of the stage's height. */
const RAISE = 0.12;

/* Finishes: 0 tool cap, 1 modifier, 2 accent, 3 case. */
const THEMES = {
  dark: {
    cap: ['#16181f', '#262a35', '#2B45FF', '#0a0c12'],
    legend: ['#EEF2F8', '#9AA3B5', '#EEF2F8'],
    glow: '#2B45FF', glowAmt: 0.15, ambient: 0.02, envLift: 0, minContrast: 1.45, print: 0.35
  },
  light: {
    cap: ['#f4f5f8', '#c9cdd8', '#2B45FF', '#d6d9e2'],
    legend: ['#0D1230', '#3a4060', '#FFFFFF'],
    glow: '#2B45FF', glowAmt: 0.2, ambient: 0.2, envLift: 0.16, minContrast: 1, print: 0.8
  }
};

/* Four rows, each 9u: a real 60%-style layout, with the tools where the letters would be. "t" is an index into keys. */
const LAYOUT = [
  [{ m: 'Esc', w: 1, f: 2 }, { t: 0 }, { t: 1 }, { t: 2 }, { t: 3 }, { t: 4 }, { t: 5 }, { m: '⌫', w: 2, f: 1 }],
  [{ m: 'Tab', w: 1.5, f: 1 }, { t: 6 }, { t: 7 }, { t: 8 }, { t: 9 }, { t: 10 }, { m: '↵', w: 2.5, f: 2 }],
  [{ m: '⇧', w: 2, f: 1 }, { t: 11 }, { t: 12 }, { t: 13 }, { t: 14 }, { t: 15 }, { m: '⇧', w: 2, f: 1 }],
  [{ m: 'Ctrl', w: 1.25, f: 1 }, { m: 'Alt', w: 1.25, f: 1 }, { m: '', w: 4.5, f: 1 }, { m: 'Alt', w: 1, f: 1 }, { m: 'Fn', w: 1, f: 1 }]
];

// ---------------------------------------------------------------- meshes

const smoothNormals = (pos, idx) => {
  const nor = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { nor[v] += nx; nor[v + 1] += ny; nor[v + 2] += nz; }
  }
  for (let i = 0; i < nor.length; i += 3) {
    const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]) || 1;
    nor[i] /= l; nor[i + 1] /= l; nor[i + 2] /= l;
  }
  return nor;
};

/* A stack of rounded-rectangle rings [halfX, halfZ, cornerRadius, y], stitched into one shell and closed on top. */
const shell = (rings, topY) => {
  const SEG = 6;
  const loop = 4 * (SEG + 1);
  const pos = [];
  for (const [hx, hz, rad, y] of rings) {
    const r = Math.min(rad, hx, hz);
    const cx = hx - r, cz = hz - r;
    const corners = [[cx, cz, 0], [-cx, cz, Math.PI / 2], [-cx, -cz, Math.PI], [cx, -cz, (3 * Math.PI) / 2]];
    for (const [ox, oz, a0] of corners) {
      for (let s = 0; s <= SEG; s++) {
        const a = a0 + (s / SEG) * (Math.PI / 2);
        pos.push(ox + Math.cos(a) * r, y, oz + Math.sin(a) * r);
      }
    }
  }
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < loop; j++) {
      const a = i * loop + j, b = i * loop + ((j + 1) % loop);
      const c = (i + 1) * loop + ((j + 1) % loop), d = (i + 1) * loop + j;
      idx.push(a, d, c, a, c, b);
    }
  }
  const centre = pos.length / 3;
  pos.push(0, topY, 0);
  const last = (rings.length - 1) * loop;
  for (let j = 0; j < loop; j++) { idx.push(last + j, centre, last + ((j + 1) % loop)); }
  return { pos: new Float32Array(pos), nor: smoothNormals(pos, idx), idx: new Uint16Array(idx) };
};

/* A cap w pitches wide: tapered walls, a rolled bevel and a shallow dish (cylindrical on the long keys). */
const buildCap = (w) => {
  const extra = (w - 1) / 2 / SCALE;
  const rings = [];
  const wallTop = KEY_H - BEVEL;
  const ring = (half, rad, y) => rings.push([half + extra, half, rad, y]);
  for (let i = 0; i <= 4; i++) { const t = i / 4; ring(0.5 - (0.5 - TOP_HALF - BEVEL) * t, 0.11 + 0.03 * t, wallTop * t); }
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    ring(TOP_HALF + BEVEL * Math.cos(a), 0.14 + 0.02 * (1 - Math.cos(a)), wallTop + BEVEL * Math.sin(a));
  }
  for (let i = 1; i <= 6; i++) {
    const h = TOP_HALF * (1 - i / 6.2), q = h / TOP_HALF;
    ring(h, 0.16 * q, KEY_H - DISH * (1 - q * q));
  }
  return shell(rings, KEY_H - DISH);
};

/* The case: a low slab with rounded corners and a rolled top edge. Its top sits at y = 0. */
const buildCase = () => {
  const hx = BOARD_W / 2 + CASE_PAD, hz = ROWS / 2 + CASE_PAD, R = 0.32, B = 0.09;
  const rings = [[hx - 0.06, hz - 0.06, R, -CASE_DEPTH], [hx, hz, R, -CASE_DEPTH + 0.06], [hx, hz, R, -B]];
  for (let i = 1; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); rings.push([hx - B * (1 - Math.cos(a)), hz - B * (1 - Math.cos(a)), R, -B + B * Math.sin(a)]); }
  rings.push([hx - B - 0.02, hz - B - 0.02, R, 0]);
  return shell(rings, 0);
};

// ---------------------------------------------------------------- legends

/* Every legend into one premultiplied atlas: brand logos in their colours (flipped to ink where a logo would vanish into
   its cap, like GitHub's black on a dark cap; on light caps every brand colour stays, JavaScript's yellow included),
   modifier labels in the theme's legend colour. */
const drawAtlas = (cells, theme, keys) => {
  const n = Math.max(1, Math.ceil(Math.sqrt(cells.length)));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n * CELL;
  const ctx = canvas.getContext('2d');
  if (!ctx) { return { canvas, n }; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  cells.forEach((cell, k) => {
    const ox = (k % n) * CELL, oy = Math.floor(k / n) * CELL;
    ctx.save();
    ctx.translate(ox, oy);
    if (cell.tool !== undefined) {
      const key = keys[cell.tool];
      const cap = theme.cap[0];
      let color = '#' + key.hex.replace('#', '');
      if (contrast(color, cap) < theme.minContrast) { color = theme.legend[0]; }
      ctx.fillStyle = color;
      if (key.path) {
        const s = (CELL * 0.6) / 24;
        ctx.translate(CELL * 0.2, CELL * 0.2);
        ctx.scale(s, s);
        ctx.fill(new Path2D(key.path));
      } else {
        drawText(ctx, key.short || key.name, 'sans');
      }
    } else {
      ctx.fillStyle = theme.legend[cell.finish];
      drawText(ctx, cell.label, 'mono');
    }
    ctx.restore();
  });
  return { canvas, n };
};

const drawText = (ctx, text, kind) => {
  const family = kind === 'mono'
    ? '"Geist Mono", ui-monospace, Menlo, Consolas, monospace'
    : '"Archivo", "Helvetica Neue", Arial, sans-serif';
  const weight = kind === 'mono' ? 500 : 800;
  let size = text.length <= 1 ? 62 : text.length <= 3 ? 40 : 34;
  ctx.font = weight + ' ' + size + 'px ' + family;
  while (ctx.measureText(text).width > CELL * 0.78 && size > 14) { size -= 2; ctx.font = weight + ' ' + size + 'px ' + family; }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CELL / 2, CELL / 2 + size * 0.04);
};

// ---------------------------------------------------------------- shaders

const BG_VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/* Only the cobalt pool under the board, premultiplied over a transparent canvas: the page's own ground shows through. */
const BG_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform vec3 uGlow;
uniform vec2 uPool;
uniform vec4 uFrame;
uniform float uAmt;
uniform vec2 uRing; // landing ring: radius, strength
void main() {
  vec2 p = (gl_FragCoord.xy - uPool) / uFrame.w;
  vec2 g = p * vec2(0.42, 1.25);
  float a = (exp(-dot(g, g) * 9.0) * 0.85 + exp(-dot(g, g) * 3.0) * 0.15) * uAmt;
  float rd = (length(g) - uRing.x) / 0.035;
  a += exp(-rd * rd) * uRing.y;
  // Fade to nothing before the frame's edge, so the pool never shows a rectangle.
  vec2 q = (gl_FragCoord.xy - uFrame.xy) / uFrame.zw;
  a *= smoothstep(0.0, 0.18, q.x) * smoothstep(0.0, 0.18, 1.0 - q.x) * smoothstep(0.0, 0.22, q.y) * smoothstep(0.0, 0.22, 1.0 - q.y);
  fragColor = vec4(uGlow * a, a);
}`;

const MESH_VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec4 aM0;
layout(location = 3) in vec4 aM1;
layout(location = 4) in vec4 aM2;
layout(location = 5) in vec4 aM3;
layout(location = 6) in vec4 aInfo;
layout(location = 7) in vec4 aCol;
uniform mat4 uViewProj;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vLocal;
out vec3 vTx;
out vec3 vTz;
// flat: an interpolated cell index flips between neighbouring legends and sparkles.
flat out vec4 vInfo;
flat out vec4 vCol;
void main() {
  mat4 m = mat4(aM0, aM1, aM2, aM3);
  vec4 w = m * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(m) * aNor;
  vLocal = aPos;
  vTx = aM0.xyz;
  vTz = aM2.xyz;
  vInfo = aInfo;
  vCol = aCol;
  gl_Position = uViewProj * w;
}`;

const MESH_FRAG = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vLocal;
in vec3 vTx;
in vec3 vTz;
flat in vec4 vInfo;
flat in vec4 vCol;
out vec4 fragColor;

uniform vec3 uCam;
uniform vec3 uCap[4];
uniform vec3 uGlow;
uniform sampler2D tLegend;
uniform float uCells;
uniform float uAmbient;
uniform float uEnvLift;
uniform float uPrint;

const float KEY_H = ${KEY_H.toFixed(3)};
const float TOP_HALF = ${TOP_HALF.toFixed(3)};
const float CELL = ${CELL.toFixed(1)};

vec3 tone(vec3 c) {
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

// The studio the caps reflect: a dark room, a softbox high on the left, a strip on the right, the blue floor below.
vec3 env(vec3 d) {
  vec3 c = mix(vec3(0.006, 0.007, 0.014), vec3(0.03, 0.033, 0.055), smoothstep(-0.2, 0.9, d.y)) + uEnvLift;
  c += vec3(1.0, 0.97, 0.93) * smoothstep(0.86, 0.96, dot(d, normalize(vec3(-0.55, 0.78, 0.45)))) * 2.6;
  c += vec3(0.75, 0.8, 1.0) * smoothstep(0.94, 0.99, dot(d, normalize(vec3(0.85, 0.3, 0.25)))) * 1.1;
  c += uGlow * smoothstep(0.05, -0.55, d.y) * 0.45;
  return c;
}

void main() {
  int f = int(vInfo.x + 0.5);
  float press = vCol.a;
  vec3 base = uCap[f] * vInfo.w;
  float rough = f == 0 ? 0.36 : f == 1 ? 0.44 : f == 2 ? 0.3 : 0.5;
  bool isCase = f == 3;

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vWorld);

  // The legend is engraved into the dish: the atlas colours it, and its edge gradient tips the normal like a cut.
  // Sampled unconditionally (a mipmapped lookup in a non-uniform branch sparkles) and masked afterwards.
  float hasLegend = step(0.0, vInfo.y);
  vec2 uv = vLocal.xz / (2.0 * TOP_HALF) + 0.5;
  float inside = step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
  float top = smoothstep(KEY_H - 0.07, KEY_H - 0.035, vLocal.y) * inside * hasLegend;
  float id = floor(max(vInfo.y, 0.0) + 0.5);
  float row = floor((id + 0.5) / uCells);
  vec2 cell = vec2(id - row * uCells, row);
  vec2 auv = (cell + clamp(uv, 0.02, 0.98)) / uCells;
  float e = 1.5 / (uCells * CELL);
  vec4 L = texture(tLegend, auv);
  float leg = L.a * top;
  vec3 lcol = L.rgb / max(L.a, 0.001);
  float gx = texture(tLegend, auv + vec2(e, 0.0)).a - texture(tLegend, auv - vec2(e, 0.0)).a;
  float gz = texture(tLegend, auv + vec2(0.0, e)).a - texture(tLegend, auv - vec2(0.0, e)).a;
  N = normalize(N + (normalize(vTx) * gx + normalize(vTz) * gz) * 0.45 * top);
  base = mix(base, lcol, leg * 0.94);
  rough = mix(rough, 0.55, leg * 0.5);

  // Contact shadow: walls darken toward the base, where the neighbours and the plate close in.
  float ao = isCase ? 0.8 : mix(0.3, 1.0, smoothstep(0.0, KEY_H * 0.85, vLocal.y));

  float ndv = max(dot(N, V), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  float shin = mix(900.0, 22.0, rough);
  vec3 Ls[3];
  vec3 Cs[3];
  Ls[0] = normalize(vec3(-0.55, 0.85, 0.7));  Cs[0] = vec3(1.0, 0.96, 0.9) * 2.3;
  Ls[1] = normalize(vec3(0.2, -0.85, 0.5));   Cs[1] = uGlow * 0.5;
  Ls[2] = normalize(vec3(0.9, 0.35, -0.45));  Cs[2] = vec3(0.6, 0.68, 1.0) * 1.2;
  vec3 diff = vec3(0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float ndl = max(dot(N, Ls[i]), 0.0);
    vec3 H = normalize(Ls[i] + V);
    diff += Cs[i] * ndl;
    spec += Cs[i] * pow(max(dot(N, H), 0.0), shin) * (shin + 8.0) / 60.0 * ndl;
  }
  vec3 R = reflect(-V, N);
  vec3 envc = mix(env(R), env(N) * 0.5, rough);
  vec3 ambient = vec3(uAmbient) + uGlow * 0.06 * max(-N.y, 0.0);

  vec3 col = base * (diff * 0.3 + ambient) * ao;
  col += (spec * 0.05 * (1.0 - rough * 0.7) + envc * F * (1.0 - rough * 0.55)) * mix(0.5, 1.0, ao);
  // Printed legends keep their brand colour instead of washing out under the key light (most on light caps).
  col = mix(col, lcol * 0.42, leg * uPrint);
  // A pressed key lights in its tool's colour: a rim along the cap and a lift on the legend.
  col += vCol.rgb * press * (0.05 + F * 1.1) * 0.8;
  col += lcol * leg * press * 0.45;
  fragColor = vec4(tone(col), 1.0);
}`;

const compile = (gl, type, src) => {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('shader: ' + log); }
  return sh;
};
const link = (gl, vs, fs) => {
  const p = gl.createProgram();
  const a = compile(gl, gl.VERTEX_SHADER, vs), b = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
  gl.deleteShader(a); gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(p); gl.deleteProgram(p); throw new Error('link: ' + log); }
  return p;
};

const STRIDE = 24; // floats per instance: a 4×4 model matrix, info (finish, cell, -, shade), colour (rgb, press)

// ---------------------------------------------------------------- engine

export function createKeyboard(stage, canvas, opts) {
  const keys = opts.keys;
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { return null; }
  const reduced = !!opts.reduced;
  let theme = opts.light ? THEMES.light : THEMES.dark;

  // ---- layout: one entry per cap, grouped by width so each width is one instanced draw.
  const caps = [];
  const cells = [];
  LAYOUT.forEach((row, r) => {
    let x = -BOARD_W / 2;
    row.forEach((k) => {
      const w = k.w || 1;
      const cap = { x: x + w / 2, z: (r - (ROWS - 1) / 2), w, row: r, finish: k.t !== undefined ? 0 : k.f, tool: k.t, cell: -1 };
      if (k.t !== undefined) { cap.cell = cells.length; cells.push({ tool: k.t }); }
      else if (k.m) { cap.cell = cells.length; cells.push({ label: k.m, finish: k.f }); }
      caps.push(cap);
      x += w;
    });
  });
  const widths = Array.from(new Set(caps.map((c) => c.w)));
  const order = [];
  const groups = widths.map((w) => {
    const first = order.length;
    caps.forEach((c, i) => { if (c.w === w) { order.push(i); } });
    return { w, first, count: order.length - first };
  });
  const toolCaps = caps.map((c, i) => (c.tool !== undefined ? i : -1)).filter((i) => i >= 0);
  // A fixed shade jitter so the plastic isn't perfectly uniform.
  caps.forEach((c, i) => { c.shade = 0.94 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.1; });

  // ---- GL resources
  let bgProgram, meshProgram, atlas, instBuf, caseBuf, raf = 0, disposed = false, visible = false;
  const buffers = [], vaos = [];
  const u = {}, ub = {};
  const inst = new Float32Array(caps.length * STRIDE);
  const caseInst = new Float32Array(STRIDE);
  let atlasCells = 1;
  let capVaos = [], caseVao = null;

  const pointInstances = (buf, first) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let a = 0; a < 6; a++) { gl.vertexAttribPointer(2 + a, 4, gl.FLOAT, false, STRIDE * 4, first * STRIDE * 4 + a * 16); }
  };
  const meshVao = (mesh, buf) => {
    const vao = gl.createVertexArray();
    vaos.push(vao);
    gl.bindVertexArray(vao);
    const pb = gl.createBuffer(), nb = gl.createBuffer(), ib = gl.createBuffer();
    buffers.push(pb, nb, ib);
    gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, mesh.nor, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    for (let a = 0; a < 6; a++) { gl.enableVertexAttribArray(2 + a); gl.vertexAttribDivisor(2 + a, 1); }
    pointInstances(buf, 0);
    gl.bindVertexArray(null);
    return { vao, count: mesh.idx.length };
  };

  const uploadAtlas = () => {
    const drawn = drawAtlas(cells, theme, keys);
    atlasCells = drawn.n;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // Premultiplied, so mipmaps don't bleed black into the logo edges; the shader divides it back out.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawn.canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) { gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4); }
  };

  try {
    bgProgram = link(gl, BG_VERT, BG_FRAG);
    meshProgram = link(gl, MESH_VERT, MESH_FRAG);
    ['uRes', 'uGlow', 'uPool', 'uFrame', 'uAmt', 'uRing'].forEach((k) => { ub[k] = gl.getUniformLocation(bgProgram, k); });
    ['uViewProj', 'uCam', 'uCap', 'uGlow', 'tLegend', 'uCells', 'uAmbient', 'uEnvLift', 'uPrint'].forEach((k) => { u[k] = gl.getUniformLocation(meshProgram, k); });
    const bgVao = gl.createVertexArray();
    vaos.push(bgVao);
    instBuf = gl.createBuffer();
    caseBuf = gl.createBuffer();
    buffers.push(instBuf, caseBuf);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, caseBuf); gl.bufferData(gl.ARRAY_BUFFER, caseInst.byteLength, gl.DYNAMIC_DRAW);
    capVaos = groups.map((g) => meshVao(buildCap(g.w), instBuf));
    caseVao = meshVao(buildCase(), caseBuf);
    atlas = gl.createTexture();
    uploadAtlas();
  } catch (e) {
    return null;
  }

  // ---- state
  const n = caps.length;
  const pressAmt = new Float32Array(n);
  const ripples = [];
  const started = performance.now();
  const section = stage.closest('section') || stage;
  const head = section.querySelector('.pf-kb__head') || stage;
  const nav = document.querySelector('.pf-nav__inner');
  let last = started;
  let hover = -1;
  let held = -1;
  let selected = -1;
  let pointer = { inside: false, cx: 0, cy: 0 };
  let tilt = [0, 0];
  let flight = reduced ? 1 : 0;
  let frameRect = { l: 0, t: 0, w: 1, h: 1 };
  let cam = { eye: [0, 0, 10], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1], aspect: 1 };
  let q = [0, 0, 0, 1];
  let lift = 0;
  let touched = reduced;
  let impactT0 = -10;
  let reported = -2;
  let cleared = false;

  const active = () => (hover >= 0 ? hover : selected);
  const report = (a) => {
    const tool = a >= 0 && caps[a].tool !== undefined ? caps[a].tool : -1;
    if (tool !== reported) { reported = tool; if (opts.onHover) { opts.onHover(tool); } }
  };

  /* The canvas covers the whole viewport (fixed, click-through), so the board can fly in over the section above. */
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
  };

  // ---- picking: the ray goes into the board's own frame, where every cap is an axis-aligned box.
  const pick = (clientX, clientY) => {
    const r = frameRect;
    const nx = ((clientX - r.l) / Math.max(r.w, 1)) * 2 - 1;
    const ny = 1 - ((clientY - r.t) / Math.max(r.h, 1)) * 2;
    if (nx < -1 || nx > 1 || ny < -1 || ny > 1) { return -1; }
    const t = Math.tan(FOV / 2);
    const dWorld = norm([
      cam.forward[0] + cam.right[0] * nx * t * cam.aspect + cam.up[0] * ny * t,
      cam.forward[1] + cam.right[1] * nx * t * cam.aspect + cam.up[1] * ny * t,
      cam.forward[2] + cam.right[2] * nx * t * cam.aspect + cam.up[2] * ny * t
    ]);
    const inv = qConj(q);
    const o = qRotate(inv, [cam.eye[0], cam.eye[1] - lift, cam.eye[2]]);
    const d = qRotate(inv, dWorld);
    let best = -1, bestT = Infinity;
    for (let i = 0; i < n; i++) {
      const c = caps[i];
      const hx = c.w / 2 - 0.03, hz = 0.47;
      const tHit = rayBox(o, d, [c.x - hx, 0, c.z - hz], [c.x + hx, KEY_H * SCALE + 0.02, c.z + hz]);
      if (tHit >= 0 && tHit < bestT) { bestT = tHit; best = i; }
    }
    return best;
  };

  const press = (i) => {
    if (i < 0) { return; }
    const now = (performance.now() - started) / 1000;
    if (!reduced) { ripples.push({ x: caps[i].x, z: caps[i].z, t0: now }); if (ripples.length > 5) { ripples.shift(); } }
    if (opts.onPress && caps[i].tool !== undefined) { opts.onPress(caps[i].tool); }
  };

  // ---- input
  // Touch has no hover: a tap presses the key and keeps it selected (its card stays up) until another tap moves on.
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') { return; }
    pointer.inside = true; pointer.cx = e.clientX; pointer.cy = e.clientY;
  };
  const onPointerLeave = (e) => { if (e.pointerType !== 'mouse') { return; } pointer.inside = false; hover = -1; held = -1; };
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') { return; }
    if (e.pointerType === 'mouse') { pointer.inside = true; pointer.cx = e.clientX; pointer.cy = e.clientY; }
    held = pick(e.clientX, e.clientY);
  };
  const onPointerUp = (e) => {
    const i = pick(e.clientX, e.clientY);
    const tap = e.pointerType !== 'mouse';
    if (held >= 0 && i === held) { press(i); if (tap) { selected = caps[i].tool !== undefined ? i : -1; } }
    else if (tap && i < 0) { selected = -1; }
    held = -1;
  };
  const onPointerCancel = () => { held = -1; };
  // The stage's own pointerup runs first (and fires the press); this only clears a press released elsewhere.
  const onWindowUp = () => { held = -1; };
  // Keyboard: arrows walk the tool keys, Enter or Space presses, a letter jumps to the tool that starts with it.
  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    const at = Math.max(0, toolCaps.indexOf(selected));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { selected = toolCaps[(at + (selected < 0 ? 0 : 1)) % toolCaps.length]; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { selected = toolCaps[(at - 1 + toolCaps.length) % toolCaps.length]; }
    else if (e.key === 'Enter' || e.key === ' ') { if (selected < 0) { selected = toolCaps[0]; } held = selected; }
    else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
      const ch = e.key.toLowerCase();
      const matches = toolCaps.filter((i) => keys[caps[i].tool].name.toLowerCase().startsWith(ch));
      if (!matches.length) { return; }
      const next = matches[(matches.indexOf(selected) + 1) % matches.length];
      selected = next;
      held = next;
    } else { return; }
    e.preventDefault();
  };
  const onKeyUp = (e) => {
    if (held >= 0 && (e.key === 'Enter' || e.key === ' ' || e.key.length === 1)) { press(held); held = -1; }
  };
  const onBlur = () => { selected = -1; held = -1; };

  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerleave', onPointerLeave);
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('pointerup', onWindowUp);
  stage.addEventListener('keydown', onKeyDown);
  stage.addEventListener('keyup', onKeyUp);
  stage.addEventListener('blur', onBlur);

  // Run while the section is on screen or up to two screens below it (the flight starts over the section above).
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!disposed && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { rootMargin: '0px 0px 220% 0px' });
  io.observe(section);

  const YAW = (30 * Math.PI) / 180;

  const clearAll = () => {
    if (cleared) { return; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    cleared = true;
  };

  // ---- frame
  const frame = () => {
    raf = 0;
    if (disposed) { return; }
    if (!visible) { clearAll(); report(-1); return; }
    const nowMs = performance.now();
    const dt = Math.min((nowMs - last) / 1000, 0.05);
    last = nowMs;
    const now = (nowMs - started) / 1000;
    resize();
    const W = canvas.width, H = canvas.height;
    if (!W || !H) { raf = requestAnimationFrame(frame); return; }
    const vw = canvas.clientWidth, vh = canvas.clientHeight;
    const sr = stage.getBoundingClientRect();
    const secTop = section.getBoundingClientRect().top;

    // ---- the flight, driven by scroll. While the section above is still on screen (this section's top 2 screens down)
    // the board comes in keys up from beyond the right edge of the screen, at mid height, then grows, rolls over once
    // (finishing as it touches down) and turns 30° to the left, landing on the stage as this section's heading reaches the
    // top of the screen, just under the nav. Scrolling back reverses it.
    // It trails the scroll softly and never moves faster than FLIGHT_SPEED, so a fast flick still plays the whole flight;
    // near the end it keeps at least FLIGHT_MIN_SPEED, so the board arrives with speed instead of drifting in.
    const cNow = sr.top + sr.height / 2;
    const c0 = vh * 2 + (sr.top - secTop) + sr.height / 2;
    const navH = nav ? nav.getBoundingClientRect().height : 72;
    const cEnd = navH + 16 + (sr.top - head.getBoundingClientRect().top) + sr.height / 2;
    const goalFlight = reduced ? 1 : clamp((c0 - cNow) / Math.max(c0 - cEnd, 1), 0, 1);
    const diff = goalFlight - flight;
    let step = diff * (1 - Math.exp(-dt * 4.5));
    const minStep = Math.min(Math.abs(diff), FLIGHT_MIN_SPEED * dt);
    if (Math.abs(step) < minStep) { step = Math.sign(diff) * minStep; }
    const maxStep = FLIGHT_SPEED * dt;
    flight += clamp(step, -maxStep, maxStep);
    if (Math.abs(goalFlight - flight) < 0.0005) { flight = goalFlight; }
    // ---- touchdown: the frame the board lands starts the impact (a squash and rebound, a wave of light and bounce out
    // from the centre of the keys, a ring across the floor glow). Flying back up re-arms it.
    if (flight >= 0.995 && !touched) {
      touched = true;
      impactT0 = now;
      ripples.push({ x: 0, z: 0, t0: now, amp: 1.8, light: true });
    }
    if (flight < 0.9 && !reduced) { touched = false; }
    const it = now - impactT0;
    const squash = it < 1.2 ? Math.exp(-it * 5) * Math.sin(it * 16) : 0;
    const sx = 1 + squash * 0.06, sy = 1 - squash * 0.22, drop = -squash * 0.12;
    const appear = 1;
    // Eases in and arrives at full speed, so the landing reads as a touchdown.
    const e = 1 - Math.cos((flight * Math.PI) / 2);
    const sw = clamp(sr.width * 0.3, 180, 380);
    const sh = sw * (sr.height / Math.max(sr.width, 1));
    const start = { l: vw + vw * 0.02, t: vh * 0.4 - sh / 2 };
    // Early on the stage is still below the screen, so aim first at where it will sit when it lands and hand over to the
    // stage itself as the flight ends: the whole flight stays in view and never hovers over the heading.
    // The board settles RAISE of the stage's height above the stage's centre, closer to the heading.
    const top = sr.top - sr.height * RAISE;
    const landTop = cEnd - sr.height / 2 - sr.height * RAISE;
    const toTop = Math.min(top, landTop + (top - landTop) * e);
    frameRect = {
      l: start.l + (sr.left - start.l) * e,
      t: start.t + (toTop - start.t) * e - Math.sin(Math.PI * e) * vh * 0.1,
      w: sw + (sr.width - sw) * e,
      h: sh + (sr.height - sh) * e
    };
    if (frameRect.l > vw || frameRect.t > vh || frameRect.t + frameRect.h < 0) {
      clearAll();
      hover = -1;
      report(selected);
      raf = requestAnimationFrame(frame);
      return;
    }
    cleared = false;
    const landed = flight > 0.97;

    // The board leans a few degrees toward the pointer once it has landed, and floats a little.
    let goal = [0, 0];
    if (pointer.inside && !reduced && landed) {
      goal = [((pointer.cx - sr.left) / sr.width - 0.5) * 0.12, ((pointer.cy - sr.top) / sr.height - 0.5) * 0.09];
    }
    const k = 1 - Math.exp(-dt * 3.5);
    tilt = [tilt[0] + (goal[0] - tilt[0]) * k, tilt[1] + (goal[1] - tilt[1]) * k];
    // One full roll, from FLIP_START of the flight (this section's top entering the bottom of the screen) to the touchdown,
    // on a gentle sine ease so it keeps turning visibly until the end: it comes in and lands keys up.
    const rollT = clamp((flight - FLIP_START) / (1 - FLIP_START), 0, 1);
    const roll = (1 - (1 - Math.cos(Math.PI * rollT)) / 2) * Math.PI * 2;
    q = qMul(qAxis([0, 1, 0], YAW * e + tilt[0]), qMul(qAxis([1, 0, 0], tilt[1]), qAxis([1, 0, 0], roll)));
    lift = reduced ? 0 : Math.sin(now * 0.8) * 0.05;

    // Camera: above and in front, framed for the stage's shape; the flight then places that frame on screen.
    const aspect = frameRect.w / Math.max(frameRect.h, 1);
    // Framed for the final pose: turned 30°, the near (left) end grows, so leave it room.
    const halfW = (BOARD_W / 2 + CASE_PAD) * 1.4;
    const t = Math.tan(FOV / 2);
    const dist = Math.max(halfW / (t * aspect), (ROWS / 2 + CASE_PAD + 1.6) / t);
    const elev = 0.88;
    const eye = [0, Math.sin(elev) * dist, Math.cos(elev) * dist];
    const la = lookAt(eye, [0, -0.25, 0.15]);
    cam = { eye, right: la.right, up: la.up, forward: la.forward, aspect };
    // Clip-space placement: scale the stage-framed picture down to the frame rect and move it there.
    const fx = frameRect.w / vw, fy = frameRect.h / vh;
    const tx = ((frameRect.l + frameRect.w / 2) / vw) * 2 - 1;
    const ty = 1 - ((frameRect.t + frameRect.h / 2) / vh) * 2;
    const place = [fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1];
    const viewProj = mul4(place, mul4(perspective(FOV, aspect, 0.1, 100), la.m));

    hover = pointer.inside && e > 0.8 ? pick(pointer.cx, pointer.cy) : -1;
    stage.style.cursor = hover >= 0 ? 'pointer' : '';
    const on = active();
    report(on);

    const glowLin = hexToLinear(theme.glow, [0.02, 0.06, 1]);
    // Per cap: hover presses it fast, release comes back a touch slower; a held click pushes it to the bottom.
    while (ripples.length && now - ripples[0].t0 > 3) { ripples.shift(); }
    const rs = 0.34;
    const bs = SCALE * appear;
    let slot = 0;
    for (const g of groups) {
      for (let j = 0; j < g.count; j++) {
        const i = order[g.first + j];
        const c = caps[i];
        const goalP = i === held ? 1.25 : i === on ? 1 : 0;
        const rate = goalP > pressAmt[i] ? 26 : 11;
        pressAmt[i] += (goalP - pressAmt[i]) * (1 - Math.exp(-dt * rate));
        let wave = 0, flash = 0;
        for (const rp of ripples) {
          const d = Math.hypot(c.x - rp.x, c.z - rp.z);
          const tau = now - rp.t0 - d / 9;
          if (tau > 0 && tau < 1.6) { wave += Math.sin(tau * 15) * Math.exp(-tau * 5) * Math.exp(-d * 0.32) * 0.2 * (rp.amp || 1); }
          if (rp.light && tau > 0 && tau < 0.5) { flash = Math.max(flash, Math.sin((Math.PI * tau) / 0.5)); }
        }
        const y = (-Math.min(pressAmt[i], 1.25) * rs + wave) * KEY_H + 0.01;
        const X = qRotate(q, [bs * sx, 0, 0]), Y = qRotate(q, [0, bs * sy, 0]), Z = qRotate(q, [0, 0, bs * sx]);
        const P = qRotate(q, [c.x * appear * sx, y * appear * sy, c.z * appear * sx]);
        const o = slot * STRIDE;
        inst.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, P[0], P[1] + lift + drop, P[2], 1], o);
        inst[o + 16] = c.finish;
        inst[o + 17] = c.cell;
        inst[o + 18] = 0;
        inst[o + 19] = c.shade;
        const tc = c.tool !== undefined ? keys[c.tool].glow : glowLin;
        inst[o + 20] = tc[0]; inst[o + 21] = tc[1]; inst[o + 22] = tc[2];
        inst[o + 23] = clamp(Math.max(pressAmt[i], flash * 0.85), 0, 1);
        slot++;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);

    const CX = qRotate(q, [appear * sx, 0, 0]), CY = qRotate(q, [0, appear * sy, 0]), CZ = qRotate(q, [0, 0, appear * sx]);
    caseInst.set([CX[0], CX[1], CX[2], 0, CY[0], CY[1], CY[2], 0, CZ[0], CZ[1], CZ[2], 0, 0, lift + drop, 0, 1, 3, -1, 0, 1, 0, 0, 0, 0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, caseBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, caseInst);

    // ---- draw
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // The cobalt pool, placed and sized with the frame; it builds up as the board lands.
    const dpr = W / vw;
    const pool = project(viewProj, [0, -CASE_DEPTH, 0.6]);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(bgProgram);
    gl.bindVertexArray(vaos[0]);
    gl.uniform2f(ub.uRes, W, H);
    const glowSrgb = hexToSrgb(theme.glow);
    gl.uniform3f(ub.uGlow, glowSrgb[0], glowSrgb[1], glowSrgb[2]);
    gl.uniform2f(ub.uPool, ((pool[0] + 1) / 2) * W, ((pool[1] + 1) / 2) * H);
    gl.uniform4f(ub.uFrame, frameRect.l * dpr, (vh - frameRect.t - frameRect.h) * dpr, frameRect.w * dpr, frameRect.h * dpr);
    // On touchdown the pool flares and a ring runs out across it.
    const ringK = it / 0.9;
    gl.uniform1f(ub.uAmt, theme.glowAmt * appear * (0.35 + 0.65 * e) * (1 + 0.8 * Math.max(0, 1 - it / 0.6)));
    gl.uniform2f(ub.uRing, 0.06 + (1 - Math.pow(1 - clamp(ringK, 0, 1), 3)) * 0.42, ringK < 1 ? Math.pow(1 - ringK, 2) * 0.9 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);

    gl.useProgram(meshProgram);
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
    gl.uniform3f(u.uCam, eye[0], eye[1], eye[2]);
    gl.uniform3fv(u.uCap, theme.cap.flatMap((h) => hexToLinear(h, [0, 0, 0])));
    gl.uniform3f(u.uGlow, glowLin[0], glowLin[1], glowLin[2]);
    gl.uniform1f(u.uCells, atlasCells);
    gl.uniform1f(u.uAmbient, theme.ambient);
    gl.uniform1f(u.uEnvLift, theme.envLift);
    gl.uniform1f(u.uPrint, theme.print);
    gl.uniform1i(u.tLegend, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.enable(gl.DEPTH_TEST);
    // No culling: mid-roll the camera sees the underside of the case and the insides of the caps.
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(caseVao.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, caseVao.count, gl.UNSIGNED_SHORT, 0, 1);
    groups.forEach((g, gi) => {
      gl.bindVertexArray(capVaos[gi].vao);
      pointInstances(instBuf, g.first);
      gl.drawElementsInstanced(gl.TRIANGLES, capVaos[gi].count, gl.UNSIGNED_SHORT, 0, g.count);
    });
    gl.bindVertexArray(null);

    raf = requestAnimationFrame(frame);
  };

  // The labels use the page's fonts: redraw once they've loaded.
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(() => { if (!disposed) { uploadAtlas(); } }); }

  return {
    setTheme(light) { theme = light ? THEMES.light : THEMES.dark; uploadAtlas(); },
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('pointerup', onWindowUp);
      stage.removeEventListener('keydown', onKeyDown);
      stage.removeEventListener('keyup', onKeyUp);
      stage.removeEventListener('blur', onBlur);
      stage.style.cursor = '';
      buffers.forEach((b) => gl.deleteBuffer(b));
      vaos.forEach((v) => gl.deleteVertexArray(v));
      if (atlas) { gl.deleteTexture(atlas); }
      if (bgProgram) { gl.deleteProgram(bgProgram); }
      if (meshProgram) { gl.deleteProgram(meshProgram); }
    }
  };
}

export { hexToLinear };
