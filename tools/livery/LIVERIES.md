# 航司涂装建模记录 · Airline livery modelling

How the 3D hangar (`fleet3d.js`) paints each airline, which method and sources each livery uses,
and the checks to run before publishing. Read this before adding or fixing a livery.

## 1. Where things live / 文件位置

| What | Where |
| --- | --- |
| Livery table, tail painters, logo painters, model | `fleet3d.js`: `LIV`, `HOUSE`, `TAILS`, `LOGO` |
| Baked textures | `liveries/<KEY>.jpg` (fuselage), `liveries/<KEY>-fin.jpg` (fin) |
| Airline database used by the Site Manager | `aviation/airlines.json` (`[iata, icao, name, cc]`) |
| Chinese names, profile cards | `aviation.js`: `AIRLINE_ZH`, `AIRLINE_INFO` |
| Bake scripts | `tools/livery/*.py` (this folder) |
| Reference photos | not committed (third-party photos). Put them in `tools/livery/src/` or point `LIVERY_SRC` at a folder |

Run every script from the repository root. Outputs go straight to `liveries/`; previews go to the system temp folder.

## 2. Texture conventions / 贴图约定

**Fuselage** `KEY.jpg`, 2048 × 512.
- `u` (x) runs along the body: 0 = nose, 1 = tail.
- `v` (y) runs round the body: 0 = crown, 0.205 = window line, 0.5 = belly, 1 = crown again. The lower half is the other side, mirrored about the belly row.
- A texel is about `k = (2πR/512)/(L/2048)` times taller than it is long (≈ 6 for an A320). Anything with a real shape (titles, logos) must be squeezed by `k` in width when drawn into the texture, as the scripts do.

**Fin** `KEY-fin.jpg`, 1024 × 512: port half | starboard half. In each half, x runs leading edge → trailing edge, y runs tip → root.
The model stretches every row from the leading to the trailing edge, and trims the outer 2.5 % of columns on each side.
A logo drawn straight into the fin texture is sheared on the swept fin. Photo bakes avoid this because the quad warp undoes the sweep.

## 3. A `LIV` entry / 涂装条目

```js
ZH: { img: 'ZH', overOnArt: true, winOnArt: true, name: 'Shenzhen Airlines', zh: '深圳航空',
      belly: '#e4e6ea', engine: W, lip: '#c9d0d8', winglet: '#d6161f', tail: 'zh',
      under: P => { ... },   // drawn first, when there is no texture
      over:  P => { ... } }  // titles; drawn over a texture only with overOnArt
```

| Field | Meaning |
| --- | --- |
| `img` | Texture key in `liveries/`; omit for a fully painted livery |
| `overOnArt` | Run `over` (titles) on top of the texture |
| `winOnArt` | Paint windows and cockpit on top of the texture (for textures drawn without windows) |
| `paintTail` | Ignore the baked fin and use the `TAILS[tail]` painter (KLM) |
| `body`, `belly`, `engine`, `lip`, `winglet` | Colours of the painted parts |
| `tail` | Key of the `TAILS` painter: fallback before textures load, and the painted fin when there is no texture |
| `text`, `textColor` | Generic title for airlines without an `over` painter |

Airlines without an entry fall back to the `HOUSE` livery of the aircraft maker.

### Painter helpers `P` (in `under` / `over`)
- `P.below(v, col)`: everything under `v`, both sides.
- `P.band(v0, v1, col, u0, u1)`, `P.poly(pts, col)`, `P.ribbon(top(u), bot(u), u0, u1, col)`: shapes, drawn on both sides.
- `P.logo(name, u, v, hv, col)`, `P.dot(...)`.
- `P.title(parts, u, v, hv, opts)` draws a title on both sides over the same stretch of `u` and returns `[u0, u1]`. `parts` is a string or a list of `{ t | logo | gap | flag | slash }`.
  Options: `col`, `f` (font), `w` (weight), `i` (italic), `sp` (letter spacing), `cjk`, `anchor`, and `fromNose: true`, which reverses the characters on the starboard side so a Chinese title reads from the nose on both sides.
- `tv(hv)` gives the `v` of a title of cap height `hv` sitting just above the windows.
- Chinese and English titles are separate `P.title` calls, Chinese first: then the Chinese sits nearer the nose on both sides, as on the aircraft.

### Tail painters `TAILS[key](x, w, h, f)`
`f` is the fin frame: `f.cx`, `f.cy`, `f.s` (logo size), `f.at(a)` → leading / trailing edge at height `a`, `f.P` corners.
Helpers: `bg`, `band`, `along` (stripe parallel to an edge), `lab` (text), `disc`. Size text by the local chord (`f.at`), not by `f.s`, or it runs past the trailing edge (KLM).
The airline wall icon (`Fleet3D.tailIcon`) uses a fuller fin outline than the real fin so that wide logos fit.

## 4. Methods / 建模方法

**A. FlightGear livery sheets** (`bake_livery.py`).
Layouts: `A320` (legoboyvdlp 4k unwrap sheets), `A330` (side sheets), `B737`, `A320old`.
Usage: `python3 tools/livery/bake_livery.py '[["<sheet.png>","A320","KEY",{options}]]'`.
Options: `finFlip`, `oneFin`, `lightenGrey`, `crown`, `bellyFill`, `patches`, `maskFill`, `rearSweep`.
After baking A320 sheets, run `fin_rebake_a320.py KEY=<sheet.png> ...`: it uses fin corners that reach the true leading edge, removes the template's rudder hinge line and panel lines, and checks the fin orientation against the current one.
Then run `nose_clean.py KEY ...`: the photo or sheet nose is replaced by body colour, and the model paints its own cockpit.

**B. Photo side views** (`bake_livery.py` with a side layout: `XMN`, `KUN`, `LOONG`, `GCA`, `SZX`, `SCA`).
Each layout gives the nose and tail x and the crown, window and belly rows per side, and the four fin corners in the photo.
Use `maskFill` to paint over wings, engines and shadows. Always run `nose_clean.py` afterwards.

**C. Drawn from photos and official artwork** (`zh_shenzhen.py`, `g5_china_express.py`, `gt_air_guilin_fin.py`, `gt_air_guilin_fuselage.py`).
The fuselage is drawn from the livery geometry in numpy (sweep curves, bands). Titles are cut from the airline's official logo artwork, keyed and recoloured, so the typeface matches exactly.
Fins are quad-warped from a clear tail photo, with the background flattened and the logo keyed. Alternatively the official logo is composited at the photo's logo position.

**D. Painted in code** (`TAILS`, `LOGO`, `under`/`over`): no texture at all. Use for simple geometric liveries, or when only vector artwork is reliable (Sichuan's oval logo).

## 5. Per airline / 各航司

| Code | Airline | Fuselage | Fin | Source / notes |
| --- | --- | --- | --- | --- |
| CA | 中国国际航空 Air China | A | A | legoboyvdlp IAE `CCA` |
| CZ | 中国南方航空 China Southern | A | A | Devansh1007 `CSN` A320neo; kapok fully inside the fin since the corner fix |
| MU | 中国东方航空 China Eastern | A | A | legoboyvdlp CFM-NEO `CES` |
| MF | 厦门航空 Xiamen Air | C | B | fuselage drawn by `mf_xiamen.py` (light-blue band over blue and navy belly, large blue sweep behind the wing); fin from the photo; painted titles and windows |
| HU | 海南航空 Hainan | A | A | FGMEMBERS A330-200 `CHH` |
| 3U | 四川航空 Sichuan | D | D | `LOGO.sichuan` oval (gull over water bands) on an all-red fin; red cheatline widening aft and wrapping the rear; `fromNose` Chinese title |
| ZH | 深圳航空 Shenzhen | C | C | A320neo tail photo; gold / dark-red / gold sweep from the crown behind the titles to the belly behind the wing; navy titles |
| FM | 上海航空 Shanghai | D | D | painted cheatline and titles |
| 9C | 春秋航空 Spring | B | B | photo, painted titles and windows |
| CN | 大新华航空 Grand China | B | B | photo, layout `GCA`; fuselage rebuilt geometrically, photo fin |
| TV | 西藏航空 Tibet | A | A | `TBA` A320 sheet |
| JD | 首都航空 Capital | B | B | photo, painted titles and windows |
| KY | 昆明航空 Kunming | B | B | photo, layout `KUN` |
| GJ | 长龙航空 Loong Air | B | B | photo, layout `LOONG`; dragon from the tail photo |
| GT | 桂林航空 Air Guilin | C | C | tail photo + official logo; titles and mark cut from the official artwork |
| G5 | 华夏航空 China Express | C | C | official logo artwork: dove on the fin and titles; deep-blue fin with light-blue cap |
| KL | KLM | A | D | `KLM` sheet fuselage; fin painted (`paintTail`), crown and KLM sized to the chord |
| AF, LH, AY, TK | Air France, Lufthansa, Finnair, Turkish | A | A | legoboyvdlp `AFR`, `DLH`, `FIN`, `THY`; Lufthansa rear rebuilt as one navy wrap (`lh_lufthansa_rear.py`) and fin edge filled (`fin_edges.py LH`) |
| BA, NH, QR, OS | British Airways, ANA, Qatar, Austrian | A | A | `BAW`, `ANA`, `QTR`, `AUA` sheets; Austrian fin has the single red arrow only (`os_austrian_fin.py` removes the sheet's grey arrow) |
| TO, HV | Transavia | A | A | `TVF` sheet (HV reuses TO) |
| FR, VY | Ryanair, Vueling | A | A | FlightGear sheets |
| CX, SQ, EK | Cathay, Singapore, Emirates | A | A | A330 side sheets (`CPA`, `SIA`, `UAE`); Cathay fin flattened to teal plus the white brushstroke |

## 6. Checks before publishing / 发布前检查

1. Render both sides of at least an A320-family type and a widebody (`sides` test), a nose close-up and the tail.
2. Look for stray colour blocks: photo cockpit windows, radome shading, wing or engine shadows, sky or tarmac at the fin edges, the template hinge line.
3. Titles: right colour and typeface, Chinese nearer the nose on both sides, not running onto the sweep or the tail.
4. Fin: logo complete and not clipped at either edge; no grey leading-edge strip; airline-wall icon (`tailIcon`) shows the whole logo.
5. Bump the `?v=` stamps on the script tags in `flights.html`, run the layout regression test, and copy `fleet3d.js`, `aviation.js` and the changed textures to xiapeixiapei.github.io as well.

## 7. Pitfalls we hit / 踩过的坑

- Photo and sheet noses carry their own cockpit windows and radome shading: they land in the wrong place on our loft. Always clean the nose.
- The legoboyvdlp A320 fin corners were too tight on the leading-edge side and clipped logos; the template also draws a rudder hinge line.
- Fin quads taken from a photo must follow the fuselage pitch; check that no sky, stabiliser or door falls inside.
- A heuristic background fill can wipe white logo parts that are close to the sheet colour (Lufthansa ring, ANA letters); limit fills to the area that is really outside the fin.
- Logos drawn directly into fin texture space are sheared on the model; draw in photo space and warp, or use a `TAILS` painter.
- Chinese titles are painted reading from the nose on both sides; use separate Chinese and English calls, and `fromNose` when they share one call.
- Use the official artwork for typefaces; system fonts never match a corporate wordmark.
- A320 sheets carry tail-cone and stabiliser-fairing pieces that land on our loft as stepped blocks; redraw the rear when the livery colours it (Lufthansa).
- Side-view photos map wing, engine and shadow areas onto the lower fuselage as mixed patches; draw the lower body from the livery geometry instead (Xiamen).
