/* Lantern Duet — original, resolution-independent canvas artwork.
 * The renderer is intentionally read-only: no game state is changed here.
 */

export const BIOME_PALETTES = [
  { name: '星潮小港', sky: '#091f35', sea: '#123b50', deep: '#082e43', land: '#446b68', top: '#628782', edge: '#274e55', leaf: '#82bbaa', flower: '#ffe0a1', accent: '#f6c778', mist: '#7395ad' },
  { name: '月苔花園', sky: '#10283b', sea: '#1c4554', deep: '#113444', land: '#41685e', top: '#638570', edge: '#284d48', leaf: '#a0cda4', flower: '#f8d3e8', accent: '#dfdf9b', mist: '#86a7b1' },
  { name: '琥珀工坊', sky: '#252738', sea: '#364b57', deep: '#273c4c', land: '#766754', top: '#9b8463', edge: '#514b48', leaf: '#adbb83', flower: '#f8cd8e', accent: '#ffba68', mist: '#a29caa' },
  { name: '雨聲溫室', sky: '#0a2c38', sea: '#174d5c', deep: '#0c3a4a', land: '#386b65', top: '#518a7b', edge: '#234f53', leaf: '#84cbb3', flower: '#c4d6fd', accent: '#9adbc9', mist: '#88b6bb' },
  { name: '暮紫鐘塔', sky: '#242440', sea: '#343d63', deep: '#242e51', land: '#615f78', top: '#858096', edge: '#42495f', leaf: '#aaa8cc', flower: '#f7c6dd', accent: '#e9c2fa', mist: '#989bbf' },
  { name: '珊瑚天橋', sky: '#27303f', sea: '#34525e', deep: '#263d50', land: '#796765', top: '#a18377', edge: '#534e52', leaf: '#d8b998', flower: '#ffbeb1', accent: '#ffc493', mist: '#b2a2a9' },
  { name: '星根之心', sky: '#182839', sea: '#214252', deep: '#132e43', land: '#4a6865', top: '#71877a', edge: '#324f54', leaf: '#bed3a1', flower: '#f6e7b3', accent: '#f9db92', mist: '#88a7ad' },
  { name: '曙光之岸', sky: '#384759', sea: '#52777d', deep: '#365966', land: '#72847a', top: '#9aaa87', edge: '#4e6867', leaf: '#d2df9d', flower: '#fff0c0', accent: '#ffdf94', mist: '#d3c7ba' },
];

const TAU = Math.PI * 2;
const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif';
const GOLD = '#ffd788';
const ROOT = '#9ce8c5';
const hash = (x, y = 0) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return n - Math.floor(n); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function path(ctx, points, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function ellipse(ctx, x, y, rx, ry, fill, rotation = 0, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rotation, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function line(ctx, points, color, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}

function rounded(ctx, x, y, w, h, radius, fill, stroke, lineWidth = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function glow(ctx, x, y, radius, color, alpha = .3) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}

function text(ctx, str, x, y, size, color, weight = 500, align = 'center') {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y);
}

function star(ctx, x, y, size, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  path(ctx, [[x, y - size], [x + size * .24, y - size * .24], [x + size, y], [x + size * .24, y + size * .24], [x, y + size], [x - size * .24, y + size * .24], [x - size, y], [x - size * .24, y - size * .24]], color);
  ctx.restore();
}

function leaf(ctx, x, y, size, angle, color, vein = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-size * .65, -size * .4, -size * .3, -size * 1.18, 0, -size * 1.4); ctx.bezierCurveTo(size * .72, -size * .75, size * .57, -size * .2, 0, 0); ctx.fillStyle = color; ctx.fill();
  if (vein) line(ctx, [[0, -.1 * size], [0, -size * 1.04]], 'rgba(233,255,233,.25)', Math.max(.6, size * .045));
  ctx.restore();
}

function cloud(ctx, x, y, scale, color, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-64, 8); ctx.bezierCurveTo(-79, -1, -58, -13, -43, -11); ctx.bezierCurveTo(-45, -30, -13, -41, 1, -24); ctx.bezierCurveTo(22, -32, 40, -18, 42, -10); ctx.bezierCurveTo(72, -15, 91, 8, 64, 11); ctx.bezierCurveTo(28, 14, -30, 16, -64, 8); ctx.fill();
  ctx.restore();
}

function distantIsland(ctx, x, y, size, palette, variant = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.globalAlpha *= .78;
  ellipse(ctx, 0, 24, 84, 8, 'rgba(1,15,29,.22)');
  path(ctx, [[-60, 0], [-44, 24], [-15, 36], [7, 27], [38, 30], [67, 2]], palette.edge);
  ellipse(ctx, 0, 0, 66, 16, palette.land);
  if (variant % 2 === 0) {
    line(ctx, [[9, -5], [6, -52], [0, -70]], palette.edge, 11);
    line(ctx, [[5, -34], [-15, -49], [-23, -61]], palette.edge, 5);
    for (let i = 0; i < 8; i++) ellipse(ctx, (hash(i, variant) - .5) * 69, -60 - hash(i + 11, variant) * 30, 20 + hash(i + 31) * 10, 12, palette.leaf, -.15);
  } else {
    rounded(ctx, -28, -34, 35, 35, 4, palette.top);
    path(ctx, [[-34, -31], [-12, -49], [11, -31]], palette.edge);
    rounded(ctx, -16, -22, 11, 15, 5, palette.accent);
    line(ctx, [[29, 0], [29, -54]], palette.edge, 5);
    ellipse(ctx, 29, -56, 7, 12, palette.accent);
  }
  line(ctx, [[-45, 12], [-20, 17], [10, 15], [44, 9]], 'rgba(193,228,220,.1)', 2);
  ctx.restore();
}

function seaBackground(ctx, w, h, p, time, reduced, title = false) {
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, p.sky); sky.addColorStop(.45, p.deep); sky.addColorStop(1, p.sea); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const t = reduced ? 0 : time;
  glow(ctx, w * .73, h * .05, h * .5, p.mist, .095);
  const moonX = title ? w * .73 : w - 84, moonY = title ? h * .2 : 63;
  glow(ctx, moonX, moonY, 90, p.accent, .085);
  ellipse(ctx, moonX, moonY, title ? 32 : 19, title ? 32 : 19, p.accent);
  ellipse(ctx, moonX - (title ? 12 : 8), moonY - (title ? 10 : 6), title ? 31 : 18, title ? 31 : 18, p.sky);
  for (let i = 0; i < 42; i++) {
    const x = hash(i, 17) * w, y = hash(i, 29) * h * .47;
    star(ctx, x, y, i % 8 === 0 ? 2.8 : 1.2, '#e7ebd4', .12 + hash(i, 8) * .27 + Math.sin(t * .6 + i) * .055);
  }
  for (let i = 0; i < 6; i++) {
    const drift = Math.sin(t * .06 + i) * (reduced ? 0 : 11);
    cloud(ctx, hash(i, 21) * w + drift, 31 + hash(i, 31) * 95, .5 + hash(i, 41), p.mist, .035 + hash(i, 10) * .025);
  }
  distantIsland(ctx, w * .045, h * .42, title ? .8 : .58, p, 1);
  distantIsland(ctx, w * .95, h * .3, title ? .95 : .5, p, 0);
  if (title) distantIsland(ctx, w * .8, h * .59, .65, p, 3);
  // Slowly moving tide contours. They remain behind the land and never obscure play.
  for (let row = 0; row < 16; row++) {
    const y = h * .22 + row * h * .055;
    ctx.beginPath(); ctx.moveTo(-10, y);
    for (let x = 0; x <= w + 20; x += 24) ctx.lineTo(x, y + Math.sin(x / 92 + row * .7 + t * .2) * (4 + row * .15));
    ctx.strokeStyle = row % 3 ? 'rgba(141,205,207,.038)' : 'rgba(173,220,209,.075)'; ctx.lineWidth = 1.1; ctx.stroke();
  }
  for (let i = 0; i < 32; i++) {
    const x = hash(i, 71) * w, y = h * .26 + hash(i, 81) * h * .7;
    const wave = Math.sin(t * .65 + i * 4);
    line(ctx, [[x - 7, y + wave * 2], [x + 7 + hash(i) * 15, y + wave * 2]], 'rgba(175,220,208,.10)', 1.25);
  }
  // Fine corner branches give the canvas an illustrated frame without hiding tiles.
  for (const flip of [-1, 1]) {
    ctx.save(); ctx.translate(flip < 0 ? 15 : w - 15, h + 18); ctx.scale(flip < 0 ? 1 : -1, 1);
    line(ctx, [[0, 0], [8, -34], [5, -65], [20, -93], [18, -132]], p.edge, 4);
    for (let i = 0; i < 7; i++) leaf(ctx, 5 + i * 2, -23 - i * 15, 20 - i, (i % 2 ? 1 : -1) * .9 + Math.sin(t + i) * .025, i % 2 ? p.land : p.top);
    ctx.restore();
  }
}

function lighthouse(ctx, x, y, s, p, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  glow(ctx, 0, -48, 95, GOLD, .22);
  path(ctx, [[-19, 6], [-14, -43], [14, -43], [19, 6]], '#7a9290', '#233e47', 2);
  path(ctx, [[-13, -42], [-12, -61], [12, -61], [13, -42]], '#ebcf96', '#314b51', 2);
  path(ctx, [[-20, -60], [0, -75], [20, -60]], '#3b6470', '#233e47', 2);
  line(ctx, [[-17, -39], [17, -39]], '#bed3bd', 4);
  line(ctx, [[0, -61], [0, -43]], '#5c675d', 3);
  rounded(ctx, -5, -13, 10, 19, [6, 6, 0, 0], '#304d55');
  ellipse(ctx, 0, -50, 5, 8, '#fff3bb');
  const spread = Math.sin(t * .23) * .14;
  ctx.save(); ctx.translate(0, -50); ctx.rotate(spread); const beam = ctx.createLinearGradient(0, 0, 190, 0); beam.addColorStop(0, 'rgba(255,228,145,.11)'); beam.addColorStop(1, 'rgba(255,228,145,0)'); path(ctx, [[0, 0], [190, -49], [190, 30]], beam); ctx.restore();
  ctx.restore();
}

function lightMark(ctx, x, y, r, color = GOLD) {
  ellipse(ctx, x, y, r * .32, r * .43, color);
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    line(ctx, [[x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62], [x + Math.cos(a) * r * .85, y + Math.sin(a) * r * .85]], color, Math.max(1, r * .09));
  }
}

function rootMark(ctx, x, y, r, color = ROOT) {
  line(ctx, [[x, y + r * .7], [x, y - r * .4]], color, Math.max(1.4, r * .13));
  leaf(ctx, x, y - r * .05, r * .63, -.9, color);
  leaf(ctx, x, y - r * .22, r * .6, .83, color);
  line(ctx, [[x, y + r * .28], [x - r * .4, y + r * .7]], color, Math.max(1.2, r * .11));
  line(ctx, [[x, y + r * .35], [x + r * .35, y + r * .73]], color, Math.max(1.2, r * .11));
}

function tinyFlower(ctx, x, y, r, p, t = 0) {
  line(ctx, [[x, y], [x + Math.sin(t) * 1.5, y - r * 2.5]], p.leaf, .9);
  const xx = x + Math.sin(t) * 1.5, yy = y - r * 2.5;
  for (let i = 0; i < 5; i++) ellipse(ctx, xx + Math.cos(i * TAU / 5) * r * .55, yy + Math.sin(i * TAU / 5) * r * .55, r * .57, r * .43, p.flower, i * TAU / 5);
  ellipse(ctx, xx, yy, r * .35, r * .35, GOLD);
}

function plant(ctx, x, y, s, p, seed, t) {
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < 4; i++) leaf(ctx, (i - 1.5) * s * .065, 0, s * (.12 + hash(seed, i) * .14), (i - 1.5) * .53 + Math.sin(t * .7 + seed) * .028, i % 2 ? p.leaf : p.top);
  if (seed % 3 === 0) tinyFlower(ctx, 0, 1, s * .035, p, t * .7 + seed);
  ctx.restore();
}

function floorTile(ctx, x, y, s, p, gx, gy, edges) {
  const noise = hash(gx, gy);
  if (edges.bottom) {
    rounded(ctx, x + 1, y + s * .7, s - 2, s * .53, 4, p.edge);
    line(ctx, [[x + s * .18, y + s * 1.06], [x + s * .34, y + s * 1.09]], 'rgba(6,30,42,.28)', 2);
    if (noise > .5) line(ctx, [[x + s * .69, y + s], [x + s * .74, y + s * 1.15]], 'rgba(6,30,42,.32)', 1);
  }
  if (edges.right) rounded(ctx, x + s * .75, y + s * .18, s * .25, s, 3, p.edge);
  const corners = [edges.top && edges.left ? s * .13 : 1, edges.top && edges.right ? s * .13 : 1, edges.bottom && edges.right ? s * .13 : 1, edges.bottom && edges.left ? s * .13 : 1];
  rounded(ctx, x + .3, y + .3, s - .6, s - .6, corners, p.land);
  ctx.save(); ctx.globalAlpha = .12 + noise * .07; rounded(ctx, x + 2.8, y + 2.7, s - 5.6, s - 6, 5, p.top); ctx.restore();
  if (edges.top) line(ctx, [[x + s * .13, y + 1.6], [x + s * .87, y + 1.6]], p.top, 2.8);
  if (edges.left) line(ctx, [[x + 1.6, y + s * .18], [x + 1.6, y + s * .82]], p.top, 1.5);
  // The offset mortar is also a gentle grid hint for shared-keyboard movement.
  line(ctx, [[x + 6, y + s - 1], [x + s - 6, y + s - 1]], 'rgba(6,30,36,.18)', 1);
  line(ctx, [[x + s - 1, y + 7], [x + s - 1, y + s - 7]], 'rgba(6,30,36,.12)', 1);
  ellipse(ctx, x + s * (.24 + noise * .42), y + s * .32, 1.1, .65, 'rgba(213,231,207,.23)');
  if (noise > .83) line(ctx, [[x + s * .18, y + s * .69], [x + s * .29, y + s * .66], [x + s * .33, y + s * .59]], 'rgba(10,42,45,.20)', 1);
}

function wallTile(ctx, x, y, s, p, gx, gy, t) {
  ellipse(ctx, x + s * .52, y + s * .76, s * .48, s * .22, 'rgba(3,19,30,.28)');
  const n = hash(gx, gy);
  rounded(ctx, x + 3, y + s * .06, s - 6, s * .85, 6, p.edge, 'rgba(10,28,37,.25)', 1);
  rounded(ctx, x + 3, y - s * .09, s - 6, s * .75, 6, p.top);
  rounded(ctx, x + 7, y - s * .04, s - 14, s * .63, 4, p.land);
  line(ctx, [[x + 8, y + s * .04], [x + s * .39, y + s * .02], [x + s * .75, y + s * .045]], 'rgba(221,235,208,.20)', 1.4);
  if (n > .3) line(ctx, [[x + s * .65, y - 2], [x + s * .59, y + s * .12], [x + s * .69, y + s * .24]], 'rgba(13,37,40,.22)', 1.25);
  if (n > .56) plant(ctx, x + s * .6, y + s * .27, s * .95, p, gx * 17 + gy, t);
  if (n < .2) {
    line(ctx, [[x + 5, y + s * .62], [x + 11, y + s * .75], [x + 12, y + s * 1.01]], p.leaf, 1.6);
    leaf(ctx, x + 11, y + s * .83, 6, 1.1, p.leaf);
  }
}

function hazardTile(ctx, x, y, s, t) {
  ellipse(ctx, x + s / 2, y + s / 2, s * .4, s * .34, '#293544');
  ellipse(ctx, x + s / 2, y + s / 2, s * .3, s * .23, '#1b2939');
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6;
    const xx = x + s / 2 + Math.cos(a) * s * .29, yy = y + s / 2 + Math.sin(a) * s * .23;
    path(ctx, [[xx - 5, yy + 3], [xx + Math.cos(a) * s * .09, yy - s * (.12 + .015 * Math.sin(t + i))], [xx + 5, yy + 3]], '#b184ad', '#644e77', 1);
  }
  text(ctx, '×', x + s / 2, y + s * .49, s * .3, '#dfb2cf', 500);
}

function streamTile(ctx, x, y, s, p, t, kind = 'water') {
  const color = kind === 'light' ? GOLD : kind === 'root' ? ROOT : '#82c0cc';
  ctx.save(); ctx.globalAlpha = kind === 'water' ? .16 : .32;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + 7, y + 13 + i * 10);
    ctx.bezierCurveTo(x + s * .3, y + 9 + i * 10 + Math.sin(t + i) * 1.5, x + s * .61, y + 17 + i * 10, x + s - 7, y + 12 + i * 10); ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();
  if (kind !== 'water') { ctx.save(); ctx.globalAlpha = .6; (kind === 'light' ? lightMark : rootMark)(ctx, x + s / 2, y + s / 2, s * .18, color); ctx.restore(); }
}

function plate(ctx, x, y, s, type, active, p) {
  const color = type === 'light' ? GOLD : type === 'root' ? ROOT : '#d3c1ec';
  ellipse(ctx, x, y + 3, s * .34, s * .27, p.edge, 0, 'rgba(2,22,34,.4)');
  ellipse(ctx, x, y - (active ? 0 : 3), s * .32, s * .26, active ? color : '#536e70', 0, active ? '#e8f4d7' : '#829f94');
  ellipse(ctx, x, y - (active ? 0 : 3), s * .22, s * .17, active ? 'rgba(33,77,71,.45)' : '#354f57', 0, color);
  if (active) glow(ctx, x, y, s * .7, color, .16);
  if (type === 'light') lightMark(ctx, x, y - (active ? 0 : 3), s * .16, color);
  else if (type === 'root') rootMark(ctx, x, y - (active ? 0 : 3), s * .16, color);
  else { rounded(ctx, x - s * .075, y - s * .075 - (active ? 0 : 3), s * .15, s * .15, 2, color); }
}

function gate(ctx, x, y, s, type, open, p, t) {
  const c = type === 'root' ? ROOT : GOLD;
  if (open) {
    rounded(ctx, x - s * .4, y - s * .32, s * .8, s * .62, 6, 'rgba(10,37,43,.12)', c, 1);
    for (let i = -1; i <= 1; i += 2) { rounded(ctx, x + i * s * .36 - s * .05, y - s * .24, s * .1, s * .46, 3, p.edge); ellipse(ctx, x + i * s * .36, y - s * .27, s * .045, s * .045, c); }
    text(ctx, '✓', x, y, s * .26, c, 600);
    return;
  }
  ellipse(ctx, x, y + s * .31, s * .42, s * .15, 'rgba(3,19,30,.25)');
  rounded(ctx, x - s * .43, y - s * .38, s * .86, s * .72, 6, p.edge, p.top, 2);
  rounded(ctx, x - s * .33, y - s * .33, s * .66, s * .62, 4, '#253d48');
  for (let i = -1; i <= 1; i++) line(ctx, [[x + i * s * .19, y - s * .3], [x + i * s * .19, y + s * .28]], p.top, s * .065);
  ellipse(ctx, x, y - s * .035, s * .17, s * .2, p.edge, 0, c);
  (type === 'root' ? rootMark : lightMark)(ctx, x, y - s * .025, s * .12, c);
  for (let i = -1; i <= 1; i += 2) { ellipse(ctx, x + i * s * .38, y - s * .32, s * .04, s * .04, c); }
}

function crate(ctx, x, y, s, p, kind = '') {
  ellipse(ctx, x, y + s * .3, s * .36, s * .13, 'rgba(2,20,30,.28)');
  rounded(ctx, x - s * .33, y - s * .28, s * .66, s * .61, 5, '#695444', '#3a4142', 1.5);
  rounded(ctx, x - s * .33, y - s * .35, s * .66, s * .52, 4, '#a18b63', '#c4ab78', 1.5);
  rounded(ctx, x - s * .25, y - s * .27, s * .5, s * .35, 2, '#7e7055');
  line(ctx, [[x - s * .24, y - s * .26], [x + s * .24, y + s * .07]], '#c1ac7b', s * .055);
  line(ctx, [[x + s * .24, y - s * .26], [x - s * .24, y + s * .07]], '#c1ac7b', s * .055);
  for (const xx of [-.26, .26]) for (const yy of [-.27, .09]) ellipse(ctx, x + s * xx, y + s * yy, s * .019, s * .019, '#e0ca99');
  leaf(ctx, x + s * .12, y - s * .34, s * .18, .65, p.leaf, true);
}

function lamp(ctx, x, y, s, active, p, t) {
  const c = active ? GOLD : '#927f67';
  if (active) glow(ctx, x, y - s * .18, s * .8, GOLD, .24);
  ellipse(ctx, x, y + s * .27, s * .25, s * .12, p.edge);
  rounded(ctx, x - s * .05, y - s * .25, s * .1, s * .49, 3, '#54706d');
  rounded(ctx, x - s * .17, y - s * .45, s * .34, s * .33, 6, active ? '#fff0ae' : '#7c8270', '#bda578', 2);
  path(ctx, [[x - s * .23, y - s * .43], [x, y - s * .6], [x + s * .23, y - s * .43]], '#44646c', '#93aaa0', 1);
  line(ctx, [[x, y - s * .42], [x, y - s * .15]], '#8e8867', s * .045);
  if (!active) lightMark(ctx, x, y + s * .09, s * .1, c);
  else star(ctx, x + s * .25, y - s * .55, s * .06, '#fff0bc', .7 + Math.sin(t) * .2);
}

function rootNode(ctx, x, y, s, active, p, t) {
  ellipse(ctx, x, y + s * .2, s * .28, s * .14, p.edge, 0, active ? ROOT : '#82a294');
  if (active) glow(ctx, x, y - s * .1, s * .7, ROOT, .17);
  line(ctx, [[x, y + s * .15], [x + Math.sin(t) * s * .015, y - s * .24]], active ? ROOT : p.leaf, s * .07);
  for (let i = 0; i < 4; i++) leaf(ctx, x, y - i * s * .07, s * (active ? .26 : .17), (i % 2 ? -1 : 1) * (.8 + i * .12), active ? (i % 2 ? '#bff4bb' : ROOT) : '#789b82', true);
  if (active) { ellipse(ctx, x, y - s * .4, s * .085, s * .08, '#faf1c1'); star(ctx, x, y - s * .41, s * .13, '#fbf7c3'); }
  else ellipse(ctx, x, y - s * .23, s * .055, s * .09, '#b2bc86');
}

function exitTile(ctx, x, y, s, active, p, t) {
  ellipse(ctx, x, y + s * .08, s * .41, s * .32, p.edge, 0, active ? GOLD : '#739693');
  ellipse(ctx, x, y + s * .03, s * .31, s * .23, active ? '#829373' : '#43615e', 0, active ? '#f6dba1' : '#8ba390');
  if (active) glow(ctx, x, y, s * .8, GOLD, .13);
  for (let i = -1; i <= 1; i += 2) {
    line(ctx, [[x + i * s * .36, y + s * .07], [x + i * s * .33, y - s * .28], [x + i * s * .16, y - s * .43]], p.leaf, s * .055);
    leaf(ctx, x + i * s * .29, y - s * .23, s * .15, i * .7, p.leaf);
    ellipse(ctx, x + i * s * .16, y - s * .42, s * .055, s * .055, active ? GOLD : p.flower);
  }
  text(ctx, active ? '↑' : '⌂', x, y, s * .35, active ? '#fff2c2' : '#a1b6a3', 600);
}

function checkpoint(ctx, x, y, s, active, p, t) {
  ellipse(ctx, x, y + s * .24, s * .28, s * .13, p.edge);
  line(ctx, [[x - s * .09, y + s * .21], [x - s * .09, y - s * .49]], '#d2c59e', s * .035);
  ctx.beginPath(); ctx.moveTo(x - s * .07, y - s * .47); ctx.bezierCurveTo(x + s * .07, y - s * .54, x + s * .17, y - s * .38 + Math.sin(t * 1.4) * s * .02, x + s * .3, y - s * .43); ctx.lineTo(x + s * .3, y - s * .14); ctx.bezierCurveTo(x + s * .15, y - s * .07, x + s * .07, y - s * .28, x - s * .07, y - s * .2); ctx.closePath(); ctx.fillStyle = active ? '#f5d190' : '#87b4b1'; ctx.fill();
  star(ctx, x + s * .11, y - s * .32, s * .075, active ? '#805d41' : '#deefe1');
  if (active) glow(ctx, x, y - s * .1, s * .6, GOLD, .12);
}

function character(ctx, x, y, s, player, index, t, reduced, won = false) {
  const seed = index === 1 || player?.type === 'root' || player?.kind === 'seed';
  const color = seed ? ROOT : GOLD;
  const bob = reduced ? 0 : Math.sin(t * 2.4 + (seed ? 1 : 0)) * s * .025;
  const dead = player?.dead || player?.respawning;
  ctx.save(); ctx.translate(x, y + bob); if (dead) ctx.globalAlpha = .5;
  ellipse(ctx, 0, s * .31 - bob, s * .27, s * .105, 'rgba(1,19,29,.35)');
  glow(ctx, 0, 0, s * .67, color, .13);
  if (seed) {
    // A rounded seed body, a leafy collar and an unmistakable twin-leaf sprout.
    line(ctx, [[-s * .13, s * .15], [-s * .15, s * .29]], '#b4cdb1', s * .105);
    line(ctx, [[s * .12, s * .15], [s * .15, s * .29]], '#b4cdb1', s * .105);
    ellipse(ctx, 0, s * .015, s * .25, s * .29, '#a8dbc4', -.05, '#315756');
    path(ctx, [[-s * .25, -s * .005], [-s * .28, s * .12], [-s * .09, s * .14], [0, s * .22], [s * .08, s * .13], [s * .25, s * .16], [s * .24, -s * .01]], '#48867b');
    ellipse(ctx, 0, -s * .07, s * .23, s * .205, '#d1edd0');
    ellipse(ctx, -s * .075, -s * .085, s * .024, s * .033, '#29484a');
    ellipse(ctx, s * .075, -s * .085, s * .024, s * .033, '#29484a');
    line(ctx, [[-s * .025, -s * .003], [0, s * .015], [s * .028, -s * .003]], '#668d77', s * .023);
    ellipse(ctx, -s * .14, -s * .018, s * .045, s * .022, '#9dccad'); ellipse(ctx, s * .14, -s * .018, s * .045, s * .022, '#9dccad');
    line(ctx, [[0, -s * .23], [s * .01, -s * .38]], '#75b997', s * .044);
    leaf(ctx, s * .01, -s * .32, s * .25, -.9 + Math.sin(t * 1.3) * (reduced ? 0 : .025), '#a6e6aa', true);
    leaf(ctx, s * .01, -s * .33, s * .29, .85, '#6bc69d', true);
    ellipse(ctx, -s * .25, s * .085, s * .06, s * .045, '#d1edd0', -.5);
    ellipse(ctx, s * .24, s * .085, s * .06, s * .045, '#d1edd0', .5);
  } else {
    // A paper-lantern spirit in a scalloped cape, carrying its own little flame.
    path(ctx, [[-s * .15, s * .04], [-s * .26, s * .3], [-s * .12, s * .24], [0, s * .32], [s * .09, s * .23], [s * .2, s * .27], [s * .18, s * .03]], '#d59b60', '#735348', 1);
    ellipse(ctx, 0, -s * .06, s * .26, s * .26, '#ffe4a5', 0, '#bd9366');
    ctx.save(); ctx.globalAlpha = .23; ctx.beginPath(); ctx.ellipse(0, -s * .06, s * .15, s * .25, 0, 0, TAU); ctx.strokeStyle = '#bd895a'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    rounded(ctx, -s * .15, -s * .3, s * .3, s * .07, 3, '#cc9c61');
    line(ctx, [[-s * .075, -s * .31], [-s * .04, -s * .4], [s * .055, -s * .4], [s * .09, -s * .31]], '#f8d58b', s * .032);
    ellipse(ctx, -s * .09, -s * .06, s * .026, s * .035, '#563e39'); ellipse(ctx, s * .09, -s * .06, s * .026, s * .035, '#563e39');
    ellipse(ctx, -s * .16, s * .005, s * .045, s * .023, '#efb888'); ellipse(ctx, s * .16, s * .005, s * .045, s * .023, '#efb888');
    line(ctx, [[-s * .028, s * .027], [0, s * .043], [s * .029, s * .027]], '#96704b', s * .021);
    path(ctx, [[-s * .23, s * .09], [-s * .08, s * .12], [s * .1, s * .11], [s * .23, s * .085], [s * .17, s * .19], [-s * .17, s * .19]], '#f2be6d');
    ellipse(ctx, -s * .27, s * .12, s * .05, s * .06, '#ffe4a5');
    line(ctx, [[s * .22, s * .06], [s * .33, s * .16]], '#d9aa6d', s * .035);
    rounded(ctx, s * .275, s * .14, s * .125, s * .145, 3, '#fff1bc', '#b3925e', 1);
    glow(ctx, s * .34, s * .2, s * .25, '#ffe5a1', .22);
  }
  // Outlined role badges preserve identification without relying on hue alone.
  rounded(ctx, -s * .125, -s * .69, s * .25, s * .22, s * .07, '#123a48', color, 1);
  text(ctx, seed ? '2' : '1', 0, -s * .575, s * .16, color, 700);
  if (won) star(ctx, s * .38, -s * .4, s * .12, '#fff3bd');
  ctx.restore();
}

function bridge(ctx, x, y, s, open, p, t) {
  if (open) {
    ellipse(ctx, x, y + s * .28, s * .5, s * .17, 'rgba(6,23,38,.23)');
    rounded(ctx, x - s * .49, y - s * .3, s * .98, s * .65, 3, '#6f7460');
    for (let i = 0; i < 5; i++) rounded(ctx, x - s * .43 + i * s * .18, y - s * .29, s * .145, s * .57, 2, i % 2 ? '#b3b787' : '#9da97d', '#c8cda1', .7);
    line(ctx, [[x - s * .51, y - s * .28], [x, y - s * .18], [x + s * .51, y - s * .28]], ROOT, 1.5);
    line(ctx, [[x - s * .51, y + s * .26], [x, y + s * .34], [x + s * .51, y + s * .26]], '#8eb998', 1.5);
  } else {
    for (const d of [-1, 1]) {
      rounded(ctx, x + d * s * .43 - s * .06, y - s * .26, s * .12, s * .54, 2, p.top);
      line(ctx, [[x + d * s * .42, y - s * .19], [x + d * s * .25, y - s * .13]], '#929f82', 1.3);
      line(ctx, [[x + d * s * .42, y + s * .18], [x + d * s * .27, y + s * .22]], '#929f82', 1.3);
    }
    text(ctx, '×', x, y, s * .25, '#adbcac');
  }
}

function ferry(ctx, x, y, s, ready, p, t) {
  const bob = Math.sin(t * 1.7) * s * .025;
  ctx.save(); ctx.translate(x, y + bob);
  ellipse(ctx, 0, s * .25, s * .46, s * .16, 'rgba(188,223,211,.13)');
  path(ctx, [[-s * .49, -s * .08], [0, s * .03], [s * .49, -s * .08], [s * .27, s * .24], [-s * .23, s * .24]], '#e3d6ab', '#809b8c', 1.2);
  path(ctx, [[-s * .49, -s * .08], [-s * .09, -s * .04], [-s * .04, s * .2]], '#b9c29b');
  path(ctx, [[s * .49, -s * .08], [s * .04, -s * .035], [-s * .04, s * .2]], '#f8e8bd');
  line(ctx, [[0, -s * .47], [0, s * .05]], '#baa77a', 1.5);
  path(ctx, [[-s * .02, -s * .48], [-s * .02, -s * .13], [-s * .33, -s * .13]], ready ? '#ffe4a8' : '#9eac98', '#d0c79d', .8);
  leaf(ctx, s * .01, -s * .41, s * .23, .93, p.leaf, true);
  if (ready) glow(ctx, 0, -s * .1, s * .6, GOLD, .1);
  ctx.restore();
}

function moonwheel(ctx, x, y, s, active, ready, p, t) {
  ellipse(ctx, x, y + s * .22, s * .36, s * .14, p.edge);
  ctx.save(); ctx.translate(x, y - s * .06); ctx.rotate(active ? .4 : -.1);
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * TAU / 8); rounded(ctx, -s * .065, -s * .4, s * .13, s * .18, 2, '#9eab9d', '#46636a', 1); ctx.restore(); }
  ellipse(ctx, 0, 0, s * .3, s * .3, '#647d7b', 0, '#b1c2a8');
  ellipse(ctx, 0, 0, s * .225, s * .225, '#233b50', 0, '#d4c89b');
  ellipse(ctx, 0, 0, s * .15, s * .15, '#f6dc9e');
  if (!active) ellipse(ctx, -s * .055, -s * .025, s * .14, s * .14, '#233b50');
  ctx.restore();
  if (ready) glow(ctx, x, y - s * .1, s * .7, '#d3c4f2', .1);
}

function moonstone(ctx, x, y, s, active, p) {
  ellipse(ctx, x, y + s * .25, s * .3, s * .13, p.edge);
  path(ctx, [[x - s * .25, y + s * .18], [x - s * .23, y - s * .12], [x - s * .1, y - s * .37], [x + s * .11, y - s * .39], [x + s * .25, y - s * .18], [x + s * .23, y + s * .18]], active ? '#bdd6bd' : '#869e97', '#bac8ae', 1.3);
  ellipse(ctx, x + s * .015, y - s * .095, s * .105, s * .105, active ? '#fff2bd' : '#d0d9b8');
  ellipse(ctx, x - s * .023, y - s * .122, s * .092, s * .092, active ? '#bdd6bd' : '#869e97');
  if (active) glow(ctx, x, y - s * .12, s * .65, '#e1e8b5', .13);
  leaf(ctx, x - s * .23, y + s * .16, s * .17, -.65, p.leaf);
}

function keyChip(ctx, label, x, y, color, s) {
  rounded(ctx, x - s * .2, y - s * .12, s * .4, s * .25, s * .065, '#122e3c', color, 1);
  text(ctx, label, x, y + .5, Math.max(10, s * .21), color, 700);
}

function lockMark(ctx, x, y, s) {
  ctx.save(); ctx.globalAlpha = .8;
  rounded(ctx, x - s * .05, y - s * .065, s * .1, s * .12, s * .05, null, '#c6c4aa', 1);
  rounded(ctx, x - s * .09, y - s * .005, s * .18, s * .13, 2, '#b9b99f');
  ellipse(ctx, x, y + s * .045, .75, 1.4, '#465d60'); ctx.restore();
}

function motes(ctx, x, y, s, color, t, count = 5) {
  for (let i = 0; i < count; i++) {
    const phase = (t * .11 + i / count) % 1;
    const px = x + Math.sin(i * 6.9 + t * .3) * s * (.25 + hash(i) * .15), py = y - phase * s * 1.1;
    star(ctx, px, py, s * .026, color, Math.sin(phase * Math.PI) * .65);
  }
}

/** Render one read-only engine snapshot. time is a performance timestamp in ms. */
export function render(ctx, state, options = {}) {
  if (!state?.map) { renderTitle(ctx, options.time || 0, !!options.reducedMotion); return; }
  const w = options.width || 1120, h = options.height || 680;
  const reduced = !!options.reducedMotion;
  const t = reduced ? 0 : (options.time || 0) / 1000;
  const p = BIOME_PALETTES[clamp(state.levelIndex || 0, 0, 7)];
  const cols = state.width || state.map[0]?.length || 21, rows = state.height || state.map.length || 13;
  const s = Math.min(44, (w - 100) / cols, (h - 100) / rows);
  const ox = (w - cols * s) / 2, oy = (h - rows * s) / 2 - 6;
  const center = a => ({x: ox + (a.x + .5) * s, y: oy + (a.y + .5) * s});
  const tile = (x, y) => state.map[y]?.[x];
  const solid = (x, y) => tile(x, y) !== undefined && tile(x, y) !== '~' && tile(x, y) !== '!';
  const entities = [...(state.nodes || []), ...(state.gates || []), ...(state.plates || []), ...(state.crates || []), ...(state.ferries || []), state.checkpoint, state.exit].filter(Boolean);
  const occupied = (x, y) => entities.some(a => a.x === x && a.y === y) || state.players?.some(a => a.x === x && a.y === y);
  ctx.save();
  seaBackground(ctx, w, h, p, t, reduced);
  // A diffuse shoreline and the suspended island's shadow make the playfield feel physical.
  rounded(ctx, ox - 10, oy + 18, cols * s + 20, rows * s + 14, 28, 'rgba(3,16,31,.20)');
  rounded(ctx, ox - 5, oy + 10, cols * s + 10, rows * s + 12, 17, 'rgba(6,24,36,.13)', 'rgba(135,198,191,.09)', 1);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const cell = tile(x, y), px = ox + x * s, py = oy + y * s;
    if (solid(x, y)) floorTile(ctx, px, py, s, p, x, y, {top: !solid(x, y - 1), bottom: !solid(x, y + 1), left: !solid(x - 1, y), right: !solid(x + 1, y)});
    else if (cell === '!') hazardTile(ctx, px, py, s, t);
    else if (cell === '~') streamTile(ctx, px, py, s, p, t);
  }
  // Small resting petals are decorative only; they avoid every game object.
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (tile(x, y) !== '.' || occupied(x, y)) continue;
    const n = hash(x + 16, y + 40);
    if (n > .93) { ctx.save(); ctx.globalAlpha = .45; ellipse(ctx, ox + (x + .75) * s, oy + (y + .76) * s, s * .045, s * .018, p.flower, n * 7); ctx.restore(); }
  }
  for (const f of state.ferries || []) {
    const a = center(f.endpoints[0]), b = center(f.endpoints[1]);
    ctx.save(); ctx.setLineDash([3, 7]); line(ctx, [[a.x, a.y], [b.x, b.y]], 'rgba(224,221,181,.2)', 1.2); ctx.restore();
    for (const end of f.endpoints) { const c = center(end); ellipse(ctx, c.x, c.y, s * .35, s * .27, null, 0, 'rgba(213,216,171,.37)'); }
  }
  for (const plateState of state.plates || []) {
    const c = center(plateState); plate(ctx, c.x, c.y, s, plateState.role === 0 ? 'light' : plateState.role === 1 ? 'root' : 'weight', plateState.pressed, p);
  }
  if (state.exit) { const c = center(state.exit); exitTile(ctx, c.x, c.y, s, state.objective?.done === state.objective?.total, p, t); }
  // Draw each row back to front; mechanisms and actors sit naturally between walls.
  const players = (state.players || []).map((a, i) => ({...a, ...(options.playerPositions?.[i] || {}), index: i}));
  const overlap = players.length > 1 && Math.abs(players[0].x - players[1].x) < .45 && Math.abs(players[0].y - players[1].y) < .45;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) if (tile(x, y) === '#') wallTile(ctx, ox + x * s, oy + y * s, s, p, x, y, t);
    for (const g of state.gates || []) if (g.y === y) { const c = center(g); if (g.kind === 'bridge') bridge(ctx, c.x, c.y, s, g.open, p, t); else gate(ctx, c.x, c.y, s, 'light', g.open, p, t); }
    for (const f of state.ferries || []) if (f.y === y) { const c = center(f); ferry(ctx, c.x, c.y, s, f.ready, p, t); }
    if (state.checkpoint?.y === y) { const c = center(state.checkpoint); moonstone(ctx, c.x, c.y, s, state.checkpoint.active, p); }
    for (const n of state.nodes || []) if (n.y === y) {
      const c = center(n);
      if (n.kind === 'root') rootNode(ctx, c.x, c.y, s, n.active, p, t);
      else if (n.kind === 'switch') moonwheel(ctx, c.x, c.y, s, n.active, n.ready, p, t);
      else lamp(ctx, c.x, c.y, s, n.active, p, t);
      if (n.active && n.kind !== 'switch') { motes(ctx, c.x, c.y, s, n.kind === 'root' ? ROOT : GOLD, t); text(ctx, '✓', c.x + s * .27, c.y + s * .22, s * .23, n.kind === 'root' ? ROOT : GOLD, 700); }
      else if (!n.ready) lockMark(ctx, c.x + s * .27, c.y + s * .19, s);
    }
    for (const c of state.crates || []) if (c.y === y) { const pos = center(c); crate(ctx, pos.x, pos.y, s, p); }
    for (const a of players.filter(a => Math.round(a.y) === y).sort((a, b) => a.y - b.y)) {
      const c = center(a); if (overlap) { c.x += a.index === 0 ? -s * .15 : s * .15; c.y += a.index === 0 ? -s * .08 : s * .08; }
      character(ctx, c.x, c.y, overlap ? s * .91 : s, a, a.index, t, reduced, state.status !== 'playing');
    }
  }
  // Role-specific key prompts appear only when the corresponding spirit can reach a node.
  if (state.status === 'playing' && options.showPrompts !== false) {
    for (const n of state.nodes || []) {
      if (n.active && n.kind !== 'switch') continue;
      const actor = state.players?.[n.role];
      if (actor && Math.abs(actor.x - n.x) + Math.abs(actor.y - n.y) <= 1) {
        const c = center(n); keyChip(ctx, n.role === 0 ? 'E' : '↵', c.x, c.y - s * .8, n.role === 0 ? GOLD : ROOT, s);
      }
    }
    for (const f of state.ferries || []) {
      if (state.players?.every(a => Math.abs(a.x - f.x) + Math.abs(a.y - f.y) <= 1)) { const c = center(f); keyChip(ctx, 'E', c.x, c.y - s * .8, GOLD, s); }
    }
  }
  // Illustrated margin marks reinforce an archipelago, rather than a boxed-in maze.
  for (let i = 0; i < 8; i++) {
    const x = w / 2 + (i - 3.5) * 17, y = h - 21;
    ellipse(ctx, x, y, i === state.levelIndex ? 4 : 2.1, i === state.levelIndex ? 4 : 2.1, i <= state.levelIndex ? p.accent : 'rgba(193,217,205,.20)');
  }
  if (state.status === 'levelComplete' || state.status === 'ending') {
    const c = center(state.exit); glow(ctx, c.x, c.y, s * 3.5, GOLD, .09); motes(ctx, c.x, c.y + s * .3, s * 2.5, '#ffe7aa', t, 12);
  }
  ctx.restore();
}

function titleHouse(ctx, x, y, s, p, roof = '#446674') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(ctx, 0, 8, 38, 9, 'rgba(4,25,37,.2)');
  rounded(ctx, -29, -48, 58, 56, 6, '#94a392', '#476862', 2);
  path(ctx, [[-37, -45], [-5, -83], [9, -80], [38, -44]], roof, '#294b56', 2);
  line(ctx, [[-29, -47], [-4, -74], [5, -72], [29, -47]], '#88a19d', 2);
  rounded(ctx, -9, -19, 18, 27, [9, 9, 0, 0], '#48665e');
  for (let i = -1; i <= 1; i += 2) { glow(ctx, i * 18, -28, 26, GOLD, .19); rounded(ctx, i * 18 - 5, -35, 10, 14, 5, '#ffe2a0'); line(ctx, [[i * 18, -34], [i * 18, -22]], '#718772', 1.1); }
  for (let i = 0; i < 3; i++) tinyFlower(ctx, -30 + i * 10, 5, 3.4, p);
  ctx.restore();
}

/** Original cover illustration; left side intentionally quiet for HTML hero copy. */
export function renderTitle(ctx, time = 0, reducedMotion = false) {
  const w = 1120, h = 680, p = BIOME_PALETTES[0], t = reducedMotion ? 0 : time / 1000;
  ctx.save(); seaBackground(ctx, w, h, p, t, reducedMotion, true);
  // Fine cartographic tide paths lead the eye toward the little village.
  ctx.save(); ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.moveTo(315, 555); ctx.bezierCurveTo(460, 435, 495, 637, 658, 545); ctx.bezierCurveTo(821, 448, 1010, 574, 1050, 376); ctx.strokeStyle = 'rgba(188,219,199,.14)'; ctx.lineWidth = 1.1; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(765, 403 + (reducedMotion ? 0 : Math.sin(t * .33) * 2));
  ellipse(ctx, 0, 151, 246, 32, 'rgba(0,18,35,.22)');
  path(ctx, [[-229, 13], [-198, 106], [-125, 141], [-97, 109], [-32, 174], [11, 138], [57, 162], [103, 117], [178, 116], [224, 26]], '#244b54', '#173e4b', 2);
  path(ctx, [[-196, 44], [-171, 107], [-120, 127], [-104, 73], [-66, 110], [-23, 156], [-3, 106], [29, 129], [79, 94], [130, 112], [177, 86], [194, 43]], '#345a5c');
  line(ctx, [[-152, 63], [-136, 112], [-120, 127]], '#446f68', 3);
  line(ctx, [[54, 65], [43, 112], [29, 129]], '#1c424b', 4);
  ellipse(ctx, 0, 14, 230, 93, '#3d6864', -.025, '#739184');
  ellipse(ctx, -5, 2, 218, 79, '#5a8172', -.025);
  ellipse(ctx, -14, -4, 200, 65, '#648a78', -.025);
  // A winding warm stone footpath; every stone is drawn, not a repeated image.
  for (let i = 0; i < 15; i++) {
    const a = i / 14, x = -163 + a * 288, y = 21 + Math.sin(a * 6 - .7) * 21;
    ellipse(ctx, x, y, 12 + hash(i) * 5, 7, i % 2 ? '#9fa586' : '#afb194', .08);
  }
  titleHouse(ctx, 128, -28, 1.22, p, '#3e6773');
  titleHouse(ctx, 67, -62, .8, p, '#536779');
  lighthouse(ctx, -119, -29, 1.35, p, t);
  // The village's giant botanical waterwheel, a recurring world motif.
  ctx.save(); ctx.translate(-8, -58);
  line(ctx, [[-20, 24], [-4, -22], [18, 24]], '#365c56', 10);
  ctx.save(); ctx.rotate(reducedMotion ? -.12 : t * .022 - .12);
  for (let i = 0; i < 9; i++) {
    ctx.save(); ctx.rotate(i * TAU / 9); line(ctx, [[0, 0], [0, -65]], '#8d9e76', 4); leaf(ctx, 0, -45, 28, .55, i % 2 ? '#a6bc87' : '#89ac81', true); ctx.restore();
  }
  ellipse(ctx, 0, 0, 43, 43, null, 0, '#c0bf8d'); ctx.lineWidth = 4; ctx.stroke();
  ellipse(ctx, 0, 0, 12, 12, '#d4c58c', 0, '#6d8066'); ellipse(ctx, 0, 0, 5, 5, '#577c6b');
  ctx.restore(); ctx.restore();
  // A curved string of welcoming lamps hung between two branches.
  line(ctx, [[-118, -96], [-64, -75], [0, -66], [61, -75], [128, -95]], '#9da985', 1.25);
  for (let i = 0; i < 7; i++) {
    const x = -106 + i * 35, y = -69 - Math.pow((i - 3) / 3, 2) * 23;
    line(ctx, [[x, y - 4], [x, y + 6]], '#b1b594', 1);
    glow(ctx, x, y + 10, 25, GOLD, .17); ellipse(ctx, x, y + 10, 4.5, 7, '#ffe5a3');
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU, x = Math.cos(a) * (190 + hash(i) * 20), y = 5 + Math.sin(a) * 68;
    plant(ctx, x, y, 77 + hash(i, 20) * 34, p, i * 3, t);
  }
  for (let i = 0; i < 11; i++) tinyFlower(ctx, -180 + hash(i, 31) * 355, 12 + hash(i, 54) * 50, 3 + hash(i) * 2, p, t * .6);
  character(ctx, -65, 22, 97, {role:'light'}, 0, t, reducedMotion);
  character(ctx, 23, 27, 97, {role:'root'}, 1, t, reducedMotion);
  // Vines trail from the floating rock into the tide below.
  for (let i = 0; i < 5; i++) {
    const x = -164 + i * 80, y = 65 + Math.sin(i) * 14;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 22, y + 35, x - 22, y + 62, x + 3, y + 87); ctx.strokeStyle = '#62927d'; ctx.lineWidth = 2; ctx.stroke();
    for (let j = 0; j < 3; j++) leaf(ctx, x + Math.sin(j * 3) * 4, y + 20 + j * 22, 12, (j % 2 ? 1 : -1) * 1.1, j % 2 ? '#79ab86' : '#578e78');
  }
  ctx.restore();
  ferry(ctx, 476, 551, 85, true, p, t);
  for (let i = 0; i < 19; i++) {
    const x = 543 + hash(i, 64) * 463, y = 191 + hash(i, 73) * 326;
    star(ctx, x + Math.sin(t * .2 + i) * 3, y + Math.cos(t * .3 + i) * 4, 1.5 + hash(i) * 1.5, '#e7ecc2', .2 + Math.sin(t + i) * .12);
  }
  // Hero copy has a stable, low-detail left backdrop on every frame.
  const shade = ctx.createLinearGradient(0, 0, 690, 0); shade.addColorStop(0, 'rgba(6,26,42,.64)'); shade.addColorStop(.57, 'rgba(6,26,42,.30)'); shade.addColorStop(1, 'rgba(6,26,42,0)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 700, h);
  ctx.restore();
}
