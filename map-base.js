/* map-base.js: hybrid base map for the footprint pages.
 *
 * Rule: whenever any part of China (incl. Taiwan, Hong Kong, Macau, Zangnan, Aksai Chin and the
 * South China Sea islands, see cn-outline.json) is inside the view, or the map is zoomed out,
 * the base map is Gaode (AutoNavi), whose borders and labels follow the official Chinese map.
 * Only when China is completely out of view is OpenStreetMap used, for street-level detail abroad.
 *
 * Gaode tiles inside China use GCJ-02 coordinates while all site data stay in WGS84. Instead of
 * converting every marker and polygon, the Gaode tile grid is shifted by the GCJ-02 offset at the
 * view centre (the offset changes very slowly, so the error across one screen is negligible).
 *
 * If Gaode tiles keep failing, the China view falls back to a label-free, border-free terrain
 * base (Esri World Terrain Base), so a wrong border is never shown.
 *
 * Usage: MapBase.attach(map, lang) once after creating the map; MapBase.setLang(lang) on language change.
 */
(function () {
  'use strict';

  // ── Config ──
  const SWITCH_ZOOM = 6;            // at this zoom or below, always use Gaode (the view is continental)
  const GAODE_LANG = { zh: 'zh_cn', en: 'zh_cn' };   // set en: 'en' if Gaode English labels prove complete
  const GAODE_FAIL_LIMIT = 6;       // tile errors before falling back to the terrain base
  const OUTLINE_URL = 'cn-outline.json';
  const ATTR_GAODE = '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图 AutoNavi</a> · GS(2025)5996号';
  const ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  const ATTR_ESRI = 'Tiles &copy; Esri';

  // ── WGS84 -> GCJ-02 (standard public algorithm) ──
  const A = 6378245.0, EE = 0.00669342162296594323;
  function tLat(x, y) {
    let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return r;
  }
  function tLon(x, y) {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return r;
  }
  function wgs84ToGcj02(lat, lon) {
    let dLat = tLat(lon - 105, lat - 35), dLon = tLon(lon - 105, lat - 35);
    const rad = lat / 180 * Math.PI; let m = Math.sin(rad); m = 1 - EE * m * m; const s = Math.sqrt(m);
    dLat = (dLat * 180) / ((A * (1 - EE)) / (m * s) * Math.PI);
    dLon = (dLon * 180) / (A / s * Math.cos(rad) * Math.PI);
    return [lat + dLat, lon + dLon];
  }

  // ── China outline and geometry tests ──
  let OUTLINE = null;   // [{ ring: [[lon, lat], ...], bbox: [minX, minY, maxX, maxY] }]
  function loadOutline() {
    return loadOutline.p ||= fetch(OUTLINE_URL).then(r => r.json()).then(d => {
      OUTLINE = d.polygons.map(ring => {
        let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
        for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        return { ring, bbox: [x0, y0, x1, y1] };
      });
    }).catch(() => { OUTLINE = null; });
  }
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Liang-Barsky: does segment (ax,ay)-(bx,by) cross the rectangle?
  function segHitsRect(ax, ay, bx, by, r) {
    let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy], q = [ax - r[0], r[2] - ax, ay - r[1], r[3] - ay];
    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) { if (q[k] < 0) return false; continue; }
      const t = q[k] / p[k];
      if (p[k] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  function rectHitsPoly(r, poly) {
    const b = poly.bbox;
    if (b[2] < r[0] || b[0] > r[2] || b[3] < r[1] || b[1] > r[3]) return false;
    const ring = poly.ring;
    for (const [x, y] of ring) if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
    if (inRing(r[0], r[1], ring)) return true;   // rectangle fully inside China
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if (segHitsRect(ring[j][0], ring[j][1], ring[i][0], ring[i][1], r)) return true;
    return false;
  }
  function chinaInView(map) {
    if (!OUTLINE) return true;                    // outline not loaded yet: stay on the safe side
    const b = map.getBounds(), w = b.getWest(), e = b.getEast();
    if (e - w >= 360) return true;
    const r = [w, b.getSouth(), e, b.getNorth()];
    for (const shift of [-360, 0, 360]) {         // the map may be scrolled across the antimeridian
      const rs = [r[0] + shift, r[1], r[2] + shift, r[3]];
      if (OUTLINE.some(p => rectHitsPoly(rs, p))) return true;
    }
    return false;
  }
  function inChina(lat, lon) {
    if (!OUTLINE) return lon > 72 && lon < 136 && lat > 3 && lat < 54;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return OUTLINE.some(p => lon >= p.bbox[0] && lon <= p.bbox[2] && lat >= p.bbox[1] && lat <= p.bbox[3] && inRing(lon, lat, p.ring));
  }

  // ── Gaode tile layer whose grid follows GCJ-02 ──
  // Tiles are positioned as if the view were centred on GCJ02(centre), so WGS84 data line up.
  function toGcj(c) {
    if (!c || !inChina(c.lat, c.lng)) return c;
    const [la, lo] = wgs84ToGcj02(c.lat, c.lng);
    return L.latLng(la, lo);
  }
  const GcjTileLayer = L.TileLayer.extend({
    _setZoomTransform(level, center, zoom) { return L.TileLayer.prototype._setZoomTransform.call(this, level, toGcj(center), zoom); },
    _update(center) {
      if (!this._map) return;
      return L.TileLayer.prototype._update.call(this, toGcj(center === undefined ? this._map.getCenter() : center));
    }
  });

  const gaodeUrl = lang => `https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=${lang}&size=1&scl=1&style=7`;

  // ── Public API ──
  const S = { map: null, gaode: null, osm: null, esri: null, cur: null, lang: 'en', fails: 0, gaodeDown: false };

  function chinaLayer() { return S.gaodeDown ? S.esri : S.gaode; }
  function sync() {
    const map = S.map; if (!map) return;
    const want = (map.getZoom() <= SWITCH_ZOOM || chinaInView(map)) ? chinaLayer() : S.osm;
    if (want === S.cur) return;
    want.addTo(map); want.bringToBack();
    const old = S.cur; S.cur = want;
    // Let the new tiles load before removing the old layer, so the switch does not flash
    if (old) {
      let done = false; const drop = () => { if (done) return; done = true; if (S.cur !== old) map.removeLayer(old); };
      want.once('load', drop); setTimeout(drop, 1500);
    }
  }

  function attach(map, lang) {
    S.map = map; S.lang = lang || 'en';
    S.gaode = new GcjTileLayer(gaodeUrl(GAODE_LANG[S.lang] || 'zh_cn'), { subdomains: '1234', maxZoom: 18, maxNativeZoom: 18, attribution: ATTR_GAODE });
    S.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: ATTR_OSM });
    S.esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, maxNativeZoom: 13, attribution: ATTR_ESRI });
    S.gaode.on('tileerror', () => {
      if (S.gaodeDown || ++S.fails < GAODE_FAIL_LIMIT) return;
      S.gaodeDown = true;                          // Gaode unreachable: never fall back to OSM inside China
      if (S.cur === S.gaode) { S.cur = null; map.removeLayer(S.gaode); }
      sync();
    });
    S.gaode.on('tileload', () => { S.fails = 0; });
    sync();
    map.on('moveend zoomend', sync);
    loadOutline().then(sync);
  }

  function setLang(lang) {
    if (!S.gaode || lang === S.lang) return;
    S.lang = lang;
    S.gaode.setUrl(gaodeUrl(GAODE_LANG[lang] || 'zh_cn'));
  }

  window.MapBase = { attach, setLang, wgs84ToGcj02, inChina, chinaInView: () => S.map && chinaInView(S.map) };
})();
