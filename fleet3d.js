/* fleet3d.js: procedural 3D airliners in airline liveries for the hangar on flights.html.
 *
 * Each model is built from the type's real dimensions (length, span, fuselage diameter, wing sweep,
 * engine size, engine and tail layout, winglets); liveries are simplified renderings of the airlines'
 * standard colour schemes, painted onto canvas textures (fuselage, tail fin, engines).
 * Three.js (vendor/three.min.js) is loaded on demand. All hangar cards share ONE WebGL renderer
 * (browsers cap the number of WebGL contexts), and each card is a 2D canvas the frame is copied into.
 *
 * Usage: Fleet3D.load().then(ok => …); Fleet3D.card(canvas, { type, airline }); Fleet3D.setAirline(canvas, iata);
 *        Fleet3D.viewer(host, { type, airlines, airline }) → { setAirline, destroy }; Fleet3D.liveryName(iata, lang)
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

  // ── Liveries (simplified) ──
  // body/belly/top colours, cheatlines (v positions on the fuselage texture), lettering, engine colour, tail art
  const W = '#f7f8fa', GREY = '#d8dde4';
  const LIV = {
    KL: { name: 'KLM', zh: '荷兰皇家航空', top: '#00a1de', topTo: 0.29, cheat: [[0.3, 0.008, '#ffffff'], [0.312, 0.004, '#0c2e6d']], text: ['KLM', 'Royal Dutch Airlines'], textColor: '#ffffff', textOnTop: true, engine: '#00a1de', tail: 'klm' },
    AF: { name: 'Air France', zh: '法国航空', text: ['AIRFRANCE'], textColor: '#002157', engine: '#f2f4f7', tail: 'af', belly: '#e9ecf0' },
    CZ: { name: 'China Southern', zh: '中国南方航空', cheat: [[0.315, 0.012, '#4f9ed8']], text: ['中国南方航空', 'CHINA SOUTHERN'], textColor: '#0c4d97', engine: W, tail: 'cz' },
    CA: { name: 'Air China', zh: '中国国际航空', text: ['中国国际航空公司', 'AIR CHINA'], textColor: '#1a1a1a', engine: W, tail: 'ca' },
    MF: { name: 'Xiamen Air', zh: '厦门航空', text: ['厦门航空', 'XIAMENAIR'], textColor: '#16428f', engine: '#16428f', tail: 'mf' },
    MU: { name: 'China Eastern', zh: '中国东方航空', text: ['中国东方航空', 'CHINA EASTERN'], textColor: '#13336b', engine: W, tail: 'mu' },
    HU: { name: 'Hainan Airlines', zh: '海南航空', text: ['海南航空', 'HAINAN AIRLINES'], textColor: '#b5121b', engine: W, tail: 'hu' },
    '3U': { name: 'Sichuan Airlines', zh: '四川航空', text: ['四川航空', 'SICHUAN AIRLINES'], textColor: '#b5121b', engine: W, tail: '3u' },
    ZH: { name: 'Shenzhen Airlines', zh: '深圳航空', text: ['深圳航空', 'SHENZHEN AIRLINES'], textColor: '#b5121b', engine: W, tail: 'zh' },
    FM: { name: 'Shanghai Airlines', zh: '上海航空', text: ['上海航空', 'SHANGHAI AIRLINES'], textColor: '#b5121b', engine: W, tail: 'fm' },
    LH: { name: 'Lufthansa', zh: '汉莎航空', text: ['Lufthansa'], textColor: '#05164d', serif: true, engine: '#05164d', tail: 'lh' },
    AY: { name: 'Finnair', zh: '芬兰航空', text: ['FINNAIR'], textColor: '#0b1560', engine: W, tail: 'ay' },
    BA: { name: 'British Airways', zh: '英国航空', belly: '#1b2b5a', bellyFrom: 0.36, cheat: [[0.355, 0.006, '#c8102e']], text: ['BRITISH AIRWAYS'], textColor: '#1b2b5a', engine: '#e9ecf0', tail: 'ba' },
    CX: { name: 'Cathay Pacific', zh: '国泰航空', cheat: [[0.33, 0.01, '#8fa8a5']], text: ['CATHAY PACIFIC', '國泰航空'], textColor: '#005d63', engine: '#e9ecf0', tail: 'cx' },
    SQ: { name: 'Singapore Airlines', zh: '新加坡航空', cheat: [[0.325, 0.006, '#f0ab00'], [0.334, 0.01, '#0b2a6f']], text: ['SINGAPORE AIRLINES'], textColor: '#0b2a6f', engine: '#e9ecf0', tail: 'sq' },
    EK: { name: 'Emirates', zh: '阿联酋航空', text: ['Emirates'], textColor: '#9a7b2f', serif: true, engine: '#e9ecf0', tail: 'ek' },
    TK: { name: 'Turkish Airlines', zh: '土耳其航空', text: ['TURKISH AIRLINES'], textColor: '#1b2b5a', engine: '#e9ecf0', tail: 'tk' },
    NH: { name: 'ANA', zh: '全日空', cheat: [[0.322, 0.01, '#13448f'], [0.336, 0.006, '#00a3e0']], text: ['ANA'], textColor: '#13448f', engine: '#e9ecf0', tail: 'nh' },
    TO: { name: 'Transavia', zh: '泛航航空', text: ['transavia'], textColor: '#00a651', engine: '#e9ecf0', tail: 'to' },
    OS: { name: 'Austrian', zh: '奥地利航空', text: ['Austrian'], textColor: '#d8001a', engine: '#e9ecf0', tail: 'os' },
    FR: { name: 'Ryanair', zh: '瑞安航空', belly: '#073590', bellyFrom: 0.34, cheat: [[0.335, 0.006, '#f1c933']], text: ['RYANAIR'], textColor: '#073590', engine: '#e9ecf0', tail: 'fr' },
    VY: { name: 'Vueling', zh: '伏林航空', text: ['vueling'], textColor: '#4a4a4a', engine: '#e9ecf0', tail: 'vy' },
    QR: { name: 'Qatar Airways', zh: '卡塔尔航空', text: ['QATAR AIRWAYS'], textColor: '#5c0632', engine: '#5c0632', tail: 'qr' },
  };
  const liveryOf = al => {
    const k = String(al?.iata || '').toUpperCase();
    if (LIV[k]) return { key: k, ...LIV[k] };
    return { key: 'gen:' + (al?.name || ''), name: al?.name || '', text: [String(al?.name || '').toUpperCase()].filter(Boolean), textColor: '#2b3440', engine: '#e9ecf0', tail: 'gen', code: k };
  };

  // ── Canvas helpers ──
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function tex(canvas) {
    const t = new T.CanvasTexture(canvas); t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
  }
  // Text squeezed so it looks undistorted on a surface whose texels are k times taller than wide
  function text(ctx, s, x, y, size, color, k, opt = {}) {
    ctx.save(); ctx.translate(x, y); if (opt.rot) ctx.rotate(Math.PI); ctx.scale(1, 1 / k);
    ctx.font = `${opt.weight || 700} ${size}px ${opt.serif ? 'Georgia, "Times New Roman", serif' : '"Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif'}`;
    ctx.fillStyle = color; ctx.textAlign = opt.align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); ctx.restore();
  }

  // Fuselage texture: u along the length (nose → tail), v around (0 top, .25 side z+, .5 belly, .75 side z−)
  function paintFuselage(liv, L, R) {
    const cw = 2048, ch = 512, c = cnv(cw, ch), x = c.getContext('2d');
    const k = (2 * Math.PI * R / ch) / (L / cw);   // texel aspect
    x.fillStyle = liv.body || W; x.fillRect(0, 0, cw, ch);
    // belly
    const bf = liv.bellyFrom || 0.4; x.fillStyle = liv.belly || '#e6e9ee'; x.fillRect(0, bf * ch, cw, (1 - 2 * bf) * ch);
    // top colour (KLM)
    if (liv.top) { x.fillStyle = liv.top; x.fillRect(0, 0, cw, liv.topTo * ch); x.fillRect(0, (1 - liv.topTo) * ch, cw, liv.topTo * ch); }
    // cheatlines, mirrored onto the other side
    (liv.cheat || []).forEach(([v, w, col]) => { x.fillStyle = col; x.fillRect(0.05 * cw, v * ch, 0.9 * cw, w * ch); x.fillRect(0.05 * cw, (1 - v - w) * ch, 0.9 * cw, w * ch); });
    // windows (both sides), cockpit and doors
    const winV = 0.205, winH = 0.026 * ch, winW = Math.max(3, 0.42 / L * cw);
    x.fillStyle = '#1d2733';
    for (let u = 0.13; u < 0.82; u += 0.53 / L) {
      x.beginPath(); x.roundRect(u * cw, winV * ch - winH / 2, winW, winH, winW / 2); x.fill();
      x.beginPath(); x.roundRect(u * cw, (1 - winV) * ch - winH / 2, winW, winH, winW / 2); x.fill();
    }
    x.fillStyle = '#121a24'; [[0.155, 0.845]].forEach(([a, b]) => { x.fillRect(0.022 * cw, a * ch, 0.03 * cw, 0.035 * ch); x.fillRect(0.022 * cw, (b - 0.035) * ch, 0.03 * cw, 0.035 * ch); });
    x.strokeStyle = 'rgba(40,50,62,0.35)'; x.lineWidth = 2;
    [0.1, 0.42, 0.86].forEach(u => [0.19, 0.81].forEach(v => x.strokeRect(u * cw, (v - 0.045) * ch, 0.9 / L * cw, 0.11 * ch)));
    // lettering above the windows, reading nose → tail on both sides
    const t = liv.text || [];
    if (t.length) {
      const size = Math.min(70, 1.5 / L * cw * 0.95), size2 = size * 0.62, u0 = 0.2 * cw;
      const v1 = (liv.textOnTop ? 0.135 : 0.14) * ch;
      text(x, t[0], u0, v1, size, liv.textColor, k, { serif: liv.serif });
      if (t[1]) text(x, t[1], u0, v1 + size * 0.95 / k + 6, size2, liv.textColor, k, { weight: 600 });
      // other side: rotated 180°
      text(x, t[0], u0, ch - v1, size, liv.textColor, k, { serif: liv.serif, rot: true, align: 'right' });
      if (t[1]) text(x, t[1], u0, ch - v1 - size * 0.95 / k - 6, size2, liv.textColor, k, { weight: 600, rot: true, align: 'right' });
    }
    return c;
  }

  // Tail art in fin coordinates: nose to the left, top at y = 0 (the fin occupies the lower-left to upper-right diagonal band)
  const TAILS = {
    klm(x, w, h) { bg(x, w, h, '#00a1de'); x.fillStyle = '#fff'; crown(x, w * 0.6, h * 0.36, h * 0.16); x.font = `900 ${h * 0.16}px Arial, sans-serif`; x.textAlign = 'center'; x.fillText('KLM', w * 0.6, h * 0.62); },
    af(x, w, h) { bg(x, w, h, '#ffffff'); slant(x, w, h, [[0.30, 0.42, '#002157'], [0.48, 0.56, '#e2001a']]); },
    cz(x, w, h) { bg(x, w, h, '#0b5aa6'); flower(x, w * 0.6, h * 0.42, h * 0.2, '#e60012', 5); },
    ca(x, w, h) { bg(x, w, h, '#ffffff'); phoenix(x, w * 0.6, h * 0.42, h * 0.2, '#d71920'); },
    mf(x, w, h) { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#173f8f'); g.addColorStop(0.55, '#173f8f'); g.addColorStop(0.56, '#6fb7e9'); g.addColorStop(1, '#6fb7e9'); x.fillStyle = g; x.fillRect(0, 0, w, h); bird(x, w * 0.58, h * 0.38, h * 0.22, '#ffffff'); },
    mu(x, w, h) { bg(x, w, h, '#ffffff'); const cx = w * 0.6, cy = h * 0.42, r = h * 0.18; x.fillStyle = '#d7000f'; x.beginPath(); x.arc(cx, cy, r, Math.PI, 0); x.fill(); x.fillStyle = '#13336b'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI); x.fill(); bird(x, cx, cy, r * 1.05, '#ffffff'); },
    hu(x, w, h) { bg(x, w, h, '#c8102e'); x.strokeStyle = '#f2b632'; x.lineWidth = h * 0.03; x.beginPath(); x.arc(w * 0.6, h * 0.42, h * 0.17, 0, Math.PI * 2); x.stroke(); bird(x, w * 0.6, h * 0.42, h * 0.16, '#f2b632'); },
    '3u'(x, w, h) { bg(x, w, h, '#c8102e'); x.strokeStyle = '#f5c400'; x.lineWidth = h * 0.028; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(w * (0.45 + i * 0.06), h * (0.62 - i * 0.07), h * 0.2, Math.PI * 1.15, Math.PI * 1.75); x.stroke(); } },
    zh(x, w, h) { bg(x, w, h, '#c8102e'); x.fillStyle = '#f2b632'; x.beginPath(); x.arc(w * 0.6, h * 0.42, h * 0.15, 0, Math.PI * 2); x.fill(); bird(x, w * 0.6, h * 0.42, h * 0.14, '#c8102e'); },
    fm(x, w, h) { bg(x, w, h, '#c8102e'); bird(x, w * 0.6, h * 0.42, h * 0.24, '#ffffff'); },
    lh(x, w, h) { bg(x, w, h, '#05164d'); x.strokeStyle = '#fff'; x.lineWidth = h * 0.022; x.beginPath(); x.arc(w * 0.6, h * 0.42, h * 0.18, 0, Math.PI * 2); x.stroke(); bird(x, w * 0.6, h * 0.42, h * 0.15, '#ffffff'); },
    ay(x, w, h) { bg(x, w, h, '#ffffff'); x.save(); x.translate(w * 0.6, h * 0.45); x.transform(1, 0, -0.25, 1, 0, 0); x.fillStyle = '#0b1560'; x.font = `900 ${h * 0.42}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('F', 0, 0); x.restore(); },
    ba(x, w, h) { bg(x, w, h, '#ffffff'); wave(x, w, h, 0.3, '#c8102e'); wave(x, w, h, 0.52, '#1b2b5a'); },
    cx(x, w, h) { bg(x, w, h, '#005d63'); x.strokeStyle = '#fff'; x.lineWidth = h * 0.05; x.lineCap = 'round'; x.beginPath(); x.moveTo(w * 0.42, h * 0.55); x.quadraticCurveTo(w * 0.62, h * 0.18, w * 0.82, h * 0.36); x.stroke(); },
    sq(x, w, h) { bg(x, w, h, '#0b2a6f'); bird(x, w * 0.6, h * 0.42, h * 0.22, '#f0ab00'); },
    ek(x, w, h) { bg(x, w, h, '#ffffff'); [['#00843d', 0.3], ['#ffffff', 0.4], ['#111111', 0.5]].forEach(([c, y]) => wave(x, w, h, y, c)); x.fillStyle = '#d0021b'; x.fillRect(0, 0, w * 0.32, h); },
    tk(x, w, h) { bg(x, w, h, '#c8102e'); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.6, h * 0.42, h * 0.18, 0, Math.PI * 2); x.fill(); bird(x, w * 0.6, h * 0.42, h * 0.15, '#c8102e'); },
    qr(x, w, h) { bg(x, w, h, '#5c0632'); x.strokeStyle = '#e8e2e5'; x.lineWidth = h * 0.02; x.beginPath(); x.moveTo(w * 0.5, h * 0.62); x.quadraticCurveTo(w * 0.55, h * 0.2, w * 0.78, h * 0.15); x.moveTo(w * 0.56, h * 0.62); x.quadraticCurveTo(w * 0.62, h * 0.25, w * 0.84, h * 0.2); x.stroke(); },
    nh(x, w, h) { bg(x, w, h, '#ffffff'); x.fillStyle = '#13448f'; x.beginPath(); x.moveTo(w * 0.3, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.62); x.lineTo(w * 0.55, h * 0.62); x.fill(); x.fillStyle = '#00a3e0'; x.fillRect(w * 0.5, h * 0.64, w * 0.5, h * 0.05); x.fillStyle = '#fff'; x.font = `800 ${h * 0.15}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ANA', w * 0.68, h * 0.4); },
    to(x, w, h) { bg(x, w, h, '#00a651'); x.fillStyle = '#fff'; x.font = `800 ${h * 0.34}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('t', w * 0.62, h * 0.42); x.fillStyle = '#0a2a6b'; x.fillRect(w * 0.7, h * 0.2, w * 0.07, h * 0.07); },
    os(x, w, h) { bg(x, w, h, '#d8001a'); wave(x, w, h, 0.32, '#ffffff'); },
    fr(x, w, h) { bg(x, w, h, '#073590'); x.strokeStyle = '#f1c933'; x.lineWidth = h * 0.02; x.lineJoin = 'round'; const cx = w * 0.6, cy = h * 0.42, r = h * 0.18; x.beginPath(); x.moveTo(cx - r * 0.7, cy + r); x.lineTo(cx - r * 0.7, cy - r); x.quadraticCurveTo(cx + r * 0.2, cy - r * 0.6, cx + r * 0.8, cy + r); x.closePath(); x.stroke(); for (let i = 1; i < 5; i++) { const xx = cx - r * 0.7 + i * r * 0.3; x.beginPath(); x.moveTo(xx, cy + r); x.lineTo(xx, cy - r * (0.9 - i * 0.22)); x.stroke(); } },
    vy(x, w, h) { bg(x, w, h, '#ffcc00'); x.strokeStyle = '#4a4a4a'; x.lineWidth = h * 0.05; x.lineJoin = 'round'; x.beginPath(); x.moveTo(w * 0.48, h * 0.25); x.lineTo(w * 0.6, h * 0.58); x.lineTo(w * 0.74, h * 0.2); x.stroke(); },
    gen(x, w, h, liv) { bg(x, w, h, '#c9d1dc'); if (liv.code) { x.fillStyle = '#2b3440'; x.font = `800 ${h * 0.2}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(liv.code, w * 0.6, h * 0.45); } },
  };
  function bg(x, w, h, c) { x.fillStyle = c; x.fillRect(0, 0, w, h); }
  function slant(x, w, h, bands) { bands.forEach(([a, b, col]) => { x.fillStyle = col; x.beginPath(); x.moveTo(w * a, h); x.lineTo(w * (a + 0.55), 0); x.lineTo(w * (b + 0.55), 0); x.lineTo(w * b, h); x.fill(); }); }
  function wave(x, w, h, y, col) { x.fillStyle = col; x.beginPath(); x.moveTo(0, h * (y + 0.1)); x.bezierCurveTo(w * 0.35, h * (y - 0.08), w * 0.65, h * (y + 0.12), w, h * (y - 0.04)); x.lineTo(w, h * (y + 0.06)); x.bezierCurveTo(w * 0.65, h * (y + 0.22), w * 0.35, h * (y + 0.02), 0, h * (y + 0.2)); x.fill(); }
  function flower(x, cx, cy, r, col, n) { x.fillStyle = col; for (let i = 0; i < n; i++) { x.save(); x.translate(cx, cy); x.rotate(i * Math.PI * 2 / n); x.beginPath(); x.ellipse(0, -r * 0.55, r * 0.32, r * 0.55, 0, 0, Math.PI * 2); x.fill(); x.restore(); } x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r * 0.16, 0, Math.PI * 2); x.fill(); }
  function phoenix(x, cx, cy, r, col) { x.strokeStyle = col; x.lineWidth = r * 0.16; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 1.9); x.stroke(); x.beginPath(); x.moveTo(cx - r * 0.5, cy + r * 0.3); x.bezierCurveTo(cx - r * 0.1, cy - r * 0.9, cx + r * 0.5, cy - r * 0.2, cx + r * 0.2, cy + r * 0.35); x.stroke(); x.beginPath(); x.moveTo(cx - r * 0.1, cy - r * 0.1); x.quadraticCurveTo(cx + r * 0.4, cy - r * 0.6, cx + r * 0.75, cy - r * 0.35); x.stroke(); }
  function bird(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.moveTo(cx - r, cy + r * 0.15); x.quadraticCurveTo(cx - r * 0.3, cy - r * 0.55, cx + r * 0.1, cy - r * 0.05); x.quadraticCurveTo(cx + r * 0.45, cy - r * 0.75, cx + r * 1.05, cy - r * 0.6); x.quadraticCurveTo(cx + r * 0.5, cy - r * 0.15, cx + r * 0.2, cy + r * 0.25); x.quadraticCurveTo(cx - r * 0.3, cy - r * 0.05, cx - r, cy + r * 0.15); x.fill(); }
  function crown(x, cx, cy, r) { x.beginPath(); x.moveTo(cx - r, cy + r * 0.5); x.lineTo(cx - r * 0.85, cy - r * 0.2); x.lineTo(cx - r * 0.45, cy + r * 0.15); x.lineTo(cx, cy - r * 0.45); x.lineTo(cx + r * 0.45, cy + r * 0.15); x.lineTo(cx + r * 0.85, cy - r * 0.2); x.lineTo(cx + r, cy + r * 0.5); x.closePath(); x.fill(); [-0.85, -0.42, 0, 0.42, 0.85].forEach((d, i) => { x.beginPath(); x.arc(cx + d * r, cy - r * (i === 2 ? 0.62 : 0.38), r * 0.1, 0, Math.PI * 2); x.fill(); }); }
  function paintTail(liv, mirror) {
    const w = 512, h = 512, c = cnv(w, h), x = c.getContext('2d');
    if (mirror) { x.translate(w, 0); x.scale(-1, 1); }   // the other side sees the art mirrored, so draw it mirrored to read nose-first
    (TAILS[liv.tail] || TAILS.gen)(x, w, h, liv);
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
    const wingMat = mat('#c5ccd6');
    const wingAt = f => ({ x: xr + le * b * f, y: yw + dih * b * f, c: cr + (ct - cr) * f });
    [1, -1].forEach(sd => {
      const st = [0, 0.33, 1].map(f => { const w = wingAt(f); return hSec(w.x, w.y, sd * (zr + b * f), w.c, f ? 0.1 : 0.13); });
      grp.add(new T.Mesh(loft(st), [wingMat, wingMat]));
      // winglets
      const tip = wingAt(1), tz = sd * (zr + b);
      const up = (h, cant, ch, back = 0) => { const s0 = hSec(tip.x, tip.y, tz, ch, 0.08), s1 = hSec(tip.x + h * 0.9 + back, tip.y + h, tz + sd * cant, ch * 0.45, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [mat(liv.top || '#c5ccd6'), mat(liv.top || '#c5ccd6')])); };
      if (o.tip === 'sharklet') up(S * 0.07, S * 0.012, ct * 0.9);
      else if (o.tip === 'blended') up(S * 0.07, S * 0.02, ct * 0.85);
      else if (o.tip === 'max') { up(S * 0.07, S * 0.015, ct * 0.85); const s0 = hSec(tip.x, tip.y, tz, ct * 0.6, 0.08), s1 = hSec(tip.x + S * 0.03, tip.y - S * 0.035, tz, ct * 0.3, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [wingMat, wingMat])); }
      else if (o.tip === 'small') up(S * 0.045, S * 0.008, ct * 0.8);
      else if (o.tip === 'fence') { const s0 = hSec(tip.x - ct * 0.1, tip.y - S * 0.012, tz, ct * 0.75, 0.06), s1 = hSec(tip.x + ct * 0.15, tip.y + S * 0.025, tz, ct * 0.45, 0.06); grp.add(new T.Mesh(loft([s0, s1]), [wingMat, wingMat])); }
    });
    // belly fairing
    if (!high) { const fair = new T.Mesh(new T.SphereGeometry(1, 24, 12), mat(liv.belly || '#e6e9ee')); fair.scale.set(cr * 0.75, R * 0.42, R * 0.82); fair.position.set(xr + cr * 0.5, -R * 0.68, 0); grp.add(fair); }

    // Engines
    const engMat = mat(liv.engine || '#e9ecf0'), darkMat = mat('#1a2028', { roughness: 0.6 }), metal = mat('#9aa3ad', { metalness: 0.6, roughness: 0.3 });
    const nacelle = (ed, len) => {
      const pts = [[0, ed * 0.42], [0.04, ed * 0.5], [0.12, ed * 0.5], [0.55, ed * 0.47], [0.85, ed * 0.36], [1, ed * 0.28]].map(([a, r]) => new T.Vector2(r, a * len));
      const g = new T.Group(), shell = new T.Mesh(new T.LatheGeometry(pts, 40), engMat); g.add(shell);
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
    grp.add(new T.Mesh(fin, [new T.MeshStandardMaterial({ map: tex(paintTail(liv, false)), roughness: 0.35, metalness: 0.1, side: T.DoubleSide }), new T.MeshStandardMaterial({ map: tex(paintTail(liv, true)), roughness: 0.35, metalness: 0.1, side: T.DoubleSide })]));
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

  // ── Scene: lights, holographic ground ring ──
  function makeScene() {
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight('#e6f0ff', '#1a2840', 1.15));
    const sun = new T.DirectionalLight('#ffffff', 1.9); sun.position.set(-2, 3, 2.5); sc.add(sun);
    const rim = new T.DirectionalLight('#4de1ff', 0.9); rim.position.set(2, 1, -3); sc.add(rim);
    const ring = new T.Group();
    const lineMat = new T.MeshBasicMaterial({ color: '#4de1ff', transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false });
    [1.05, 1.25].forEach((r, i) => { const m = new T.Mesh(new T.RingGeometry(r - 0.006, r, 96), lineMat.clone()); m.material.opacity = i ? 0.18 : 0.35; ring.add(m); });
    for (let i = 0; i < 24; i++) { const t = new T.Mesh(new T.PlaneGeometry(0.004, i % 6 ? 0.04 : 0.09), lineMat); const a = i / 24 * Math.PI * 2; t.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); t.rotation.z = a + Math.PI / 2; ring.add(t); }
    const glow = new T.Mesh(new T.CircleGeometry(1.05, 64), new T.MeshBasicMaterial({ color: '#4de1ff', transparent: true, opacity: 0.05, depthWrite: false })); ring.add(glow);
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.32; sc.add(ring); sc.userData.ring = ring;
    return sc;
  }
  function frameCamera(cam, zoom = 1) { cam.position.set(-1.25 / zoom, 0.62 / zoom, 2.6 / zoom); cam.lookAt(0, -0.1, 0); }

  // ── Shared renderer for the hangar cards ──
  const RW = 640, RH = 400;   // render size; cards are 16:10
  let R0 = null, SCENE = null, CAM = null, LOOP = 0, IO = null;
  const MODELS = new Map(), CARDS = new Map();
  const getModel = (code, airline) => { const k = code + '|' + liveryOf(airline).key; if (!MODELS.has(k)) MODELS.set(k, buildAircraft(code, airline)); return MODELS.get(k); };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ensureShared() {
    if (R0) return;
    const c = cnv(RW, RH);
    R0 = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    R0.setPixelRatio(1); R0.setSize(RW, RH, false); R0.outputColorSpace = T.SRGBColorSpace; R0.toneMapping = T.ACESFilmicToneMapping; R0.toneMappingExposure = 1.05;
    SCENE = makeScene(); CAM = new T.PerspectiveCamera(30, RW / RH, 0.1, 50); frameCamera(CAM, 1.08);
    IO = new IntersectionObserver(es => es.forEach(e => { const c0 = CARDS.get(e.target); if (c0) c0.visible = e.isIntersecting; }), { rootMargin: '100px' });
  }
  function drawCard(cv, st, now) {
    const m = st.model; SCENE.add(m);
    m.rotation.y = st.yaw + (st.dragging || reduced() ? 0 : now * 0.00025); m.rotation.x = st.pitch;
    m.traverse(o => { if (o.userData.spin) o.userData.spin.rotation.x = now * 0.02; });
    R0.render(SCENE, CAM); SCENE.remove(m);
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(R0.domElement, 0, 0, cv.width, cv.height);
  }
  function loop(now) {
    LOOP = requestAnimationFrame(loop);
    if (loop.last && now - loop.last < 33) return; loop.last = now;
    for (const [cv, st] of CARDS) { if (!cv.isConnected) { CARDS.delete(cv); IO.unobserve(cv); continue; } if (st.visible || !st.drawn) { drawCard(cv, st, now); st.drawn = true; } }
    if (!CARDS.size) { cancelAnimationFrame(LOOP); LOOP = 0; }
  }
  function attachDrag(el, st, onChange) {
    let p0 = null;
    el.addEventListener('pointerdown', e => {
      if (!reduced()) st.yaw += performance.now() * 0.00025;   // freeze the auto-rotation at the angle shown
      p0 = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false }; st.dragging = true; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; if (Math.abs(dx) + Math.abs(dy) > 4) p0.moved = true;
      st.yaw = p0.yaw + dx * 0.01; st.pitch = Math.max(-0.6, Math.min(0.6, p0.pitch + dy * 0.006)); onChange?.(); });
    const up = e => { if (!p0) return; const moved = p0.moved; p0 = null; st.dragging = false; st.yaw -= reduced() ? 0 : performance.now() * 0.00025; if (moved) e.preventDefault(); el.dataset.dragged = moved ? '1' : ''; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  function dispose(obj) { obj.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); }
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
    // Register a hangar card canvas (16:10)
    card(cv, { type, airline }) {
      ensureShared();
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
      cv.width = Math.round((r.width || 320) * dpr); cv.height = Math.round(cv.width * RH / RW);
      const st = { model: getModel(type, airline), yaw: -0.15, pitch: 0, visible: true, drawn: false, type };
      CARDS.set(cv, st); IO.observe(cv); attachDrag(cv, st);
      if (!LOOP) LOOP = requestAnimationFrame(loop);
    },
    setAirline(cv, airline) { const st = CARDS.get(cv); if (st) { st.model = getModel(st.type, airline); st.drawn = false; } },
    // Full-size viewer with its own renderer: drag to rotate, wheel / pinch to zoom
    viewer(host, { type, airline, yaw = -0.15 }) {
      const cv = cnv(10, 10); cv.className = 'v3d-canvas'; host.appendChild(cv);
      const rnd = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      rnd.outputColorSpace = T.SRGBColorSpace; rnd.toneMapping = T.ACESFilmicToneMapping; rnd.toneMappingExposure = 1.05; rnd.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      const scene = makeScene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
      const st = { yaw, pitch: 0, zoom: 1, dragging: false };
      let model = buildAircraft(type, airline); scene.add(model);
      const size = () => { const w = host.clientWidth, h = host.clientHeight; rnd.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      size(); const ro = new ResizeObserver(size); ro.observe(host);
      attachDrag(cv, st);
      cv.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(3, st.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
      let pinch = null;
      cv.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: st.zoom }; }, { passive: true });
      cv.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); st.zoom = Math.max(0.6, Math.min(3, pinch.z * d / pinch.d)); } }, { passive: true });
      cv.addEventListener('touchend', () => { pinch = null; });
      let raf = 0;
      const tick = now => { raf = requestAnimationFrame(tick); model.rotation.y = st.yaw + (st.dragging || reduced() ? 0 : now * 0.00025); model.rotation.x = st.pitch;
        model.traverse(o => { if (o.userData.spin) o.userData.spin.rotation.x = now * 0.02; }); frameCamera(cam, st.zoom * Math.min(1, Math.max(0.58, cam.aspect / 1.3))); rnd.render(scene, cam); };   // pull back on narrow (portrait) screens
      raf = requestAnimationFrame(tick);
      return {
        setAirline(al) { scene.remove(model); dispose(model); model = buildAircraft(type, al); scene.add(model); },
        destroy() { cancelAnimationFrame(raf); ro.disconnect(); dispose(model); rnd.dispose(); rnd.forceContextLoss?.(); cv.remove(); },
      };
    },
  };
  window.Fleet3D = Fleet3D;
})();
