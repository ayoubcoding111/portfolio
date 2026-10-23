export function pfClamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

export function pfRgb(hex) {
  var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) { return [0.169, 0.271, 1]; }
  var s = m[1];
  if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
  var n = parseInt(s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function pfPersp(out, fovy, aspect, near, far) {
  var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  for (var i = 0; i < 16; i++) { out[i] = 0; }
  out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
}

export function pfLookAt(out, e, t) {
  var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
  var l = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1; zx /= l; zy /= l; zz /= l;
  var xx = zz, xy = 0, xz = -zx;
  l = Math.sqrt(xx * xx + xz * xz) || 1; xx /= l; xz /= l;
  var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
  out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
  out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
  out[15] = 1;
}
