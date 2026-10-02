// Site appearance, shared by every page: the font pairing chosen in the Site Manager
// (window.SITE_FONTS from site-fonts.js) and the light / dark theme.
// Load it synchronously in <head>, after site-fonts.js, so the page never flashes the wrong theme.
(function () {
  'use strict';
  var root = document.documentElement;

  // ── Font catalog (all from Google Fonts) ──
  var FONTS = {
    en: {
      A: { name: 'Crimson Pro + DM Sans', note: 'The original pairing. Warm book serif, soft geometric sans.',
           head: { family: 'Crimson Pro', q: 'ital,wght@0,300;0,400;0,600;1,300;1,400' }, body: { family: 'DM Sans', q: 'wght@400;500;600;700' } },
      B: { name: 'Source Serif 4 + Source Sans 3', note: 'Scholarly pair from Adobe. Calm and readable at small sizes.',
           head: { family: 'Source Serif 4', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Source Sans 3', q: 'wght@400;500;600;700' } },
      C: { name: 'Newsreader + Public Sans', note: 'Journal-like headings with a neutral, sturdy body.',
           head: { family: 'Newsreader', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Public Sans', q: 'wght@400;500;600;700' } },
      D: { name: 'EB Garamond + Work Sans', note: 'Classic Garamond, the most traditional feel.',
           head: { family: 'EB Garamond', q: 'ital,wght@0,400;0,600;1,400' }, body: { family: 'Work Sans', q: 'wght@400;500;600;700' } },
      E: { name: 'IBM Plex Serif + IBM Plex Sans', note: 'One family, engineered look. Suits data-heavy research.',
           head: { family: 'IBM Plex Serif', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'IBM Plex Sans', q: 'wght@400;500;600;700' } },
      F: { name: 'Literata + Figtree', note: 'Made for long reading on screens. Friendly and modern.',
           head: { family: 'Literata', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Figtree', q: 'wght@400;500;600;700' } }
    },
    zh: {
      '1': { name: '思源宋体 Noto Serif SC', note: '正文和标题都用宋体，书卷气。',
             head: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' }, body: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' } },
      '2': { name: '思源黑体 Noto Sans SC', note: '正文和标题都用黑体，手机上最清晰。',
             head: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' }, body: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' } },
      '3': { name: '黑体正文 + 宋体标题', note: '正文易读，标题保留典雅。',
             head: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' }, body: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' } },
      '4': { name: '宋体正文 + 站酷小薇标题', note: '标题更有个性，略带文艺感。',
             head: { family: 'ZCOOL XiaoWei', q: '', kind: 'serif' }, body: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' } }
    }
  };
  var DEFAULT_FONTS = { en: 'B', zh: '3' };
  var CJK_FALLBACK = { serif: "'Songti SC', 'STSong', 'SimSun'", sans: "'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB'" };

  function pick(sel) {
    sel = sel || {};
    var en = FONTS.en[sel.en] ? sel.en : DEFAULT_FONTS.en, zh = FONTS.zh[sel.zh] ? sel.zh : DEFAULT_FONTS.zh;
    return { en: en, zh: zh, E: FONTS.en[en], Z: FONTS.zh[zh] };
  }
  // CSS font stacks: the English face first (Latin glyphs), then the Chinese face (CJK glyphs), then system fallbacks
  function stacks(sel) {
    var p = pick(sel);
    return {
      head: "'" + p.E.head.family + "', '" + p.Z.head.family + "', " + CJK_FALLBACK[p.Z.head.kind] + ', Georgia, serif',
      body: "'" + p.E.body.family + "', '" + p.Z.body.family + "', " + CJK_FALLBACK[p.Z.body.kind] + ', system-ui, sans-serif'
    };
  }
  function fontsUrl(list) {
    var seen = {}, parts = [];
    list.forEach(function (f) {
      if (seen[f.family]) return; seen[f.family] = 1;
      parts.push('family=' + f.family.replace(/ /g, '+') + (f.q ? ':' + f.q : ''));
    });
    return 'https://fonts.googleapis.com/css2?' + parts.join('&') + '&display=swap';
  }
  function addLink(id, href) {
    var link = document.getElementById(id);
    if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = id; document.head.appendChild(link); }
    if (link.getAttribute('href') !== href) link.href = href;
  }
  function applyFonts(sel) {
    var p = pick(sel), s = stacks(sel);
    root.style.setProperty('--font-head', s.head);
    root.style.setProperty('--font-body', s.body);
    addLink('site-fonts-css', fontsUrl([p.E.head, p.E.body, p.Z.head, p.Z.body]));
    return p;
  }
  // Every option at once (the Site Manager's font picker)
  function loadAllFonts() {
    var list = [];
    Object.keys(FONTS.en).forEach(function (k) { list.push(FONTS.en[k].head, FONTS.en[k].body); });
    Object.keys(FONTS.zh).forEach(function (k) { list.push(FONTS.zh[k].head, FONTS.zh[k].body); });
    addLink('site-fonts-all-css', fontsUrl(list));
  }

  // ── Theme: a saved choice wins, otherwise follow the system setting ──
  var KEY = 'site-theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } }
  function current() { return saved() || (mq.matches ? 'dark' : 'light'); }
  var ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function label(dark) {
    var zh = /^zh/i.test(root.lang || '');
    return dark ? (zh ? '切换到浅色模式' : 'Switch to light mode') : (zh ? '切换到深色模式' : 'Switch to dark mode');
  }
  function paintButtons() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.getAttribute('data-icon') !== (dark ? 'sun' : 'moon')) { b.innerHTML = dark ? ICON_SUN : ICON_MOON; b.setAttribute('data-icon', dark ? 'sun' : 'moon'); }
      b.title = label(dark); b.setAttribute('aria-label', label(dark)); b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    paintButtons();
    try { window.dispatchEvent(new CustomEvent('themechange', { detail: t })); } catch (e) {}
  }
  function toggle() {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, t); } catch (e) {}
    // A short colour cross-fade, skipped for people who prefer reduced motion
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm) { root.classList.add('theme-fade'); clearTimeout(toggle._t); toggle._t = setTimeout(function () { root.classList.remove('theme-fade'); }, 450); }
    applyTheme(t);
  }

  // Run now, before the page's own CSS is parsed
  applyTheme(current());
  applyFonts(window.SITE_FONTS || DEFAULT_FONTS);
  var st = document.createElement('style');
  st.id = 'site-theme-css';
  st.textContent =
    '.theme-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:1px solid var(--subtle);border-radius:100px;background:var(--card-bg,var(--card,#fff));color:var(--muted);cursor:pointer;flex-shrink:0;transition:color .25s,border-color .25s,transform .35s}' +
    '.theme-btn:hover{color:var(--accent);border-color:var(--accent)}' +
    '.theme-btn:active{transform:rotate(-25deg) scale(.92)}' +
    '.theme-btn:focus-visible{outline:2px solid var(--accent-light);outline-offset:2px}' +
    '.theme-btn svg{width:15px;height:15px;display:block}' +
    'html.theme-fade,html.theme-fade *,html.theme-fade *::before,html.theme-fade *::after{transition:background-color .4s ease,color .4s ease,border-color .4s ease,fill .4s ease,stroke .4s ease!important}';
  document.head.appendChild(st);
  if (mq.addEventListener) mq.addEventListener('change', function () { if (!saved()) applyTheme(current()); });
  else if (mq.addListener) mq.addListener(function () { if (!saved()) applyTheme(current()); });

  function wire() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (b) { e.preventDefault(); toggle(); }
    });
    paintButtons();
    // Button labels follow the page language (the pages set <html lang> when EN / 中 is switched)
    if (window.MutationObserver) new MutationObserver(paintButtons).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  window.SiteTheme = {
    FONTS: FONTS, DEFAULT_FONTS: DEFAULT_FONTS, stacks: stacks, applyFonts: applyFonts, loadAllFonts: loadAllFonts,
    toggle: toggle, isDark: function () { return root.getAttribute('data-theme') === 'dark'; }, paintButtons: paintButtons
  };
})();
