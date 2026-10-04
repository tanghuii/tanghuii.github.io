/* fleet3d.js: procedural 3D airliners in airline liveries for the hangar on flights.html.
 *
 * Each model is built from the type's real dimensions (length, span, fuselage diameter, wing sweep,
 * engine size, engine and tail layout, winglets); liveries are simplified renderings of the airlines'
 * standard schemes (colours, cheatlines, titles, logos inside the real fin outline, engines, winglets),
 * painted onto canvas textures. They are approximations, not official artwork.
 *
 * Memory: Three.js (vendor/three.min.js) is loaded on demand; the hangar uses ONE shared WebGL renderer,
 * draws each card once as a still picture when it scrolls into view, and builds a live model only for
 * the card under the mouse (rotating while hovered) or for the full-size viewer. Models are disposed as
 * soon as they are no longer shown.
 *
 * Usage: Fleet3D.load().then(ok => …); Fleet3D.card(canvas, { type, airline }); Fleet3D.setAirline(canvas, al);
 *        Fleet3D.setTheme('light' | 'dark'); Fleet3D.viewer(host, { type, airline }) → { setAirline, setTheme, destroy };
 *        Fleet3D.liveryName(iata, lang)
 */
(function () {
  'use strict';
  let T = null;   // THREE, once loaded

  // ── Type geometry: [length m, span m, fuselage diameter m, wing sweep °, options] ──
  // eng: engine count; mount: wing | rear | prop; tail: low | T; wing: low | high; tip: fence | sharklet | blended | max | small | none;
  // ed: engine (fan) diameter m; hump: 747 upper deck; deck2: A380 double deck
  const N = (ed, tip, o = {}) => ({ eng: 2, mount: 'wing', tail: 'low', wing: 'low', tip, ed, ...o });
  const DIMS = {
    A318: [31.4, 34.1, 3.95, 25, N(2.0, 'fence')], A319: [33.8, 34.1, 3.95, 25, N(2.0, 'fence')], A320: [37.6, 34.1, 3.95, 25, N(2.0, 'fence')],
    A20N: [37.6, 35.8, 3.95, 25, N(2.2, 'sharklet')], A321: [44.5, 34.1, 3.95, 25, N(2.0, 'fence')], A21N: [44.5, 35.8, 3.95, 25, N(2.2, 'sharklet')],
    BCS1: [35.0, 35.1, 3.7, 25, N(1.9, 'none')], BCS3: [38.7, 35.1, 3.7, 25, N(1.9, 'none')],
    A332: [58.8, 60.3, 5.64, 30, N(2.9, 'small')], A333: [63.7, 60.3, 5.64, 30, N(2.9, 'small')], A339: [63.7, 64.0, 5.64, 30, N(3.0, 'sharklet')],
    A343: [63.6, 60.3, 5.64, 30, N(2.2, 'small', { eng: 4 })], A346: [75.4, 63.4, 5.64, 31, N(2.5, 'small', { eng: 4 })],
    A359: [66.8, 64.75, 5.96, 31.9, N(3.3, 'sharklet')], A35K: [73.8, 64.75, 5.96, 31.9, N(3.4, 'sharklet')],
    A388: [72.7, 79.8, 7.14, 33.5, N(3.0, 'fence', { eng: 4, deck2: true })],
    B733: [33.4, 28.9, 3.76, 25, N(1.6, 'none')], B737: [33.6, 35.8, 3.76, 25, N(1.75, 'blended')], B738: [39.5, 35.8, 3.76, 25, N(1.75, 'blended')],
    B739: [42.1, 35.8, 3.76, 25, N(1.75, 'blended')], B38M: [39.5, 35.9, 3.76, 25, N(2.0, 'max')], B39M: [42.2, 35.9, 3.76, 25, N(2.0, 'max')],
    B744: [70.7, 64.4, 6.5, 37.5, N(2.6, 'small', { eng: 4, hump: true })], B748: [76.3, 68.4, 6.5, 37.5, N(2.8, 'none', { eng: 4, hump: true })],
    B752: [47.3, 38.1, 3.76, 25, N(2.1, 'none')], B763: [54.9, 47.6, 5.03, 31.5, N(2.6, 'none')],
    B772: [63.7, 60.9, 6.2, 31.6, N(3.2, 'none')], B77L: [63.7, 64.8, 6.2, 31.6, N(3.4, 'none')], B77W: [73.9, 64.8, 6.2, 31.6, N(3.4, 'none')],
    B779: [76.7, 71.8, 6.2, 31.6, N(3.6, 'none')], B788: [56.7, 60.1, 5.77, 32.2, N(3.0, 'none')], B789: [62.8, 60.1, 5.77, 32.2, N(3.0, 'none')],
    B78X: [68.3, 60.1, 5.77, 32.2, N(3.0, 'none')], C919: [38.9, 35.8, 3.96, 25, N(2.1, 'sharklet')],
    AJ27: [33.5, 27.3, 3.3, 25, N(1.5, 'small', { mount: 'rear', tail: 'T' })],
    E170: [29.9, 26.0, 3.0, 23, N(1.4, 'small')], E175: [31.7, 26.0, 3.0, 23, N(1.4, 'small')], E190: [36.2, 28.7, 3.0, 23, N(1.6, 'small')],
    E195: [38.7, 28.7, 3.0, 23, N(1.6, 'small')], E290: [36.3, 33.7, 3.0, 23, N(1.8, 'none')], E295: [41.5, 35.1, 3.0, 23, N(1.8, 'none')],
    CRJ9: [36.2, 24.9, 2.7, 26, N(1.4, 'small', { mount: 'rear', tail: 'T' })],
    DH8D: [32.8, 28.4, 2.7, 2, N(1.1, 'none', { mount: 'prop', tail: 'T', wing: 'high' })],
    AT76: [27.2, 27.1, 2.6, 2, N(1.1, 'none', { mount: 'prop', tail: 'T', wing: 'high' })],
    F100: [35.5, 28.1, 3.3, 17, N(1.4, 'none', { mount: 'rear', tail: 'T' })],
  };
  const FALLBACK = { narrow: 'A320', wide: 'B788', quad: 'B744', regional: 'E190', turboprop: 'AT76' };

  // ── Liveries (simplified renderings of each airline's standard scheme; not official artwork) ──
  // body / belly (bellyFrom = v where the belly colour starts) / top (topTo) colours, cheatlines [v, width, colour],
  // titles, fuselage logo, engine, inlet lip and winglet colours, tail painter
  const W = '#f7f8fa';
  const LIV = {
    KL: { name: 'KLM', zh: '荷兰皇家航空', top: '#00a1de', topTo: 0.305, belly: '#eef1f4', text: ['KLM', 'Royal Dutch Airlines'], textColor: '#ffffff', fusLogo: 'klm', fusLogoColor: '#ffffff', engine: '#00a1de', lip: '#d9e2ea', winglet: '#00a1de', tail: 'klm' },
    AF: { name: 'Air France', zh: '法国航空', text: ['AIRFRANCE'], textColor: '#002157', italic: true, engine: W, winglet: '#002157', tail: 'af' },
    CZ: { name: 'China Southern', zh: '中国南方航空', text: ['中国南方航空', 'CHINA SOUTHERN'], textColor: '#0b5aa6', fusLogo: 'kapok', fusLogoColor: '#e60012', engine: W, winglet: '#0b5aa6', tail: 'cz' },
    CA: { name: 'Air China', zh: '中国国际航空', text: ['中国国际航空公司', 'AIR CHINA'], textColor: '#1a1a1a', fusLogo: 'phoenix', fusLogoColor: '#d71920', engine: W, winglet: '#d71920', tail: 'ca' },
    MF: { name: 'Xiamen Air', zh: '厦门航空', text: ['厦门航空', 'XIAMENAIR'], textColor: '#173f8f', fusLogo: 'egret', fusLogoColor: '#173f8f', engine: '#173f8f', winglet: '#173f8f', tail: 'mf' },
    MU: { name: 'China Eastern', zh: '中国东方航空', text: ['中国东方航空', 'CHINA EASTERN'], textColor: '#13336b', fusLogo: 'swallow', engine: W, winglet: '#13336b', tail: 'mu' },
    HU: { name: 'Hainan Airlines', zh: '海南航空', text: ['海南航空', 'HAINAN AIRLINES'], textColor: '#b5121b', engine: W, winglet: '#c8102e', tail: 'hu' },
    '3U': { name: 'Sichuan Airlines', zh: '四川航空', text: ['四川航空', 'SICHUAN AIRLINES'], textColor: '#b5121b', engine: W, winglet: '#c8102e', tail: '3u' },
    ZH: { name: 'Shenzhen Airlines', zh: '深圳航空', text: ['深圳航空', 'SHENZHEN AIRLINES'], textColor: '#b5121b', engine: W, winglet: '#c8102e', tail: 'zh' },
    FM: { name: 'Shanghai Airlines', zh: '上海航空', text: ['上海航空', 'SHANGHAI AIRLINES'], textColor: '#b5121b', engine: W, winglet: '#c8102e', tail: 'fm' },
    LH: { name: 'Lufthansa', zh: '汉莎航空', text: ['Lufthansa'], textColor: '#05164d', serif: true, fusLogo: 'crane', fusLogoColor: '#05164d', engine: '#05164d', lip: '#c9ced6', winglet: '#05164d', tail: 'lh' },
    AY: { name: 'Finnair', zh: '芬兰航空', text: ['FINNAIR'], textColor: '#0b1560', engine: W, winglet: '#0b1560', tail: 'ay' },
    BA: { name: 'British Airways', zh: '英国航空', belly: '#1b2b5a', bellyFrom: 0.36, cheat: [[0.352, 0.008, '#c8102e']], text: ['BRITISH AIRWAYS'], textColor: '#1b2b5a', engine: '#d9dee5', winglet: '#1b2b5a', tail: 'ba' },
    CX: { name: 'Cathay Pacific', zh: '国泰航空', cheat: [[0.33, 0.012, '#8fa8a5']], text: ['CATHAY PACIFIC', '國泰航空'], textColor: '#005d63', engine: '#d9dee5', winglet: '#005d63', tail: 'cx' },
    SQ: { name: 'Singapore Airlines', zh: '新加坡航空', cheat: [[0.325, 0.006, '#f0ab00'], [0.334, 0.01, '#0b2a6f']], text: ['SINGAPORE AIRLINES'], textColor: '#0b2a6f', engine: '#d9dee5', winglet: '#0b2a6f', tail: 'sq' },
    EK: { name: 'Emirates', zh: '阿联酋航空', text: ['Emirates'], textColor: '#9a7b2f', serif: true, engine: '#d9dee5', winglet: '#d0021b', tail: 'ek' },
    TK: { name: 'Turkish Airlines', zh: '土耳其航空', text: ['TURKISH AIRLINES'], textColor: '#1b2b5a', engine: '#d9dee5', winglet: '#c8102e', tail: 'tk' },
    NH: { name: 'ANA', zh: '全日空', cheat: [[0.322, 0.01, '#13448f'], [0.336, 0.006, '#00a3e0']], text: ['ANA'], textColor: '#13448f', engine: '#d9dee5', winglet: '#13448f', tail: 'nh' },
    TO: { name: 'Transavia', zh: '泛航航空', text: ['transavia'], textColor: '#00a651', engine: W, winglet: '#00a651', tail: 'to' },
    OS: { name: 'Austrian', zh: '奥地利航空', text: ['Austrian'], textColor: '#d8001a', engine: '#d9dee5', winglet: '#d8001a', tail: 'os' },
    FR: { name: 'Ryanair', zh: '瑞安航空', belly: '#073590', bellyFrom: 0.33, text: ['RYANAIR'], textColor: '#073590', engine: W, winglet: '#073590', tail: 'fr' },
    VY: { name: 'Vueling', zh: '伏林航空', text: ['vueling'], textColor: '#4a4a4a', engine: W, winglet: '#ffcc00', tail: 'vy' },
    QR: { name: 'Qatar Airways', zh: '卡塔尔航空', text: ['QATAR AIRWAYS'], textColor: '#5c0632', engine: '#5c0632', winglet: '#5c0632', tail: 'qr' },
  };
  const liveryOf = al => {
    const k = String(al?.iata || '').toUpperCase();
    if (LIV[k]) return { key: k, ...LIV[k] };
    return { key: 'gen:' + (al?.name || ''), name: al?.name || '', text: [String(al?.name || '').toUpperCase()].filter(Boolean), textColor: '#2b3440', engine: W, tail: 'gen', code: k };
  };

  // ── Canvas helpers ──
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function tex(canvas) {
    const t = new T.CanvasTexture(canvas); t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
  }
  const FONT = '"Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  // Text squeezed so it looks undistorted on a surface whose texels are k times taller than wide
  function text(ctx, s, x, y, size, color, k, opt = {}) {
    ctx.save(); ctx.translate(x, y); if (opt.rot) ctx.rotate(Math.PI); ctx.scale(1, 1 / k); if (opt.italic) ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.font = `${opt.italic ? 'italic ' : ''}${opt.weight || 700} ${size}px ${opt.serif ? 'Georgia, "Times New Roman", serif' : FONT}`;
    ctx.fillStyle = color; ctx.textAlign = opt.align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); const w = ctx.measureText(s).width; ctx.restore(); return w;
  }

  // ── Logos, drawn around (cx, cy) with size s, nose to the left ──
  const LOGO = {
    klm(x, cx, cy, s, col = '#fff') {   // crown: band, five jewels on stems, cross on top
      x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.07;
      x.beginPath(); x.roundRect(cx - s * 0.42, cy + s * 0.08, s * 0.84, s * 0.1, s * 0.05); x.fill();
      [-2, -1, 0, 1, 2].forEach(i => { const tx = cx + i * s * 0.19, ty = cy - s * 0.2 + Math.abs(i) * s * 0.07;
        x.beginPath(); x.moveTo(cx + i * s * 0.12, cy + s * 0.09); x.lineTo(tx, ty); x.stroke(); x.beginPath(); x.arc(tx, ty - s * 0.03, s * 0.065, 0, Math.PI * 2); x.fill(); });
      x.lineWidth = s * 0.05; x.beginPath(); x.moveTo(cx, cy - s * 0.48); x.lineTo(cx, cy - s * 0.32); x.moveTo(cx - s * 0.07, cy - s * 0.41); x.lineTo(cx + s * 0.07, cy - s * 0.41); x.stroke(); x.restore();
    },
    kapok(x, cx, cy, s, col = '#e60012') {   // five rounded petals with a slight swirl
      x.save(); x.fillStyle = col;
      for (let i = 0; i < 5; i++) { x.save(); x.translate(cx, cy); x.rotate(i * Math.PI * 2 / 5 + 0.2);
        x.beginPath(); x.moveTo(0, -s * 0.06); x.bezierCurveTo(s * 0.26, -s * 0.18, s * 0.2, -s * 0.5, 0.02 * s, -s * 0.52); x.bezierCurveTo(-s * 0.16, -s * 0.5, -s * 0.24, -s * 0.2, 0, -s * 0.06); x.fill(); x.restore(); }
      x.beginPath(); x.arc(cx, cy, s * 0.07, 0, Math.PI * 2); x.fill(); x.restore();
    },
    phoenix(x, cx, cy, s, col = '#d71920') {   // red phoenix curled into a circle
      x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.09;
      x.beginPath(); x.arc(cx, cy, s * 0.42, Math.PI * 0.62, Math.PI * 2.28); x.stroke();
      x.beginPath(); x.moveTo(cx - s * 0.28, cy + s * 0.22); x.bezierCurveTo(cx - s * 0.1, cy - s * 0.42, cx + s * 0.32, cy - s * 0.22, cx + s * 0.12, cy + s * 0.18); x.stroke();
      x.beginPath(); x.moveTo(cx - s * 0.05, cy - s * 0.02); x.quadraticCurveTo(cx + s * 0.24, cy - s * 0.32, cx + s * 0.4, cy - s * 0.12); x.stroke();
      x.beginPath(); x.arc(cx + s * 0.3, cy - s * 0.3, s * 0.07, 0, Math.PI * 2); x.fill(); x.restore();
    },
    swallow(x, cx, cy, s) {   // red/blue disc with a white swallow
      x.save(); x.fillStyle = '#d7000f'; x.beginPath(); x.arc(cx, cy, s * 0.5, Math.PI, 0); x.fill(); x.fillStyle = '#13336b'; x.beginPath(); x.arc(cx, cy, s * 0.5, 0, Math.PI); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(cx - s * 0.36, cy - s * 0.02); x.quadraticCurveTo(cx - s * 0.05, cy - s * 0.12, cx + s * 0.12, cy - s * 0.32); x.quadraticCurveTo(cx + s * 0.06, cy - s * 0.06, cx + s * 0.38, cy + s * 0.04);
      x.lineTo(cx + s * 0.1, cy + s * 0.05); x.lineTo(cx + s * 0.3, cy + s * 0.3); x.lineTo(cx, cy + s * 0.08); x.quadraticCurveTo(cx - s * 0.2, cy + s * 0.06, cx - s * 0.36, cy - s * 0.02); x.fill(); x.restore();
    },
    egret(x, cx, cy, s, col = '#fff') {   // egret in flight: raised wings, S-shaped neck reaching forward (to the left)
      x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round';
      x.beginPath(); x.ellipse(cx, cy + s * 0.06, s * 0.2, s * 0.08, -0.15, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(cx - s * 0.02, cy); x.quadraticCurveTo(cx + s * 0.05, cy - s * 0.42, cx + s * 0.45, cy - s * 0.46); x.quadraticCurveTo(cx + s * 0.14, cy - s * 0.24, cx + s * 0.12, cy + s * 0.02); x.fill();
      x.beginPath(); x.moveTo(cx - s * 0.08, cy - s * 0.01); x.quadraticCurveTo(cx - s * 0.12, cy - s * 0.34, cx + s * 0.1, cy - s * 0.4); x.quadraticCurveTo(cx - s * 0.02, cy - s * 0.2, cx + s * 0.02, cy + s * 0.01); x.fill();
      x.lineWidth = s * 0.05; x.beginPath(); x.moveTo(cx - s * 0.16, cy + s * 0.04); x.bezierCurveTo(cx - s * 0.3, cy - s * 0.02, cx - s * 0.22, cy - s * 0.16, cx - s * 0.36, cy - s * 0.16); x.stroke();
      x.lineWidth = s * 0.025; x.beginPath(); x.moveTo(cx - s * 0.36, cy - s * 0.16); x.lineTo(cx - s * 0.5, cy - s * 0.14); x.stroke();
      x.beginPath(); x.moveTo(cx + s * 0.16, cy + s * 0.09); x.lineTo(cx + s * 0.46, cy + s * 0.16); x.stroke(); x.restore();
    },
    crane(x, cx, cy, s, col = '#fff') {   // crane in flight inside a ring
      x.save(); x.strokeStyle = col; x.lineWidth = s * 0.06; x.beginPath(); x.arc(cx, cy, s * 0.5, 0, Math.PI * 2); x.stroke(); x.restore();
      LOGO.egret(x, cx + s * 0.02, cy + s * 0.04, s * 0.78, col);
    },
    harp(x, cx, cy, s, col = '#f1c933') {
      x.save(); x.strokeStyle = col; x.lineWidth = s * 0.07; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(cx - s * 0.32, cy + s * 0.46); x.lineTo(cx - s * 0.32, cy - s * 0.42); x.quadraticCurveTo(cx + s * 0.1, cy - s * 0.3, cx + s * 0.38, cy + s * 0.46); x.closePath(); x.stroke();
      x.lineWidth = s * 0.03; for (let i = 1; i < 5; i++) { const xx = cx - s * 0.32 + i * s * 0.14; x.beginPath(); x.moveTo(xx, cy + s * 0.46); x.lineTo(xx, cy - s * (0.38 - i * 0.16)); x.stroke(); } x.restore();
    },
  };
  // Fin frame: canvas outline of the fin and a point at height fraction a (0 = top, 1 = root)
  function finFrame(F, w, h) {
    const P = F.poly.map(([u, v]) => [u * w, v * h]);   // root LE, root TE, tip TE, tip LE
    const at = a => ({ xl: P[3][0] * (1 - a) + P[0][0] * a, xt: P[2][0] * (1 - a) + P[1][0] * a, y: a * h });
    const m = at(0.45), chord = m.xt - m.xl;
    return { P, at, cx: m.xl + chord * 0.52, cy: m.y, s: Math.min(chord * 0.8, h * 0.44) };
  }
  function band(x, fr, aL0, aL1, aR0, aR1, col) {   // a band from the leading edge (heights aL) to the trailing edge (heights aR)
    x.fillStyle = col; x.beginPath(); x.moveTo(fr.at(aL0).xl - 4, aL0 * fr.P[0][1]); x.lineTo(fr.at(aR0).xt + 4, aR0 * fr.P[0][1]); x.lineTo(fr.at(aR1).xt + 4, aR1 * fr.P[0][1]); x.lineTo(fr.at(aL1).xl - 4, aL1 * fr.P[0][1]); x.fill();
  }
  const bg = (x, w, h, c) => { x.fillStyle = c; x.fillRect(0, 0, w, h); };
  const label = (x, s, cx, cy, size, col, weight = 800) => { x.fillStyle = col; x.font = `${weight} ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, cx, cy); };
  const TAILS = {
    klm(x, w, h, f) { bg(x, w, h, '#00a1de'); LOGO.klm(x, f.cx, f.cy - f.s * 0.12, f.s * 0.9); label(x, 'KLM', f.cx, f.cy + f.s * 0.42, f.s * 0.42, '#fff', 900); },
    af(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, 0.5, 0.68, -0.05, 0.12, '#002157'); band(x, f, 0.74, 0.84, 0.17, 0.27, '#e2001a'); },
    cz(x, w, h, f) { bg(x, w, h, '#0b5aa6'); LOGO.kapok(x, f.cx, f.cy, f.s * 0.95); },
    ca(x, w, h, f) { bg(x, w, h, '#ffffff'); LOGO.phoenix(x, f.cx, f.cy, f.s * 0.85); },
    mf(x, w, h, f) { bg(x, w, h, '#6fb7e9'); band(x, f, -0.1, 0.62, -0.1, 0.38, '#173f8f'); LOGO.egret(x, f.cx, f.cy, f.s * 0.95); },
    mu(x, w, h, f) { bg(x, w, h, '#ffffff'); LOGO.swallow(x, f.cx, f.cy, f.s * 0.85); },
    hu(x, w, h, f) { bg(x, w, h, '#c8102e'); x.strokeStyle = '#f2b632'; x.lineWidth = f.s * 0.06; x.beginPath(); x.arc(f.cx, f.cy, f.s * 0.42, 0, Math.PI * 2); x.stroke(); LOGO.egret(x, f.cx, f.cy, f.s * 0.62, '#f2b632'); },
    '3u'(x, w, h, f) { bg(x, w, h, '#c8102e'); x.strokeStyle = '#f5c400'; x.lineWidth = f.s * 0.06; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(f.cx - f.s * 0.2 + i * f.s * 0.13, f.cy + f.s * 0.35 - i * f.s * 0.12, f.s * 0.45, Math.PI * 1.15, Math.PI * 1.75); x.stroke(); } },
    zh(x, w, h, f) { bg(x, w, h, '#c8102e'); x.fillStyle = '#f2b632'; x.beginPath(); x.arc(f.cx, f.cy, f.s * 0.4, 0, Math.PI * 2); x.fill(); LOGO.egret(x, f.cx, f.cy, f.s * 0.55, '#c8102e'); },
    fm(x, w, h, f) { bg(x, w, h, '#c8102e'); LOGO.egret(x, f.cx, f.cy, f.s * 0.95, '#ffffff'); },
    lh(x, w, h, f) { bg(x, w, h, '#05164d'); LOGO.crane(x, f.cx, f.cy, f.s * 0.85, '#ffffff'); },
    ay(x, w, h, f) { bg(x, w, h, '#ffffff'); x.save(); x.translate(f.cx, f.cy); x.transform(1, 0, -0.22, 1, 0, 0); label(x, 'F', 0, 0, f.s, '#0b1560', 900); x.restore(); },
    ba(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, 0.18, 0.38, 0.05, 0.25, '#c8102e'); band(x, f, 0.44, 0.66, 0.3, 0.5, '#1b2b5a'); band(x, f, 0.7, 0.78, 0.56, 0.64, '#c8102e'); },
    cx(x, w, h, f) { bg(x, w, h, '#005d63'); x.strokeStyle = '#fff'; x.lineWidth = f.s * 0.12; x.lineCap = 'round'; x.beginPath(); x.moveTo(f.cx - f.s * 0.4, f.cy + f.s * 0.25); x.quadraticCurveTo(f.cx, f.cy - f.s * 0.55, f.cx + f.s * 0.45, f.cy - f.s * 0.1); x.stroke(); },
    sq(x, w, h, f) { bg(x, w, h, '#0b2a6f'); LOGO.egret(x, f.cx, f.cy, f.s * 0.9, '#f0ab00'); },
    ek(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, 0.2, 0.36, 0.1, 0.26, '#00843d'); band(x, f, 0.52, 0.68, 0.42, 0.58, '#111111'); x.fillStyle = '#d0021b'; x.fillRect(0, 0, f.at(0.5).xl + (f.at(0.5).xt - f.at(0.5).xl) * 0.25, h); },
    tk(x, w, h, f) { bg(x, w, h, '#c8102e'); x.fillStyle = '#fff'; x.beginPath(); x.arc(f.cx, f.cy, f.s * 0.45, 0, Math.PI * 2); x.fill(); LOGO.egret(x, f.cx, f.cy, f.s * 0.6, '#c8102e'); },
    qr(x, w, h, f) { bg(x, w, h, '#5c0632'); x.strokeStyle = '#e8e2e5'; x.lineWidth = f.s * 0.05; x.beginPath(); x.moveTo(f.cx - f.s * 0.2, f.cy + f.s * 0.4); x.quadraticCurveTo(f.cx - f.s * 0.1, f.cy - f.s * 0.3, f.cx + f.s * 0.4, f.cy - f.s * 0.45); x.moveTo(f.cx - f.s * 0.05, f.cy + f.s * 0.4); x.quadraticCurveTo(f.cx + f.s * 0.05, f.cy - f.s * 0.2, f.cx + f.s * 0.5, f.cy - f.s * 0.32); x.stroke(); },
    nh(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, -0.1, 0.62, -0.1, 0.62, '#13448f'); band(x, f, 0.66, 0.72, 0.66, 0.72, '#00a3e0'); label(x, 'ANA', f.cx, f.cy - f.s * 0.05, f.s * 0.42, '#ffffff', 900); },
    to(x, w, h, f) { bg(x, w, h, '#00a651'); label(x, 't', f.cx, f.cy, f.s * 0.9, '#ffffff', 900); x.fillStyle = '#0a2a6b'; x.fillRect(f.cx + f.s * 0.2, f.cy - f.s * 0.42, f.s * 0.14, f.s * 0.14); },
    os(x, w, h, f) { bg(x, w, h, '#d8001a'); band(x, f, 0.38, 0.6, 0.3, 0.52, '#ffffff'); },
    fr(x, w, h, f) { bg(x, w, h, '#073590'); LOGO.harp(x, f.cx, f.cy, f.s * 0.85); },
    vy(x, w, h, f) { bg(x, w, h, '#ffcc00'); x.strokeStyle = '#4a4a4a'; x.lineWidth = f.s * 0.12; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(f.cx - f.s * 0.3, f.cy - f.s * 0.3); x.lineTo(f.cx, f.cy + f.s * 0.35); x.lineTo(f.cx + f.s * 0.35, f.cy - f.s * 0.4); x.stroke(); },
    gen(x, w, h, f, liv) { bg(x, w, h, '#c9d1dc'); if (liv.code) label(x, liv.code, f.cx, f.cy, f.s * 0.5, '#2b3440'); },
  };
  function paintTail(liv, mirror, F) {
    const h = 512, w = Math.min(1024, Math.round(h * F.aspect)), c = cnv(w, h), x = c.getContext('2d');
    if (mirror) { x.translate(w, 0); x.scale(-1, 1); }   // the other side sees the art mirrored, so draw it mirrored to read nose-first
    (TAILS[liv.tail] || TAILS.gen)(x, w, h, finFrame(F, w, h), liv);
    return c;
  }

  // Fuselage texture: u along the length (nose → tail), v around (0 top, .25 side z+, .5 belly, .75 side z−)
  function paintFuselage(liv, L, R) {
    const cw = 2048, ch = 512, c = cnv(cw, ch), x = c.getContext('2d');
    const k = (2 * Math.PI * R / ch) / (L / cw);   // texel aspect
    x.fillStyle = liv.body || W; x.fillRect(0, 0, cw, ch);
    const bf = liv.bellyFrom || 0.4; x.fillStyle = liv.belly || '#e3e7ec'; x.fillRect(0, bf * ch, cw, (1 - 2 * bf) * ch);
    if (liv.top) { x.fillStyle = liv.top; x.fillRect(0, 0, cw, liv.topTo * ch); x.fillRect(0, (1 - liv.topTo) * ch, cw, liv.topTo * ch); }
    (liv.cheat || []).forEach(([v, w, col]) => { x.fillStyle = col; x.fillRect(0.05 * cw, v * ch, 0.9 * cw, w * ch); x.fillRect(0.05 * cw, (1 - v - w) * ch, 0.9 * cw, w * ch); });
    // windows (both sides), cockpit, doors
    const winV = 0.205, winH = 0.026 * ch, winW = Math.max(3, 0.42 / L * cw);
    x.fillStyle = '#1d2733';
    for (let u = 0.13; u < 0.82; u += 0.53 / L) {
      x.beginPath(); x.roundRect(u * cw, winV * ch - winH / 2, winW, winH, winW / 2); x.fill();
      x.beginPath(); x.roundRect(u * cw, (1 - winV) * ch - winH / 2, winW, winH, winW / 2); x.fill();
    }
    x.fillStyle = '#121a24'; x.fillRect(0.022 * cw, 0.155 * ch, 0.03 * cw, 0.035 * ch); x.fillRect(0.022 * cw, (0.845 - 0.035) * ch, 0.03 * cw, 0.035 * ch);
    x.strokeStyle = 'rgba(40,50,62,0.35)'; x.lineWidth = 2;
    [0.1, 0.42, 0.86].forEach(u => [0.19, 0.81].forEach(v => x.strokeRect(u * cw, (v - 0.045) * ch, 0.9 / L * cw, 0.11 * ch)));
    // logo + titles in the band between the crown and the windows (v 0.065…0.185), reading nose → tail on both sides
    const t = liv.text || [], vT = 0.065 * ch, vB = 0.185 * ch, bandH = vB - vT;
    const lines = t.length > 1 ? [[t[0], vT + bandH * 0.31, bandH * 0.56, 700], [t[1], vB - bandH * 0.15, bandH * 0.27, 600]] : t.length ? [[t[0], vT + bandH / 2, bandH * 0.78, 700]] : [];
    let u0 = 0.17 * cw;
    if (liv.fusLogo && LOGO[liv.fusLogo]) {
      const ls = bandH * 0.95 * k, lx = u0 + ls * 0.5, vm = vT + bandH / 2;
      [[vm, false], [ch - vm, true]].forEach(([vy, rot]) => { x.save(); x.translate(lx, vy); if (rot) x.rotate(Math.PI); x.scale(1, 1 / k); LOGO[liv.fusLogo](x, 0, 0, ls, liv.fusLogoColor); x.restore(); });
      u0 += ls * 1.1;
    }
    const maxW = 0.34 * cw;
    lines.forEach(([str, v, hv, wt], li) => {
      let size = hv * k * 1.18;   // font size whose glyphs are about hv texels tall on the surface
      x.font = `${wt} ${size}px ${li ? FONT : (liv.serif ? 'Georgia, serif' : FONT)}`;
      const wpx = x.measureText(str).width; if (wpx > maxW) size *= maxW / wpx;
      const o = { serif: !li && liv.serif, italic: liv.italic, weight: wt };
      text(x, str, u0, v, size, liv.textColor, k, o);
      text(x, str, u0, ch - v, size, liv.textColor, k, { ...o, rot: true, align: 'right' });
    });
    return c;
  }

  // ── Geometry ──
  // Loft between polygon sections (same vertex count); faces facing z≥0 → group 0, z<0 → group 1 (two-sided liveries)
  function loft(sections, uvFn, caps = true) {
    const A = [], B = [];
    const push = (arr, a, b, c) => arr.push(a, b, c);
    const tri = (a, b, c) => { const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)); push(n.z >= 0 ? A : B, a, b, c); };
    for (let s = 0; s < sections.length - 1; s++) {
      const p = sections[s], q = sections[s + 1], n = p.length;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(p[i], q[i], q[j]); tri(p[i], q[j], p[j]); }
    }
    if (caps) [sections[0], sections[sections.length - 1]].forEach((poly, ci) => { const c0 = poly.reduce((m, v) => m.add(v), new T.Vector3()).multiplyScalar(1 / poly.length);
      for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; ci ? tri(c0, poly[i], poly[j]) : tri(c0, poly[j], poly[i]); } });
    const all = A.concat(B), pos = new Float32Array(all.length * 3), uv = new Float32Array(all.length * 2);
    all.forEach((v, i) => { pos.set([v.x, v.y, v.z], i * 3); const t = uvFn ? uvFn(v) : [0, 0]; uv.set(t, i * 2); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.addGroup(0, A.length, 0); g.addGroup(A.length, B.length, 1); g.computeVertexNormals(); return g;
  }
  // NACA-like section: points (along chord 0..1, thickness offset) going round from the trailing edge
  const XS = [1, 0.75, 0.5, 0.3, 0.15, 0.05, 0, 0.05, 0.15, 0.3, 0.5, 0.75];
  const yt = x => 5 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const airfoil = t => XS.map((x, i) => [x, (i <= 6 ? 1 : -0.75) * t * yt(x)]);
  // Horizontal surface section at spanwise z: chord along x, thickness along y
  const hSec = (xle, y, z, c, t) => airfoil(t).map(([a, b]) => new T.Vector3(xle + a * c, y + b * c, z));
  // Vertical surface section at height y: chord along x, thickness along z
  const vSec = (xle, y, z0, c, t) => airfoil(t).map(([a, b]) => new T.Vector3(xle + a * c, y, z0 + b * c));

  function buildAircraft(code, airline) {
    const d = DIMS[code] || DIMS[FALLBACK[window.Aviation?.type(code)?.body] || 'A320'];
    const [L, S, D, sweep, o] = d, R = D / 2, liv = liveryOf(airline);
    const grp = new T.Group();
    const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12, side: T.DoubleSide, ...extra });
    const hf = o.deck2 ? 1.2 : 1.03;   // height factor of the cross-section

    // Fuselage profile: centre height, vertical and horizontal radius at t = 0 (nose) … 1 (tail)
    const tn = Math.min(0.13, 2.1 * R / L), tt = 1 - Math.min(0.34, 5.2 * R / L);
    const prof = t => {
      let top = R * hf, bot = -R * hf, rz = R;
      if (t < tn) { const a = t / tn, e = Math.sqrt(Math.max(0, 1 - (1 - a) ** 2)); const droop = -0.28 * R * (1 - a) ** 2; top = droop + (top) * e; bot = droop + bot * e; rz = R * e; }
      if (t > tt) { const s = (t - tt) / (1 - tt); top = R * hf * (1 - 0.32 * s ** 1.4); bot = -R * hf + (R * hf * 2 - R * 0.32 - R * hf * 0.32) * s ** 1.25; rz = R * (1 - 0.86 * s ** 1.15); }
      if (o.hump) { const h = t < 0.06 ? 0 : t < 0.12 ? (t - 0.06) / 0.06 : t < 0.3 ? 1 : t < 0.42 ? 1 - (t - 0.3) / 0.12 : 0; top += 0.42 * R * Math.sin(h * Math.PI / 2); }
      return { yc: (top + bot) / 2, ry: Math.max(0.001, (top - bot) / 2), rz: Math.max(0.001, rz) };
    };
    const NS = 72, NC = 40, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, p = prof(t), x = t * L - L / 2;
      for (let j = 0; j <= NC; j++) { const th = j / NC * Math.PI * 2; pos.push(x, p.yc + p.ry * Math.cos(th), p.rz * Math.sin(th)); uv.push(t, j / NC); }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }   // counter-clockwise seen from outside
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
    grp.add(new T.Mesh(fg, new T.MeshStandardMaterial({ map: tex(paintFuselage(liv, L, R)), roughness: 0.35, metalness: 0.1 })));

    // Wings
    const high = o.wing === 'high', yw = high ? R * 0.82 : -R * 0.5, zr = R * 0.75, b = S / 2 - zr;
    const cr = (o.mount === 'prop' ? 0.082 : 0.19) * S * (L > 60 ? 0.85 : 1), ct = cr * (o.mount === 'prop' ? 0.55 : 0.27);
    const xr = -L / 2 + L * (o.mount === 'rear' ? 0.43 : o.mount === 'prop' ? 0.42 : 0.37), le = Math.tan((sweep + 4) * Math.PI / 180), dih = high ? -0.02 : Math.tan(5.5 * Math.PI / 180);
    const wingMat = mat('#c5ccd6'), wlMat = mat(liv.winglet || '#c5ccd6');
    const wingAt = f => ({ x: xr + le * b * f, y: yw + dih * b * f, c: cr + (ct - cr) * f });
    [1, -1].forEach(sd => {
      const st = [0, 0.33, 1].map(f => { const w = wingAt(f); return hSec(w.x, w.y, sd * (zr + b * f), w.c, f ? 0.1 : 0.13); });
      grp.add(new T.Mesh(loft(st), [wingMat, wingMat]));
      // winglets
      const tip = wingAt(1), tz = sd * (zr + b);
      const up = (h, cant, ch, back = 0) => { const s0 = hSec(tip.x, tip.y, tz, ch, 0.08), s1 = hSec(tip.x + h * 0.9 + back, tip.y + h, tz + sd * cant, ch * 0.45, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [wlMat, wlMat])); };
      if (o.tip === 'sharklet') up(S * 0.07, S * 0.012, ct * 0.9);
      else if (o.tip === 'blended') up(S * 0.07, S * 0.02, ct * 0.85);
      else if (o.tip === 'max') { up(S * 0.07, S * 0.015, ct * 0.85); const s0 = hSec(tip.x, tip.y, tz, ct * 0.6, 0.08), s1 = hSec(tip.x + S * 0.03, tip.y - S * 0.035, tz, ct * 0.3, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [wingMat, wingMat])); }
      else if (o.tip === 'small') up(S * 0.045, S * 0.008, ct * 0.8);
      else if (o.tip === 'fence') { const s0 = hSec(tip.x - ct * 0.1, tip.y - S * 0.012, tz, ct * 0.75, 0.06), s1 = hSec(tip.x + ct * 0.15, tip.y + S * 0.025, tz, ct * 0.45, 0.06); grp.add(new T.Mesh(loft([s0, s1]), [wlMat, wlMat])); }
    });
    // belly fairing
    if (!high) { const fair = new T.Mesh(new T.SphereGeometry(1, 24, 12), mat(liv.belly || '#e6e9ee')); fair.scale.set(cr * 0.75, R * 0.42, R * 0.82); fair.position.set(xr + cr * 0.5, -R * 0.68, 0); grp.add(fair); }

    // Engines
    const engMat = mat(liv.engine || '#e9ecf0'), lipMat = mat(liv.lip || '#b8c1cb', { metalness: 0.55, roughness: 0.3 }), darkMat = mat('#1a2028', { roughness: 0.6 }), metal = mat('#9aa3ad', { metalness: 0.6, roughness: 0.3 });
    const nacelle = (ed, len) => {
      const pts = [[0, ed * 0.42], [0.04, ed * 0.5], [0.12, ed * 0.5], [0.55, ed * 0.47], [0.85, ed * 0.36], [1, ed * 0.28]].map(([a, r]) => new T.Vector2(r, a * len));
      const g = new T.Group(), shell = new T.Mesh(new T.LatheGeometry(pts, 40), engMat); g.add(shell);
      const lip = new T.Mesh(new T.TorusGeometry(ed * 0.46, ed * 0.045, 8, 40), lipMat); lip.rotation.x = Math.PI / 2; lip.position.y = len * 0.015; g.add(lip);
      const fan = new T.Mesh(new T.CircleGeometry(ed * 0.43, 32), darkMat); fan.position.y = 0.06 * len; fan.rotation.x = Math.PI / 2; g.add(fan);
      const spin = new T.Mesh(new T.ConeGeometry(ed * 0.13, ed * 0.3, 20), metal); spin.position.y = 0.04 * len; spin.rotation.x = Math.PI; g.add(spin);
      const noz = new T.Mesh(new T.CylinderGeometry(ed * 0.2, ed * 0.27, len * 0.18, 24), metal); noz.position.y = len * 1.05; g.add(noz);
      g.rotation.z = -Math.PI / 2;   // lathe axis (+y, inlet → exhaust) → +x, so the inlet faces forward (−x is the nose)
      return g;
    };
    if (o.mount === 'wing') {
      const ed = o.ed, len = ed * 2.1, spots = o.eng === 4 ? [0.36, 0.66] : [0.34];
      spots.forEach(f => [1, -1].forEach(sd => {
        const w = wingAt(f), z = sd * (zr + b * f), e = nacelle(ed, len);
        e.position.set(w.x - len * 0.62, w.y - ed * 0.55, z); grp.add(e);
        const py = new T.Mesh(new T.BoxGeometry(len * 0.7, ed * 0.42, ed * 0.12), engMat); py.position.set(w.x - len * 0.05, w.y - ed * 0.18, z); grp.add(py);
      }));
    } else if (o.mount === 'rear') {
      const ed = o.ed, len = ed * 2.4;
      [1, -1].forEach(sd => { const e = nacelle(ed, len), x0 = -L / 2 + L * 0.7; e.position.set(x0, R * 0.35, sd * (R + ed * 0.72)); grp.add(e);
        const py = new T.Mesh(new T.BoxGeometry(len * 0.5, ed * 0.16, ed * 0.8), engMat); py.position.set(x0 + len * 0.5, R * 0.35, sd * (R + ed * 0.2)); grp.add(py); });
    } else {   // turboprops: nacelle on the high wing, propeller in front
      [1, -1].forEach(sd => {
        const f = 0.3, w = wingAt(f), z = sd * (zr + b * f), len = L * 0.2;
        const nac = new T.Mesh(new T.CapsuleGeometry(o.ed * 0.55, len, 8, 20), engMat); nac.rotation.z = Math.PI / 2; nac.position.set(w.x + len * 0.2, w.y - o.ed * 0.3, z); grp.add(nac);
        const prop = new T.Group(); prop.position.set(w.x - len * 0.42, w.y - o.ed * 0.3, z);
        const hub = new T.Mesh(new T.ConeGeometry(o.ed * 0.35, o.ed * 0.8, 20), metal); hub.rotation.z = Math.PI / 2; prop.add(hub);
        const disc = new T.Mesh(new T.CircleGeometry(S * 0.07, 40), new T.MeshBasicMaterial({ color: '#c9d6e3', transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false })); disc.rotation.y = Math.PI / 2; prop.add(disc);
        const blades = new T.Group(); for (let i = 0; i < 6; i++) { const bl = new T.Mesh(new T.BoxGeometry(0.04, S * 0.068, 0.16), mat('#3a434e')); bl.position.y = S * 0.035; const p0 = new T.Group(); p0.add(bl); p0.rotation.x = i * Math.PI / 3; blades.add(p0); }
        prop.add(blades); prop.userData.spin = blades; grp.add(prop);
      });
    }

    // Tail: fin with the livery on both sides, horizontal stabiliser
    const tFin = o.tail === 'T', finH = D * (tFin ? 1.45 : 1.55) * (o.deck2 ? 1.05 : 1), crf = L * (tFin ? 0.13 : 0.15), ctf = crf * (tFin ? 0.75 : 0.38);
    const xf = L / 2 - crf - L * 0.015, yb = prof(0.88).yc + prof(0.88).ry * 0.7, fsw = Math.tan((tFin ? 38 : 40) * Math.PI / 180);
    const xMin = xf, xMax = xf + finH * fsw + ctf, yMin = yb, yMax = yb + finH;
    const finUV = v => [(v.x - xMin) / (xMax - xMin), 1 - (v.y - yMin) / (yMax - yMin)];
    const fin = loft([vSec(xf, yb, 0, crf, 0.11), vSec(xf + finH * 0.5 * fsw, yb + finH * 0.5, 0, (crf + ctf) / 2, 0.1), vSec(xf + finH * fsw, yb + finH, 0, ctf, 0.09)], finUV);
    // fin outline in texture coordinates (0..1, top = 0), so tail art is placed inside the real fin shape
    const bw = xMax - xMin, finShape = { aspect: bw / finH, poly: [[0, 1], [crf / bw, 1], [(finH * fsw + ctf) / bw, 0], [finH * fsw / bw, 0]] };
    const tailMat = mir => new T.MeshStandardMaterial({ map: tex(paintTail(liv, mir, finShape)), roughness: 0.35, metalness: 0.1, side: T.DoubleSide });
    grp.add(new T.Mesh(fin, [tailMat(false), tailMat(true)]));
    const hs = S * (tFin ? 0.32 : 0.36) / 2, crh = L * 0.085, cth = crh * 0.38, hsw = Math.tan((sweep + 7) * Math.PI / 180);
    const yh = tFin ? yMax - finH * 0.02 : prof(0.9).yc, xh = tFin ? xf + finH * fsw - crh * 0.25 : L / 2 - L * 0.135;
    const stabMat = mat(tFin ? '#d9dee5' : '#c5ccd6');
    [1, -1].forEach(sd => grp.add(new T.Mesh(loft([hSec(xh, yh, 0, crh, 0.1), hSec(xh + hs * hsw, yh + (tFin ? 0 : hs * 0.1), sd * hs, cth, 0.09)]), [stabMat, stabMat])));

    // Normalise: centred, longest dimension = 2 units
    const box = new T.Box3().setFromObject(grp), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const sc = 2 / Math.max(size.x, size.z); grp.children.forEach(m => m.position.sub(ctr));
    const wrap = new T.Group(); wrap.add(grp); wrap.scale.setScalar(sc);
    wrap.userData = { liv, code, L, S };
    return wrap;
  }

  // ── Scene: lights and a holographic ring, coloured for the light or dark theme ──
  let THEME = 'dark';
  function makeScene(theme) {
    const sc = new T.Scene(), light = theme === 'light', accent = light ? '#0a7ea6' : '#4de1ff';
    sc.add(new T.HemisphereLight(light ? '#ffffff' : '#e6f0ff', light ? '#9fb0c4' : '#1a2840', light ? 1.35 : 1.15));
    const sun = new T.DirectionalLight('#ffffff', light ? 1.6 : 1.9); sun.position.set(-2, 3, 2.5); sc.add(sun);
    const rim = new T.DirectionalLight(accent, light ? 0.35 : 0.9); rim.position.set(2, 1, -3); sc.add(rim);
    const ring = new T.Group(), lineMat = new T.MeshBasicMaterial({ color: accent, transparent: true, opacity: light ? 0.45 : 0.35, side: T.DoubleSide, depthWrite: false });
    [1.05, 1.25].forEach((r, i) => { const m = new T.Mesh(new T.RingGeometry(r - 0.006, r, 96), lineMat.clone()); m.material.opacity = i ? lineMat.opacity / 2 : lineMat.opacity; ring.add(m); });
    for (let i = 0; i < 24; i++) { const t = new T.Mesh(new T.PlaneGeometry(0.004, i % 6 ? 0.04 : 0.09), lineMat); const a = i / 24 * Math.PI * 2; t.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); t.rotation.z = a + Math.PI / 2; ring.add(t); }
    ring.add(new T.Mesh(new T.CircleGeometry(1.05, 64), new T.MeshBasicMaterial({ color: accent, transparent: true, opacity: light ? 0.07 : 0.05, depthWrite: false })));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.32; sc.add(ring);
    return sc;
  }
  function frameCamera(cam, zoom = 1) { cam.position.set(-1.25 / zoom, 0.62 / zoom, 2.6 / zoom); cam.lookAt(0, -0.1, 0); }
  function dispose(obj) { obj.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Hangar cards: one shared renderer, a still picture per card, rotation only while hovered ──
  // Models exist only while they are drawn (a card snapshot) or hovered, so memory stays low.
  const RW = 560, RH = 350, YAW0 = -0.15;
  let R0 = null, SCENE = null, CAM = null, IO = null, HOVER = null;
  const CARDS = new Map(), QUEUE = [];
  function ensureShared() {
    if (R0) return;
    R0 = new T.WebGLRenderer({ canvas: cnv(RW, RH), antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    R0.setPixelRatio(1); R0.setSize(RW, RH, false); R0.outputColorSpace = T.SRGBColorSpace; R0.toneMapping = T.ACESFilmicToneMapping; R0.toneMappingExposure = 1.05;
    SCENE = makeScene(THEME); CAM = new T.PerspectiveCamera(30, RW / RH, 0.1, 50); frameCamera(CAM, 1.08);
    IO = new IntersectionObserver(es => es.forEach(e => { const st = CARDS.get(e.target); if (!st) return; st.visible = e.isIntersecting; if (st.visible && !st.done) enqueue(e.target); }), { rootMargin: '600px' });
  }
  function draw(cv, model, yaw, pitch) {
    SCENE.add(model); model.rotation.set(pitch, yaw, 0); R0.render(SCENE, CAM); SCENE.remove(model);
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(R0.domElement, 0, 0, cv.width, cv.height);
  }
  function enqueue(cv) { if (!QUEUE.includes(cv)) QUEUE.push(cv); if (QUEUE.length === 1) setTimeout(work, 0); }
  function work() {   // one snapshot per task, so a long hangar never blocks the page
    const cv = QUEUE.shift(); if (!cv) return;
    const st = CARDS.get(cv);
    if (st && cv.isConnected && !st.done && HOVER?.cv !== cv) { const m = buildAircraft(st.type, st.airline); draw(cv, m, st.yaw, st.pitch); dispose(m); st.done = true; }
    if (QUEUE.length) setTimeout(work, 16);
  }
  function startHover(cv) {
    const st = CARDS.get(cv); if (!st || reduced()) return;
    stopHover();
    HOVER = { cv, st, model: buildAircraft(st.type, st.airline), last: performance.now(), raf: 0 };
    const tick = now => {
      if (!HOVER || HOVER.cv !== cv) return;
      if (!st.dragging) st.yaw += (now - HOVER.last) * 0.0009;
      HOVER.last = now; draw(cv, HOVER.model, st.yaw, st.pitch); HOVER.raf = requestAnimationFrame(tick);
    };
    HOVER.raf = requestAnimationFrame(tick);
  }
  function stopHover() { if (!HOVER) return; cancelAnimationFrame(HOVER.raf); dispose(HOVER.model); HOVER = null; }
  function wireCard(cv, st) {
    cv.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') startHover(cv); });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && HOVER?.cv === cv) { stopHover(); } });
    let p0 = null;
    cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; p0 = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false }; st.dragging = true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; if (Math.abs(dx) + Math.abs(dy) > 4) p0.moved = true; st.yaw = p0.yaw + dx * 0.01; st.pitch = Math.max(-0.5, Math.min(0.5, p0.pitch + dy * 0.006)); });
    const up = () => { if (!p0) return; cv.dataset.dragged = p0.moved ? '1' : ''; p0 = null; st.dragging = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  let LOADING = null;
  const Fleet3D = {
    load() {
      if (T) return Promise.resolve(true);
      return LOADING ||= new Promise(res => {
        const probe = cnv(2, 2); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return res(false);
        const s = document.createElement('script'); s.src = 'vendor/three.min.js'; s.onload = () => { T = window.THREE; res(!!T); }; s.onerror = () => res(false); document.head.appendChild(s);
      });
    },
    has: code => !!DIMS[String(code || '').toUpperCase()],
    liveryName: (iata, lang) => { const l = LIV[String(iata || '').toUpperCase()]; return l ? (lang === 'zh' ? l.zh : l.name) : ''; },
    // Register a hangar card canvas (16:10); it is drawn once when it scrolls into view
    card(cv, { type, airline }) {
      ensureShared();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
      cv.width = Math.round((r.width || 280) * dpr); cv.height = Math.round(cv.width * RH / RW);
      const st = { type, airline, yaw: YAW0, pitch: 0, visible: false, done: false };
      CARDS.set(cv, st); wireCard(cv, st); IO.observe(cv);
    },
    setAirline(cv, airline) { const st = CARDS.get(cv); if (!st) return; st.airline = airline; st.done = false; if (HOVER?.cv === cv) { stopHover(); startHover(cv); } else enqueue(cv); },
    setTheme(theme) {
      const t = theme === 'light' ? 'light' : 'dark';
      if (t === THEME) return;
      THEME = t;
      if (!R0) return;
      dispose(SCENE); SCENE = makeScene(THEME);
      for (const [cv, st] of CARDS) { if (!cv.isConnected) { CARDS.delete(cv); IO.unobserve(cv); continue; } st.done = false; if (st.visible) enqueue(cv); }
    },
    // Full-size viewer with its own renderer: slow rotation, drag to turn, wheel / pinch to zoom
    viewer(host, { type, airline, yaw = YAW0, zoom = 1 }) {
      const cv = cnv(10, 10); cv.className = 'v3d-canvas'; host.appendChild(cv);
      const rnd = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      rnd.outputColorSpace = T.SRGBColorSpace; rnd.toneMapping = T.ACESFilmicToneMapping; rnd.toneMappingExposure = 1.05; rnd.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      let scene = makeScene(THEME); const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
      const st = { yaw, pitch: 0, zoom, dragging: false };
      let model = buildAircraft(type, airline); scene.add(model);
      const size = () => { const w = host.clientWidth, h = host.clientHeight; rnd.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      size(); const ro = new ResizeObserver(size); ro.observe(host);
      let p0 = null;
      cv.addEventListener('pointerdown', e => { p0 = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; st.dragging = true; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (!p0) return; st.yaw = p0.yaw + (e.clientX - p0.x) * 0.01; st.pitch = Math.max(-0.6, Math.min(0.6, p0.pitch + (e.clientY - p0.y) * 0.006)); });
      const up = () => { p0 = null; st.dragging = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(3, st.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
      let pinch = null;
      cv.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: st.zoom }; }, { passive: true });
      cv.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); st.zoom = Math.max(0.6, Math.min(3, pinch.z * d / pinch.d)); } }, { passive: true });
      cv.addEventListener('touchend', () => { pinch = null; });
      let raf = 0, last = performance.now();
      const tick = now => { raf = requestAnimationFrame(tick); if (!st.dragging && !reduced()) st.yaw += (now - last) * 0.00025; last = now;
        model.rotation.set(st.pitch, st.yaw, 0); model.traverse(o => { if (o.userData.spin) o.userData.spin.rotation.x = now * 0.02; });
        frameCamera(cam, st.zoom * Math.min(1, Math.max(0.58, cam.aspect / 1.3))); rnd.render(scene, cam); };
      raf = requestAnimationFrame(tick);
      return {
        setAirline(al) { scene.remove(model); dispose(model); model = buildAircraft(type, al); scene.add(model); },
        setTheme(t) { scene.remove(model); dispose(scene); scene = makeScene(t === 'light' ? 'light' : 'dark'); scene.add(model); },
        destroy() { cancelAnimationFrame(raf); ro.disconnect(); dispose(model); dispose(scene); rnd.dispose(); rnd.forceContextLoss?.(); cv.remove(); },
      };
    },
  };
  window.Fleet3D = Fleet3D;
})();
