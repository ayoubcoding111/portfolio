import { pfClamp, pfRgb, pfPersp, pfLookAt } from './util.js';

export function pfField(canvas, cfg) {
  var gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl || (gl.isContextLost && gl.isContextLost())) { return null; }

  var VS = [
    'precision highp float;',
    'attribute vec2 aGrid;',
    'attribute float aSeed;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'uniform float uTime;',
    'uniform float uIntro;',
    'uniform float uDpr;',
    'uniform float uSize;',
    'uniform vec3 uMouse;',
    'uniform vec4 uRip[4];',
    'uniform float uScan;',
    'varying float vHeat;',
    'varying float vAlpha;',
    'float waves(vec2 p, float t) {',
    '  float h = sin(p.x * 0.32 + t * 0.55) * 0.34;',
    '  h += sin(p.y * 0.26 - t * 0.45 + p.x * 0.11) * 0.46;',
    '  h += sin((p.x + p.y) * 0.57 + t * 0.85) * 0.12;',
    '  h += sin(p.x * 0.9 - p.y * 0.7 + t * 1.3) * 0.05;',
    '  return h;',
    '}',
    'void main() {',
    '  vec2 p = aGrid;',
    '  float t = uTime;',
    '  float h = waves(p, t);',
    '  float d = distance(p, uMouse.xy);',
    '  float bump = exp(-d * d * 0.09) * 1.3 * uMouse.z;',
    '  float ring = sin(d * 1.5 - t * 3.0) * exp(-d * 0.22) * 0.22 * uMouse.z;',
    '  float rip = 0.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    vec4 r = uRip[i];',
    '    float age = t - r.z;',
    '    if (r.w > 0.0 && age > 0.0 && age < 3.5) {',
    '      float k = distance(p, r.xy) - age * 8.0;',
    '      rip += exp(-k * k * 0.5) * (1.0 - age / 3.5) * r.w;',
    '    }',
    '  }',
    '  float y = (h + bump + ring + rip * 0.85) * uIntro;',
    '  vec4 view = uView * vec4(p.x, y, p.y, 1.0);',
    '  gl_Position = uProj * view;',
    '  float depth = max(-view.z, 0.1);',
    '  float sd = p.y - uScan;',
    '  float scan = exp(-sd * sd * 0.35);',
    '  vHeat = clamp(bump * 0.8 + rip * 0.9 + max(h, 0.0) * 0.22 + scan * 0.35 + aSeed * 0.08, 0.0, 1.0);',
    '  float fog = 1.0 - smoothstep(9.0, 60.0, depth);',
    '  vAlpha = (0.24 + 0.76 * fog) * uIntro * (0.7 + 0.3 * aSeed);',
    '  gl_PointSize = uSize * uDpr * (1.0 + bump * 0.8 + rip * 0.6) * (16.0 / depth);',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform vec3 uColA;',
    'uniform vec3 uColB;',
    'uniform float uGain;',
    'varying float vHeat;',
    'varying float vAlpha;',
    'void main() {',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float a = 1.0 - smoothstep(0.05, 0.5, r);',
    '  vec3 col = mix(uColA, uColB, vHeat);',
    '  float al = a * vAlpha * (0.58 + 0.42 * vHeat) * uGain;',
    '  gl_FragColor = vec4(col * al, al);',
    '}'
  ].join('\n');

  var low = !!cfg.coarse;
  var step = low ? 0.62 : 0.42;
  // Phones are 3x screens; below 2x the dots turn to mush as the hero zoom flies the camera in.
  var dprCap = 2;
  var prog = null, gridBuf = null, seedBuf = null, loc = {}, count = 0;
  var light = !!cfg.light, accent = [0.169, 0.271, 1];
  var proj = new Float32Array(16), view = new Float32Array(16);
  var FOV = 50 * Math.PI / 180;
  var cam = { e: [0, 3, 10.5], t: [0, -0.3, -12] };
  var S = { w: 0, h: 0, dpr: 1, dirty: true, time: Math.random() * 30, intro: 1, opacity: 1, hero: 0,
    px: 0, py: 0, tpx: 0, tpy: 0, mx: 0, mz: -8, tmx: 0, tmz: -8, ms: 0, tms: 0, lastMove: 0, speed: cfg.reduced ? 0 : 1 };
  var rip = new Float32Array(16), ripN = 0, lastAuto = 0;
  var raf = 0, running = false, visible = true, lost = false, dead = false, last = 0, ro = null;

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { var m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('shader: ' + m); }
    return s;
  }

  function setup() {
    var v = shader(gl.VERTEX_SHADER, VS), f = shader(gl.FRAGMENT_SHADER, FS);
    prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { throw new Error('link: ' + gl.getProgramInfoLog(prog)); }
    gl.useProgram(prog);
    ['uProj', 'uView', 'uTime', 'uIntro', 'uDpr', 'uSize', 'uMouse', 'uRip', 'uScan', 'uColA', 'uColB', 'uGain'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    var aGrid = gl.getAttribLocation(prog, 'aGrid'), aSeed = gl.getAttribLocation(prog, 'aSeed');
    var minX = -27, maxX = 27, minZ = -60, maxZ = 7;
    var cols = Math.floor((maxX - minX) / step) + 1, rows = Math.floor((maxZ - minZ) / step) + 1;
    count = cols * rows;
    var grid = new Float32Array(count * 2), seeds = new Float32Array(count), k = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        grid[k * 2] = minX + c * step + (Math.random() - 0.5) * step * 0.35;
        grid[k * 2 + 1] = minZ + r * step + (Math.random() - 0.5) * step * 0.35;
        seeds[k] = Math.random();
        k++;
      }
    }
    gridBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aGrid);
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0);
    seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    applyColors();
  }

  function applyColors() {
    if (!prog) { return; }
    var c = accent, a, b;
    if (light) {
      a = [c[0] * 0.8 + 0.16, c[1] * 0.8 + 0.16, c[2] * 0.8 + 0.16];
      b = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.62];
    } else {
      a = [c[0] * 0.82, c[1] * 0.85, Math.min(1, c[2] * 0.98)];
      b = [c[0] + (1 - c[0]) * 0.74, c[1] + (1 - c[1]) * 0.74, c[2] + (1 - c[2]) * 0.74];
    }
    gl.useProgram(prog);
    gl.uniform3fv(loc.uColA, a);
    gl.uniform3fv(loc.uColB, b);
    gl.uniform1f(loc.uGain, light ? 0.9 : 1);
    if (light) { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); } else { gl.blendFunc(gl.ONE, gl.ONE); }
  }

  function resize() {
    var cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    if (!S.dirty && cw === S.w && ch === S.h && dpr === S.dpr) { return; }
    S.dirty = false; S.w = cw; S.h = ch; S.dpr = dpr;
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));
    pfPersp(proj, FOV, cw / ch, 0.1, 200);
  }

  function camera() {
    var h = S.hero;
    var ey = 3.0 - 1.0 * h, ez = 10.5 - 4.5 * h, ty = -0.3 - 0.5 * h, tz = -12;
    cam.e[0] = S.px * 0.9; cam.e[1] = ey + S.py * 0.45; cam.e[2] = ez;
    cam.t[0] = S.px * 0.3; cam.t[1] = ty; cam.t[2] = tz;
    pfLookAt(view, cam.e, cam.t);
  }

  /* Cast a ray from the camera through the pointer onto the y = 0 plane. */
  function ray(nx, ny) {
    var th = Math.tan(FOV / 2), asp = (S.w || 1) / (S.h || 1);
    var dx = -view[2] + view[0] * nx * th * asp + view[1] * ny * th;
    var dy = -view[6] + view[4] * nx * th * asp + view[5] * ny * th;
    var dz = -view[10] + view[8] * nx * th * asp + view[9] * ny * th;
    if (dy > -0.01) { return null; }
    var t = -cam.e[1] / dy;
    return [cam.e[0] + dx * t, pfClamp(cam.e[2] + dz * t, -60, 7)];
  }

  function toNdc(cx, cy) {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) { return null; }
    return [((cx - r.left) / r.width) * 2 - 1, 1 - ((cy - r.top) / r.height) * 2];
  }

  function pointer(cx, cy) {
    if (dead || S.speed === 0) { return; }
    var n = toNdc(cx, cy);
    if (!n) { return; }
    if (n[0] < -1 || n[0] > 1 || n[1] < -1 || n[1] > 1) { S.tms = 0; return; }
    S.tpx = n[0]; S.tpy = n[1];
    var hit = ray(n[0], n[1]);
    if (hit) { S.tmx = hit[0]; S.tmz = hit[1]; S.tms = 1; S.lastMove = performance.now(); }
    else { S.tms = 0; }
  }

  function addRipple(x, z, s) {
    var i = (ripN++ % 4) * 4;
    rip[i] = x; rip[i + 1] = z; rip[i + 2] = S.time; rip[i + 3] = s;
  }

  function pulse(cx, cy) {
    if (dead || S.speed === 0 || !running) { return; }
    var n = toNdc(cx, cy);
    if (!n || n[0] < -1 || n[0] > 1 || n[1] < -1 || n[1] > 1) { return; }
    var hit = ray(n[0], n[1]);
    if (hit) { addRipple(hit[0], hit[1], 1); }
  }

  function draw() {
    if (lost || dead || !prog) { return; }
    resize();
    camera();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniformMatrix4fv(loc.uView, false, view);
    gl.uniform1f(loc.uTime, S.time);
    gl.uniform1f(loc.uIntro, S.intro);
    gl.uniform1f(loc.uDpr, S.dpr);
    gl.uniform1f(loc.uSize, low ? 3.0 : 2.4);
    gl.uniform3f(loc.uMouse, S.mx, S.mz, S.ms);
    gl.uniform4fv(loc.uRip, rip);
    gl.uniform1f(loc.uScan, -64 + ((S.time * 9) % 96));
    gl.drawArrays(gl.POINTS, 0, count);
  }

  function frame(now) {
    raf = 0;
    if (!running) { return; }
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    S.time += dt * S.speed;
    var k = 1 - Math.exp(-dt * 4);
    S.px += (S.tpx - S.px) * k * 0.7; S.py += (S.tpy - S.py) * k * 0.7;
    S.mx += (S.tmx - S.mx) * k * 1.4; S.mz += (S.tmz - S.mz) * k * 1.4;
    var want = (S.tms && now - S.lastMove < 2800) ? 1 : 0;
    S.ms += (want - S.ms) * (1 - Math.exp(-dt * 2.2));
    if (S.time - lastAuto > 4.2) { lastAuto = S.time; addRipple((Math.random() - 0.5) * 22, -6 - Math.random() * 26, 0.55); }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var should = visible && !document.hidden && !lost && !dead;
    if (should && !running) {
      if (S.speed === 0) { draw(); return; }
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      if (raf) { cancelAnimationFrame(raf); }
      raf = 0;
    }
  }

  function onLost(e) { e.preventDefault(); lost = true; canvas.style.visibility = 'hidden'; update(); }
  function onRestored() {
    lost = false;
    try { setup(); S.dirty = true; } catch (err) { return; }
    canvas.style.visibility = '';
    update();
  }

  try { setup(); } catch (e) { return null; }
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  document.addEventListener('visibilitychange', update, false);
  if (window.ResizeObserver) { ro = new ResizeObserver(function () { S.dirty = true; if (!running) { draw(); } }); ro.observe(canvas); }

  return {
    start: function () { visible = true; update(); },
    setOpacity: function (o) {
      o = pfClamp(o, 0, 1);
      if (Math.abs(o - S.opacity) > 0.002 || o === 0 || o === 1) { S.opacity = o; canvas.style.opacity = o === 1 ? '' : o.toFixed(3); }
      var v = o > 0.004;
      if (v !== visible) { visible = v; update(); }
    },
    setIntro: function (v) { S.intro = v; if (!running) { draw(); } },
    setHeroScroll: function (v) { S.hero = v; },
    setLive: function (on) {
      S.speed = on ? 1 : 0;
      if (!on && running) { running = false; if (raf) { cancelAnimationFrame(raf); } raf = 0; }
      update();
      if (!running) { draw(); }
    },
    setAccent: function (hex) { accent = pfRgb(hex); applyColors(); if (!running) { draw(); } },
    setTheme: function (isLight) { light = !!isLight; applyColors(); if (!running) { draw(); } },
    pointer: pointer,
    pulse: pulse,
    out: function () { S.tms = 0; },
    destroy: function () {
      dead = true; running = false;
      if (raf) { cancelAnimationFrame(raf); }
      raf = 0;
      canvas.removeEventListener('webglcontextlost', onLost, false);
      canvas.removeEventListener('webglcontextrestored', onRestored, false);
      document.removeEventListener('visibilitychange', update, false);
      if (ro) { ro.disconnect(); }
      try { if (gridBuf) { gl.deleteBuffer(gridBuf); } if (seedBuf) { gl.deleteBuffer(seedBuf); } if (prog) { gl.deleteProgram(prog); } } catch (e) {}
      try { gl.clear(gl.COLOR_BUFFER_BIT); } catch (e) {}
      canvas.style.opacity = '';
    }
  };
}

