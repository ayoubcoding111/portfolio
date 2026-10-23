/* Skills: four brushed-metal layers in three.js, one per part of the stack (Frontend on top, DevOps at the bottom).

   The scroll story in lib/motion.js follows one click through them: the camera dives to each layer in turn while a pulse
   of light carries the request down the stack (the button, an API route, a table row, a server), then the response
   climbs back up and the whole stack lights. Each layer is a slab of dark brushed aluminium with its sketch etched on
   top, laid out so the part the click touches sits dead centre, on the pulse's path. Out of focus the etching sits dim;
   in focus it lights up and the metal takes a sharper shine. This file only draws: everything moves through `state`,
   and after each frame it reports where each layer sits on screen so the DOM (cursor, labels, leader lines) can follow
   it.

   createLayers(stage, canvas, opts) → { state, setFrame(frame), setTheme(light), setReduced(on), reset(), onFrame,
   onHover, destroy() }, or null without WebGL2. */

import * as THREE from 'three';

// ---------------------------------------------------------------- shape and pose

/* Tile size in world units: 4:3 like the sketches, with a rounded edge as thick as the tile. */
const TILE_W = 3.2;
const TILE_D = 2.4;
const TILE_T = 0.16;
const TILE_R = 0.26;
/* The sketch inside the tile, 4:3, centred. */
const ART_W = 1024;
const ART_H = 768;
const ART_PW = 2.72;
const ART_PD = 2.04;
/* Gap between layers, closed and open. */
const GAP_SHUT = TILE_T + 0.035;
const GAP_OPEN = 1.06;
/* The camera looks down at the stack from this elevation (plus state.tilt); the stack turns around its vertical axis. */
const FOV = 28;
const ELEV = 0.46;
const YAW = -0.62;
/* Focus lifts a layer; hover lifts a little more. Layers above the split lift right away, out of the way. */
const LIFT = 0.12;
const HOVER_LIFT = 0.2;
const SPLIT_LIFT = 2.1;
/* Metal roughness: satin out of focus, a sharper shine in focus. The etching's brightness out of focus (in focus: 1). */
const SATIN = 0.42;
const POLISH = 0.28;
const ETCH_DIM = 0.42;
const DPR_MAX = 1.5;

/* The pose with no story running: open, turned, nothing lit.
   rise      the whole stack's height offset, world units
   explode   0 closed … 1 open
   yaw       the stack's turn, radians
   zoom      camera closeness (1 fits the open stack in the frame)
   look      the layer the camera looks at, in layers (0 Frontend … 3 DevOps, 1.5 the middle)
   tilt      added camera elevation, radians
   fx, fy    where that point sits on the canvas, as fractions of its width and height
   reach     how far down the beam of light has travelled, in layers; head: where its bright head is, in layers
   beam      the beam's and head's brightness
   split     the layers above this one (in layers, so it can glide) lift away, like pages turned, to leave it in view
   per layer (0–3): f focus (lights, lifts), h hover, k lit by the request, r its impact ring (0 → 1 plays it once),
   w a rim flash as the response passes */
const REST = { rise: 0, explode: 1, yaw: YAW, zoom: 1, look: 1.5, tilt: 0, fx: 0.5, fy: 0.5, reach: 0, head: 0, beam: 0, split: 0 };
['f', 'h', 'k', 'r', 'w'].forEach((p) => { for (let i = 0; i < 4; i++) { REST[p + i] = 0; } });
const KEYS = Object.keys(REST);

const THEMES = {
  dark: {
    metal: '#3a3f4b', top: '#2c3039', env: 1, under: 0.12, rim: 1.3, hit: 0.7, ring: 1.2, beam: 1, core: '#c9d4ff', pool: 0.012, premul: 0,
    art: { line: '#3c4f8a', faint: '#1c2640', dim: '#8090b4', strong: '#e3e9f6', ink: '#9aa8ff', soft: '#2a3fa8', white: '#ffffff' }
  },
  light: {
    metal: '#d9dde5', top: '#cdd1da', env: 1, under: 0.07, rim: 0.7, hit: 0.45, ring: 0.8, beam: 0.85, core: '#2B45FF', pool: 0.02, premul: 1,
    art: { line: '#8e97b2', faint: '#c4cad8', dim: '#5d6684', strong: '#1E2547', ink: '#2B45FF', soft: '#aab6f2', white: '#ffffff' }
  }
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ---------------------------------------------------------------- geometry

/* A rounded-rectangle tile whose edge is a half-round as thick as the tile, with true normals all the way round, so
   highlights roll smoothly over the edge. Built as a ring of outline points swept through the edge profile, then capped
   top and bottom. */
function tileGeometry() {
  const r = TILE_T / 2;
  const hx = TILE_W / 2 - r;
  const hz = TILE_D / 2 - r;
  const rc = Math.max(TILE_R - r, 0.02);
  const SEG_C = 12;
  const SEG_P = 12;
  const ring = [];
  [[hx - rc, hz - rc, 0], [-(hx - rc), hz - rc, 0.5], [-(hx - rc), -(hz - rc), 1], [hx - rc, -(hz - rc), 1.5]].forEach(([cx, cz, a0]) => {
    for (let s = 0; s <= SEG_C; s++) {
      const a = (a0 + (s / SEG_C) * 0.5) * Math.PI;
      ring.push([cx + Math.cos(a) * rc, cz + Math.sin(a) * rc, Math.cos(a), Math.sin(a)]);
    }
  });
  const n = ring.length;
  const pos = [];
  const nor = [];
  const idx = [];
  for (let j = 0; j <= SEG_P; j++) {
    const phi = Math.PI / 2 - (j / SEG_P) * Math.PI;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    ring.forEach(([x, z, nx, nz]) => {
      pos.push(x + nx * r * c, s * r, z + nz * r * c);
      nor.push(nx * c, s, nz * c);
    });
  }
  for (let j = 0; j < SEG_P; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = j * n + ((i + 1) % n);
      idx.push(a, b, b + n, a, b + n, a + n);
    }
  }
  const band = idx.length;
  [1, -1].forEach((side) => {
    const base = pos.length / 3;
    pos.push(0, side * r, 0);
    nor.push(0, side, 0);
    ring.forEach(([x, z]) => { pos.push(x, side * r, z); nor.push(0, side, 0); });
    for (let i = 0; i < n; i++) { idx.push(base, base + 1 + i, base + 1 + ((i + 1) % n)); }
  });
  // Wind every triangle to face the way its normals point, so the outside is the front.
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const nx = nor[a] + nor[b] + nor[c], ny = nor[a + 1] + nor[b + 1] + nor[c + 1], nz = nor[a + 2] + nor[b + 2] + nor[c + 2];
    if (fx * nx + fy * ny + fz * nz < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  }
  // Texture coordinates straight down from above, so the brushing runs along the tile's length, over the edge too.
  const uv = [];
  for (let k = 0; k < pos.length; k += 3) { uv.push(pos[k] / TILE_W + 0.5, pos[k + 2] / TILE_D + 0.5); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Two materials: the flat top face (group 1) apart from the edge and the underside (group 0).
  g.addGroup(0, band, 0);
  g.addGroup(band, n * 3, 1);
  g.addGroup(band + n * 3, n * 3, 0);
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------- sketches

const MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'Archivo, "Helvetica Neue", Arial, sans-serif';

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const fill = (c, col) => { c.fillStyle = col; c.fill(); };
const stroke = (c, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
const dot = (c, x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fill(c, col); };
const text = (c, s, x, y, font, col, align) => { c.font = font; c.fillStyle = col; c.textAlign = align || 'left'; c.fillText(s, x, y); };
const line = (c, pts, col, w) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); stroke(c, col, w); };

const tag = (c, P, idx, name) => {
  c.letterSpacing = '4px';
  text(c, idx, 64, 82, '500 30px ' + MONO, P.ink);
  text(c, name.toUpperCase(), 132, 82, '500 30px ' + MONO, P.strong);
  c.letterSpacing = '0px';
};

/* One sketch per layer, drawn on a clear canvas and etched onto the metal's top face. Each one
   puts what the click touches at the centre (512, 384), where the pulse passes. */
const SKETCHES = [
  // 01 Frontend: a page in a browser, its call to action in the middle.
  (c, P) => {
    tag(c, P, '01', 'Frontend');
    rr(c, 64, 112, 896, 604, 28); stroke(c, P.line, 4);
    line(c, [[66, 172], [958, 172]], P.line, 4);
    [100, 130, 160].forEach((x) => dot(c, x, 142, 9, P.dim));
    rr(c, 212, 128, 320, 28, 14); fill(c, P.faint);
    rr(c, 112, 208, 112, 20, 10); fill(c, P.dim);
    [700, 776, 852].forEach((x) => { rr(c, x, 211, 60, 14, 7); fill(c, P.faint); });
    rr(c, 232, 252, 560, 46, 14); fill(c, P.strong);
    rr(c, 312, 312, 400, 18, 9); fill(c, P.dim);
    rr(c, 394, 354, 236, 60, 30); fill(c, P.accent);
    text(c, 'Get started', 512, 393, '600 26px ' + SANS, P.white, 'center');
    for (let k = 0; k < 3; k++) {
      const x = 112 + k * 272;
      rr(c, x, 470, 248, 196, 18); stroke(c, P.line, 3);
      rr(c, x + 24, 494, 200, 82, 12); fill(c, P.soft);
      rr(c, x + 24, 596, 150, 16, 8); fill(c, P.dim);
      rr(c, x + 24, 626, 100, 14, 7); fill(c, P.faint);
    }
  },
  // 02 Backend: the API's routes; the order comes in on the middle one.
  (c, P) => {
    tag(c, P, '02', 'Backend');
    [['GET', '/v1/projects', '200'], ['POST', '/v1/orders', '201'], ['PATCH', '/v1/users/:id', '200'], ['WS', '/v1/live', '101']].forEach(([m, p, s], k) => {
      const y = 178 + k * 150;
      rr(c, 64, y, 896, 112, 22); stroke(c, k === 1 ? P.ink : P.line, k === 1 ? 4 : 3);
      rr(c, 94, y + 26, 140, 60, 14); fill(c, P.accent);
      text(c, m, 164, y + 66, '600 27px ' + MONO, P.white, 'center');
      text(c, p, 266, y + 67, '500 32px ' + MONO, P.strong);
      dot(c, 846, y + 56, 8, P.ink);
      text(c, s, 926, y + 67, '500 30px ' + MONO, P.dim, 'right');
    });
  },
  // 03 Databases: the query, and the two tables it joins; their relation crosses the middle.
  (c, P) => {
    tag(c, P, '03', 'Databases');
    rr(c, 64, 116, 896, 84, 20); stroke(c, P.line, 3);
    let x = 94;
    [['select', P.ink], [' * ', P.strong], ['from', P.ink], [' orders ', P.strong], ['where', P.ink], [' user_id = $1', P.strong]].forEach(([w, col]) => {
      text(c, w, x, 168, '500 27px ' + MONO, col);
      x += c.measureText(w).width;
    });
    const table = (tx, name, rows) => {
      const y = 240, w = 380, head = 70, rh = 74;
      rr(c, tx, y, w, head + rows.length * rh, 20); stroke(c, P.line, 3);
      c.beginPath(); c.roundRect(tx + 1.5, y + 1.5, w - 3, head - 1.5, [18.5, 18.5, 0, 0]); fill(c, P.soft);
      text(c, name, tx + 28, y + 46, '500 30px ' + MONO, P.strong);
      rows.forEach(([k, t], j) => {
        const ry = y + head + j * rh;
        line(c, [[tx, ry], [tx + w, ry]], P.line, 2);
        text(c, k, tx + 28, ry + 48, '500 28px ' + MONO, P.strong);
        text(c, t, tx + w - 28, ry + 48, '500 28px ' + MONO, P.dim, 'right');
      });
    };
    table(64, 'users', [['id', 'uuid'], ['email', 'text'], ['role', 'enum']]);
    table(580, 'orders', [['id', 'uuid'], ['user_id', 'fk'], ['total', 'num']]);
    // users.id → orders.user_id
    line(c, [[444, 347], [512, 347], [512, 421], [580, 421]], P.ink, 4);
    dot(c, 444, 347, 8, P.ink);
    dot(c, 580, 421, 8, P.ink);
    rr(c, 64, 572, 436, 92, 20); stroke(c, P.line, 3);
    text(c, 'index', 94, 629, '500 26px ' + MONO, P.dim);
    text(c, 'users.email', 190, 629, '500 28px ' + MONO, P.strong);
    rr(c, 524, 572, 436, 92, 20); stroke(c, P.line, 3);
    text(c, 'cache', 554, 629, '500 26px ' + MONO, P.dim);
    dot(c, 668, 620, 8, P.ink);
    text(c, 'hit', 690, 629, '500 28px ' + MONO, P.strong);
  },
  // 04 DevOps: the pipeline, and the servers it ships to; the middle one answers.
  (c, P) => {
    tag(c, P, '04', 'DevOps');
    ['build', 'test', 'deploy'].forEach((s, k) => {
      const x = 64 + k * 312;
      rr(c, x, 112, 272, 76, 38); stroke(c, P.line, 3);
      dot(c, x + 40, 150, 19, P.accent);
      line(c, [[x + 31, 151], [x + 38, 158], [x + 50, 143]], P.white, 4);
      text(c, s, x + 74, 160, '500 28px ' + MONO, P.strong);
      if (k < 2) { line(c, [[x + 272, 150], [x + 312, 150]], P.line, 3); }
    });
    for (let k = 0; k < 3; k++) {
      const x = 64 + k * 306, y = 250;
      rr(c, x, y, 284, 268, 22); stroke(c, k === 1 ? P.ink : P.line, k === 1 ? 4 : 3);
      dot(c, x + 246, y + 40, 10, P.ink);
      rr(c, x + 28, y + 30, 150, 20, 10); fill(c, P.dim);
      rr(c, x + 28, y + 66, 108, 16, 8); fill(c, P.faint);
      for (let j = 0; j < 3; j++) {
        rr(c, x + 28, y + 120 + j * 44, 228, 22, 11); fill(c, P.faint);
        rr(c, x + 28, y + 120 + j * 44, 60 + ((k * 3 + j) * 47) % 150, 22, 11); fill(c, P.soft);
      }
    }
    line(c, [[64, 600], [960, 600]], P.line, 2);
    text(c, 'deploy', 64, 662, '500 28px ' + MONO, P.dim);
    dot(c, 818, 652, 8, P.ink);
    text(c, 'passing', 960, 662, '500 28px ' + MONO, P.strong, 'right');
  }
];

function drawSketch(canvas, i, P) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, ART_W, ART_H);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.textBaseline = 'alphabetic';
  SKETCHES[i](c, P);
}

// ---------------------------------------------------------------- light

/* A small studio for the metal to reflect: a soft key above and in front, a long strip low in front that draws a bright
   line along each near edge, a wide soft panel overhead and behind that the top faces mirror as a satin sheen, cobalt
   strips behind for the rims, a cool fill on the left. Rendered once into an environment map (again when the theme
   changes). */
function studio(renderer, light, accent) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(light ? '#aeb4c4' : '#06080d'), side: THREE.BackSide })));
  const panel = (w, h, hex, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(7, 3.2, '#ffffff', light ? 2.6 : 4.2, -1.5, 5.2, 3.2);
  panel(10, 0.45, '#ffffff', light ? 2 : 3, 0, 1.2, 5.6);
  panel(9, 5, '#dfe6ff', light ? 1.4 : 0.32, 0, 5.4, -3.6);
  panel(0.7, 7, accent, light ? 3 : 7, 5.4, 0.6, -2.4);
  panel(0.7, 7, accent, light ? 1.5 : 3.5, -5.4, 0.2, -1.6);
  panel(3, 2, '#dfe6ff', 1.3, -5, 1.4, 3.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return rt;
}

/* The brushing: fine streaks along the length, a little rougher or smoother each, used both to vary the roughness and
   as a faint bump, so highlights break up into the grain the way they do on real brushed aluminium. */
function brushedTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(220,220,220)';
  g.fillRect(0, 0, W, H);
  let seed = 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 5200; i++) {
    const v = Math.round(150 + rnd() * 105);
    g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.25 + rnd() * 0.5).toFixed(2) + ')';
    g.lineWidth = 0.6 + rnd() * 1.4;
    const y = rnd() * H;
    const x = rnd() * W * 0.6 - W * 0.1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + W * (0.2 + rnd() * 0.9), y);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/* Every glow here is light added to the scene: in the dark theme it adds; in the light theme it lays on as a tint. */
const glow = (uniforms, vertexShader, body, extra) => new THREE.ShaderMaterial(Object.assign({
  uniforms: Object.assign({ uColor: { value: new THREE.Color() }, uAmt: { value: 0 }, uPremul: { value: 0 } }, uniforms),
  vertexShader,
  fragmentShader: [
    'uniform vec3 uColor; uniform float uAmt; uniform float uPremul;',
    body,
    '  gl_FragColor = vec4(uColor * a, a * uPremul);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n'),
  depthWrite: false,
  toneMapped: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation
}, extra));

const UV_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const VIEW_VERT = [
  'varying vec3 vN; varying vec3 vV;',
  'void main() {',
  '  vec4 wp = modelMatrix * vec4(position, 1.0);',
  '  vN = mat3(modelMatrix) * normal;',
  '  vV = cameraPosition - wp.xyz;',
  '  gl_Position = projectionMatrix * viewMatrix * wp;',
  '}'
].join('\n');

/* A soft pool on a flat plane. */
const poolMaterial = (extra) => glow({}, UV_VERT, [
  'varying vec2 vUv;',
  'void main() {',
  '  float a = uAmt * pow(clamp(1.0 - length((vUv - 0.5) * 2.0), 0.0, 1.0), 2.0);'
].join('\n'), extra);

/* An impact ring that runs out across a layer's surface as uProg goes 0 → 1. */
const ringMaterial = () => glow({ uProg: { value: 0 } }, UV_VERT, [
  'uniform float uProg; varying vec2 vUv;',
  'void main() {',
  '  float d = length((vUv - 0.5) * 2.0);',
  '  float w = 0.03 + 0.1 * uProg;',
  '  float a = uAmt * exp(-pow((d - uProg) / w, 2.0)) * (1.0 - uProg) * step(0.001, uProg);'
].join('\n'), { transparent: true });

/* Light along a layer's edges, strongest where the surface turns away from you: the focused layer's outline. Only the
   rounded edge takes it (where the surface faces sideways); seen low, the flat top would otherwise flood with it. */
const rimMaterial = () => glow({}, VIEW_VERT, [
  'varying vec3 vN; varying vec3 vV;',
  'void main() {',
  '  vec3 n = normalize(vN);',
  '  float a = uAmt * smoothstep(0.62, 0.98, 1.0 - abs(dot(n, normalize(vV)))) * smoothstep(0.08, 0.5, 1.0 - abs(n.y));'
].join('\n'), { transparent: true });

/* What lies on a layer's top face (the etching, the glows, the ring) is pulled toward the camera in depth, so it always
   wins against the face under it instead of flickering where the two meet at a shallow angle. */
const onTop = (m) => { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; return m; };

/* The beam: brightest along the middle, softening toward the silhouette (uPow sets how fast). */
const beamMaterial = (power) => glow({ uPow: { value: power } }, VIEW_VERT, [
  'uniform float uPow; varying vec3 vN; varying vec3 vV;',
  'void main() {',
  '  float a = uAmt * pow(abs(dot(normalize(vN), normalize(vV))), uPow);'
].join('\n'));

/* Dark theme: colour adds up, and so does coverage, so a glow over the empty page is a real, opaque-enough pixel the
   browser composites like any other (pure added light with no coverage is dropped on some compositing paths, which cut
   the beam off between layers). Light theme: an ordinary tint laid over what's below. */
function setBlend(m, light) {
  m.blendSrc = THREE.OneFactor;
  m.blendDst = light ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
  m.blendSrcAlpha = THREE.OneFactor;
  m.blendDstAlpha = light ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
  m.uniforms.uPremul.value = 1;
}

// ---------------------------------------------------------------- engine

export function createLayers(stage, canvas, opts) {
  const o = opts || {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;

  let light = !!o.light;
  let reduced = !!o.reduced;
  let theme = light ? THEMES.light : THEMES.dark;
  const accentHex = o.accent || '#2B45FF';
  const accent = new THREE.Color(accentHex);
  const state = Object.assign({}, REST);
  const scene = new THREE.Scene();
  // The camera never comes within a few units of the stack, so a far-off near plane buys depth precision.
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 100);
  let envRT = null;
  const brush = brushedTexture();

  const poolMat = poolMaterial();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(11, 8), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 5;
  scene.add(pool);

  // The click's path: a beam down the stack's axis, through the middle of every layer, and the bright head that carries
  // the request along it.
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
  const ballGeo = new THREE.SphereGeometry(1, 24, 16);
  const beamMats = [beamMaterial(0.5), beamMaterial(2.5), beamMaterial(0.6), beamMaterial(3)];
  // The white cores of the beam and its head draw after every glow and ring, so none of them tint them where they land
  // on a layer; the metal still hides them wherever a layer stands in front.
  [0, 2].forEach((i) => { beamMats[i].transparent = true; });
  const [core, halo, headCore, headHalo] = [beamGeo, beamGeo, ballGeo, ballGeo].map((g, i) => {
    const m = new THREE.Mesh(g, beamMats[i]);
    m.renderOrder = [100, 12, 101, 12][i];
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });

  const tileGeo = tileGeometry();
  const artGeo = new THREE.PlaneGeometry(ART_PW, ART_PD);
  const underGeo = new THREE.PlaneGeometry(TILE_W * 1.35, TILE_D * 1.45);
  const hitGeo = new THREE.PlaneGeometry(1.05, 0.8);
  const ringGeo = new THREE.PlaneGeometry(2.6, 2.6);
  const proxyGeo = new THREE.BoxGeometry(TILE_W, TILE_T + 0.08, TILE_D);
  const proxyMat = new THREE.MeshBasicMaterial();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const flat = (geo, mat, y, order) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.renderOrder = order;
    return m;
  };

  const tiles = [0, 1, 2, 3].map((i) => {
    const pivot = new THREE.Group();
    const body = new THREE.Group();
    pivot.add(body);
    // Brushed aluminium: fully metallic, its highlights stretched across the grain (anisotropy) and broken up by it.
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(theme.metal), metalness: 1, roughness: SATIN,
      roughnessMap: brush, bumpMap: brush, bumpScale: 0.35,
      anisotropy: 0.75, anisotropyRotation: Math.PI / 2
    });
    // The flat top face: the same brushed grain, but matte, so it mirrors none of the studio's lights.
    const topMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.top), map: brush });
    const artCanvas = document.createElement('canvas');
    artCanvas.width = ART_W;
    artCanvas.height = ART_H;
    const tex = new THREE.CanvasTexture(artCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    // The sketch, etched on the top face: dim out of focus, lit in focus.
    const faceMat = onTop(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: ETCH_DIM, depthWrite: false, toneMapped: false }));
    const face = flat(artGeo, faceMat, TILE_T / 2 + 0.002, 21);
    const underMat = poolMaterial();
    const hitMat = onTop(poolMaterial({ transparent: true }));
    const ringMat = onTop(ringMaterial());
    const rimMat = rimMaterial();
    const rim = new THREE.Mesh(tileGeo, rimMat);
    rim.renderOrder = 20;
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    proxy.visible = false;
    proxy.userData.i = i;
    body.add(
      new THREE.Mesh(tileGeo, [metalMat, topMat]),
      flat(underGeo, underMat, -TILE_T / 2 - 0.07, 10),
      face,
      flat(hitGeo, hitMat, TILE_T / 2 + 0.004, 23),
      flat(ringGeo, ringMat, TILE_T / 2 + 0.006, 25),
      rim,
      proxy
    );
    scene.add(pivot);
    return { pivot, body, metalMat, topMat, faceMat, artCanvas, tex, underMat, hitMat, ringMat, rimMat, proxy };
  });
  const proxies = tiles.map((t) => t.proxy);
  const glows = [poolMat].concat(beamMats, tiles.map((t) => t.underMat), tiles.map((t) => t.hitMat), tiles.map((t) => t.ringMat), tiles.map((t) => t.rimMat));

  const drawSketches = () => {
    const P = Object.assign({ accent: accentHex }, theme.art);
    tiles.forEach((t, i) => { drawSketch(t.artCanvas, i, P); t.tex.needsUpdate = true; });
  };

  const applyTheme = () => {
    theme = light ? THEMES.light : THEMES.dark;
    if (envRT) { envRT.dispose(); }
    envRT = studio(renderer, light, accentHex);
    scene.environment = envRT.texture;
    glows.forEach((m) => { setBlend(m, light); m.uniforms.uColor.value.copy(accent); });
    beamMats[0].uniforms.uColor.value.set(theme.core);
    beamMats[2].uniforms.uColor.value.set(theme.core);
    poolMat.uniforms.uAmt.value = theme.pool;
    tiles.forEach((t) => { t.metalMat.color.set(theme.metal); t.topMat.color.set(theme.top); t.metalMat.envMapIntensity = theme.env; t.ringMat.uniforms.uAmt.value = theme.ring; });
    drawSketches();
  };
  applyTheme();

  // ---- framing: frame is how big the open stack may be at zoom 1, in CSS px (default: most of the canvas)
  let cssW = 0;
  let cssH = 0;
  let frame = null;
  let baseDist = 12;
  const v = new THREE.Vector3();
  const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  const fit = () => {
    if (!cssW || !cssH) { return; }
    const f = frame || { w: cssW * 0.86, h: cssH * 0.86 };
    camera.aspect = cssW / cssH;
    camera.clearViewOffset();
    const D0 = 12;
    camera.position.set(0, Math.sin(ELEV) * D0, Math.cos(ELEV) * D0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 4; i++) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            v.set(sx * TILE_W / 2, sy * TILE_T / 2, sz * TILE_D / 2).applyQuaternion(yawQ);
            v.y += (1.5 - i) * GAP_OPEN;
            v.project(camera);
            x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
            y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
          }
        }
      }
    }
    baseDist = D0 * Math.max(((x1 - x0) / 2) * cssW / Math.max(f.w, 1), ((y1 - y0) / 2) * cssH / Math.max(f.h, 1));
  };

  let sized = false;
  const size = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) { return false; }
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    if (w !== cssW || h !== cssH || renderer.getPixelRatio() !== dpr) {
      cssW = w;
      cssH = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      fit();
    }
    sized = true;
    return true;
  };

  // ---- pose
  const apply = () => {
    const s = state;
    const gap = GAP_SHUT + (GAP_OPEN - GAP_SHUT) * clamp(s.explode, 0, 1.2);
    // A layer's height, including the lift of the layers above the split; between layers (the beam, the camera's aim)
    // it runs straight from one to the next.
    const layerY = (i) => (1.5 - i) * gap + SPLIT_LIFT * clamp(s.split - i, 0, 1);
    const yAt = (layer) => {
      const i = clamp(Math.floor(layer), 0, 3);
      const j = Math.min(i + 1, 3);
      const y = layerY(i);
      return s.rise + y + (layerY(j) - y) * clamp(layer - i, 0, 1) + (layer < 0 ? -layer * gap : 0) - (layer > 3 ? (layer - 3) * gap : 0);
    };
    let fMax = 0;
    for (let i = 0; i < 4; i++) { fMax = Math.max(fMax, clamp(s['f' + i], 0, 1)); }
    tiles.forEach((t, i) => {
      const f = clamp(s['f' + i], 0, 1);
      const h = clamp(s['h' + i], 0, 1);
      t.pivot.position.set(0, yAt(i) + (reduced ? 0 : f * LIFT + h * HOVER_LIFT), 0);
      t.body.rotation.y = s.yaw;
      // In focus the metal takes a sharper shine and its etching lights; a hovered layer goes part of the way.
      const lit = Math.max(f, h * 0.6);
      t.metalMat.roughness = SATIN + (POLISH - SATIN) * lit;
      t.rimMat.uniforms.uAmt.value = theme.rim * Math.min(1.6, f + 0.4 * h + 1.2 * clamp(s['w' + i], 0, 1));
      t.faceMat.opacity = ETCH_DIM + (1 - ETCH_DIM) * lit;
      // The others step back while one is in focus.
      t.faceMat.color.setScalar(1 - 0.45 * fMax * (1 - f));
      t.underMat.uniforms.uAmt.value = theme.under * Math.min(1, 0.25 * h + f);
      // Where the beam passes through a layer it glows as a port; the layer the request has reached glows bright.
      const port = 0.35 * clamp(s.beam, 0, 1) * clamp(s.reach - i + 1, 0, 1);
      t.hitMat.uniforms.uAmt.value = theme.hit * Math.max(clamp(s['k' + i], 0, 1), port);
      t.ringMat.uniforms.uProg.value = clamp(s['r' + i], 0, 1);
    });
    pool.position.set(0, yAt(3) - 0.55, 0);

    // The beam runs from the top layer's middle down through every layer it has reached (the story shoots it through all
    // four at the click); its head travels the same line, marking the chapter.
    const b = clamp(s.beam, 0, 1) * theme.beam;
    const top = yAt(0);
    const bottom = yAt(clamp(s.reach, 0, 3));
    const len = Math.max(top - bottom, 0.0001);
    core.position.set(0, (top + bottom) / 2, 0);
    core.scale.set(0.028, len, 0.028);
    halo.position.copy(core.position);
    halo.scale.set(0.15, len, 0.15);
    const hy = yAt(clamp(s.head, 0, 3));
    headCore.position.set(0, hy, 0);
    headCore.scale.setScalar(0.075);
    headHalo.position.set(0, hy, 0);
    headHalo.scale.setScalar(0.34);
    [1.3, 0.55, 2.4, 1].forEach((k, i) => { beamMats[i].uniforms.uAmt.value = k * b; });
    [core, halo, headCore, headHalo].forEach((m) => { m.visible = b > 0.001; });

    // Camera: closeness, the layer it looks at, its elevation, and where that point sits on the canvas.
    const d = baseDist / Math.max(s.zoom, 0.2);
    const el = ELEV + s.tilt;
    const ly = yAt(s.look);
    camera.position.set(0, ly + Math.sin(el) * d, Math.cos(el) * d);
    camera.lookAt(0, ly, 0);
    camera.setViewOffset(cssW, cssH, cssW * (0.5 - s.fx), cssH * (0.5 - s.fy), cssW, cssH);
    camera.updateMatrixWorld();
  };

  // ---- where each layer sits on screen, in canvas CSS px: its leftmost and rightmost corner (mid-edge) and the middle
  // of its top face, where the click lands
  const corner = 1 - Math.SQRT1_2;
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => new THREE.Vector3(sx * (TILE_W / 2 - TILE_R * corner), 0, sz * (TILE_D / 2 - TILE_R * corner)));
  const mid = new THREE.Vector3(0, TILE_T / 2, 0);
  const pair = () => [[0, 0], [0, 0], [0, 0], [0, 0]];
  const anchors = { left: pair(), right: pair(), center: pair(), w: 0, h: 0 };
  const toPx = (out) => { out[0] = (v.x * 0.5 + 0.5) * cssW; out[1] = (0.5 - v.y * 0.5) * cssH; };
  const locate = () => {
    anchors.w = cssW;
    anchors.h = cssH;
    tiles.forEach((t, i) => {
      let lx = Infinity, ly = 0, rx = -Infinity, ry = 0;
      corners.forEach((c) => {
        v.copy(c).applyMatrix4(t.body.matrixWorld).project(camera);
        const x = (v.x * 0.5 + 0.5) * cssW;
        const y = (0.5 - v.y * 0.5) * cssH;
        if (x < lx) { lx = x; ly = y; }
        if (x > rx) { rx = x; ry = y; }
      });
      anchors.left[i][0] = lx; anchors.left[i][1] = ly;
      anchors.right[i][0] = rx; anchors.right[i][1] = ry;
      v.copy(mid).applyMatrix4(t.body.matrixWorld).project(camera);
      toPx(anchors.center[i]);
    });
  };

  // ---- hover: a ray from the pointer against a plain box per layer
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { inside: false, x: 0, y: 0, moved: false };
  let hovered = -1;
  const pickAt = (x, y) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(proxies, false);
    return hits.length ? hits[0].object.userData.i : -1;
  };
  const pick = () => (pointer.inside ? pickAt(pointer.x, pointer.y) : -1);
  // Touch has no hover, so a tap (a short press that barely moves, not a scroll) stands in for it.
  const tap = { x: 0, y: 0, t: 0 };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { tap.x = e.clientX; tap.y = e.clientY; tap.t = performance.now(); } };
  const onUp = (e) => {
    if (e.pointerType === 'mouse' || !api.onTap) { return; }
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12 || performance.now() - tap.t > 600) { return; }
    api.onTap(pickAt(e.clientX, e.clientY));
  };
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointerup', onUp);
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') { return; }
    pointer.inside = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved = true;
    kick();
  };
  const onLeave = () => { pointer.inside = false; pointer.moved = true; kick(); };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);

  // ---- loop: runs while the stage is near the screen, and only draws when something changed
  let raf = 0;
  let visible = false;
  let disposed = false;
  let dirty = true;
  const last = new Float32Array(KEYS.length).fill(NaN);
  const changed = () => {
    let c = false;
    KEYS.forEach((k, i) => { if (Math.abs(state[k] - last[i]) > 1e-5 || last[i] !== last[i]) { last[i] = state[k]; c = true; } });
    return c;
  };
  const frameLoop = () => {
    raf = 0;
    if (disposed || !visible) { return; }
    if (!sized && !size()) { raf = requestAnimationFrame(frameLoop); return; }
    const moved = changed();
    if (moved || dirty) {
      dirty = false;
      apply();
      renderer.render(scene, camera);
      locate();
      if (api.onFrame) { api.onFrame(anchors); }
    }
    if (moved || pointer.moved) {
      pointer.moved = false;
      const h = pick();
      if (h !== hovered) { hovered = h; if (api.onHover) { api.onHover(h); } }
    }
    raf = requestAnimationFrame(frameLoop);
  };
  const kick = () => { if (!raf && !disposed && visible) { raf = requestAnimationFrame(frameLoop); } };

  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; kick(); }, { rootMargin: '30% 0px' });
  io.observe(stage);
  const ro = new ResizeObserver(() => { sized = false; dirty = true; kick(); });
  ro.observe(canvas);

  // Do the first frame's heavy work early, off screen, while the page loads: compile every shader (the beam's meshes,
  // hidden until the click, are shown for it) and upload every texture. Otherwise the moment the section comes into view
  // stalls while all of that happens.
  const upload = () => { tiles.forEach((t) => renderer.initTexture(t.tex)); renderer.initTexture(brush); };
  const warm = () => {
    if (disposed || !size()) { return; }
    apply();
    const beamParts = [core, halo, headCore, headHalo];
    beamParts.forEach((m) => { m.visible = true; });
    const done = () => {
      if (disposed) { return; }
      beamParts.forEach((m) => { m.visible = false; });
      upload();
      dirty = true;
    };
    Promise.resolve(renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera)).then(done, done);
  };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 200)))(warm);

  // The sketches use the page's fonts: draw them again once those have loaded (and upload them ahead of time again).
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 30px "Geist Mono"'), document.fonts.load('600 26px Archivo')])
      .then(() => { if (!disposed) { drawSketches(); upload(); dirty = true; kick(); } })
      .catch(() => {});
  }

  const api = {
    state,
    onFrame: null,
    onHover: null,
    onTap: null,
    setFrame(f) { frame = f || null; fit(); dirty = true; kick(); },
    setTheme(isLight) { if (!!isLight === light) { return; } light = !!isLight; applyTheme(); dirty = true; kick(); },
    setReduced(on) { reduced = !!on; dirty = true; kick(); },
    reset() { Object.assign(state, REST); frame = null; fit(); dirty = true; kick(); },
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
      tiles.forEach((t) => { t.metalMat.dispose(); t.topMat.dispose(); t.faceMat.dispose(); t.tex.dispose(); });
      glows.forEach((m) => m.dispose());
      [tileGeo, artGeo, underGeo, hitGeo, ringGeo, proxyGeo, beamGeo, ballGeo, pool.geometry].forEach((g) => g.dispose());
      proxyMat.dispose();
      brush.dispose();
      if (envRT) { envRT.dispose(); }
      renderer.dispose();
    }
  };
  return api;
}
