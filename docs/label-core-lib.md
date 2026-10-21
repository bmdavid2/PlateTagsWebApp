# Label core as a library (for CHESSInventory)

`npm run build:lib` bundles the framework-free label core (`src/lib.ts`, which only
re-exports `src/labels`, `src/zpl`, `src/qr`, `src/batch`) into **one self-contained ES
module**: `lib/platetags-core.js` (about 1.3 MB; `bwip-js` and `uuid` are inlined) with
types in `lib/platetags-core.d.ts` + `lib/types/`. The React app, its build (`dist/`),
the Browser Print wrapper and `index.html` are not touched. `lib/` is committed so a
consumer can copy it; rebuild after changing the core.

```js
import { TEMPLATES, buildLabelZpl, rowToLabelData } from "./platetags-core.js";
const zpl = buildLabelZpl({
  templateId: "bottle", count: 2, printCode: true, overrides: {},
  code: "abc1234",                       // optional; blank = fresh uuid / shortId per copy
  values: { line_1: "INV-000123", line_2: "Tris 50 mM, NaCl 150 mM, pH 7.4" },
});
```

Exports: `TEMPLATES`, `getTemplate`, `buildLabelZpl`, `buildBatchZpl`, `resolveField`,
`fitFontSize`, `estimateMaxChars`, `MIN_FONT_SIZE_IN`, `resolveQrPayload`, the validators
(`validateManualValue`, `validateLabelQr`, `validateBatchRow`, `validateFormat`, `fitsField`,
`allowedQrModes`, `getCodeField`), `rowToLabelData`, `emptyRow`, `MAX_LINES`, and the types.
CSV import/export (`src/batch/csv.ts`, papaparse) is **not** in the bundle.

Needs a browser or Node 18+ (uuid uses `crypto.randomUUID`, which in browsers needs a
secure context, so HTTPS or localhost; uuid falls back to `getRandomValues` otherwise).

## Safety net

- `npx tsx test/golden-zpl.ts` compares ZPL for all three templates over 342 cases (line
  lengths that shrink/truncate, code on/off, counts 1 and 3, supplied and generated codes,
  layout overrides, batch rows) with uuid made deterministic, against
  `test/golden/zpl.golden.txt`. `--update` re-records. `GOLDEN_IMPL=lib` runs the same
  matrix through the built bundle. `npm run test:golden` is the same script (needs `tsx`).
- `test/lib-smoke.mjs` loads the bundle as a plain ES module in Node.

## Do the templates fit the inventory's labels? (decision 78)

Label data: our barcode, a name, composition/lines, date, preparer, expiry, storage.
Templates are 203 dpi (the CLAUDE.md/memory note that said 300 is outdated). Numbers below
come from `resolveField` / `pdf417Grid` as shipped; nothing was changed.

Gaps, most important first:

1. **An arbitrary inventory barcode cannot be encoded verbatim as the code.** The code field
   is fixed per template (`qrMode`): cryotube `uuid`, microplate/bottle `shortId`.
   `resolveQrPayload` **lower-cases** a supplied `code`, and the validators accept only a
   36-char uuid or 7 hex characters (`validateFormat`). So `INV-000123` is rejected by
   `validateLabelQr`; if the validator is skipped, `buildLabelZpl` prints `inv-000123`
   (scanner case mismatch). There is no per-label `qrMode` (CLAUDE.md mentions one; the
   code does not have it). Options, for the user to choose: (a) the inventory generates its
   barcodes as 7 lowercase hex characters (fits everything, no template change);
   (b) templates get `qrMode: "field"` with a source text field; (c) a small core change
   so a supplied code is used verbatim and the validator takes a "free text" mode. (b)/(c)
   change tuned behaviour, so not done.
2. **PDF417 width is not validated.** `fitsField` checks only the row count. At 4 rows a
   code of up to 7 lowercase-alnum characters is 4 columns = 1.35 in; 8 to 11 characters
   is 5 columns = 1.52 in, which on the **microplate** reaches x 1.60 and **overlaps the
   text at x 1.49**; 12 or more is 1.68 in. Digit-heavy strings compact better: `INV-` plus
   digits stays at 1.35 in up to 13 characters. Bottle has more room (the code may be up to about 1.76 in wide).
3. **Microplate has a single text line, 0.43 in wide with the code on**: 9 characters at the
   normal size, 11 at the 0.06 in floor (then truncated with a trailing `+`). Name and barcode
   text cannot both appear. With the code off the line is 1.84 in (51 characters at the floor).
4. **Bottle `cap_id` mirrors `line_1`** and holds only 10 characters at normal size, 15 at the
   floor (then truncated). So `line_1` should be the short barcode/ID and the name goes in
   `line_2`. Body lines fit 19 to 29 characters at normal size and about 48 at 0.06 in.
5. **Cryotube text is narrow beside the QR**: 5 lines of 15 characters at 0.09 in, 23 at the
   0.06 in floor, then truncated (`Tris 50 mM, NaCl 150 mM, pH 7.4`, 31 characters, is cut).
   With the QR off: 24 / 37. No template prints the code's human-readable text, so the
   barcode string only appears if put in a line.
6. **Fixed layout, no named fields**: lines map by position (`line_1..n`); date, preparer,
   expiry and storage have no dedicated field, so the inventory must compose them into lines
   (cryotube 5, bottle 4, microplate 1). A tube label with name + composition + date/preparer +
   expiry + storage fits only on cryotube (5 lines) or bottle (4 lines, so merge two).
7. **Truncation is silent** (`+` suffix); the inventory should pre-check lengths using
   `resolveField(...).maxChars` before printing.
8. Minor: uuid mode on cryotube needs the QR at about 29 modules (mag 3); a code much longer
   than a uuid would grow past the QR box (not computed exactly).

## Zebra Browser Print over HTTPS

Verified from the committed client `public/BrowserPrint-3.1.250.min.js` (read the source):
it talks to the local Browser Print service at **`http://127.0.0.1:9100/`**, and switches to
**`https://127.0.0.1:9101/`** only when the browser is Safari-like (user agent matches
`safari` but not `chrome|android`) **and** the page is `https:`. So on an HTTPS page:

- **Chrome/Edge/Firefox**: the SDK still calls `http://127.0.0.1:9100`. A page on HTTPS is
  normally allowed to call plain-HTTP loopback (loopback IPs are "potentially trustworthy"
  for mixed content). This is how the already-deployed GitHub Pages app works today.
  I have not tested it against a live service here (Browser Print is not running on this
  machine; `curl` to 9100 and 9101 got no answer).
- **Safari**: uses `https://127.0.0.1:9101` with the service's self-signed certificate; the
  user must trust it once. Zebra's v1.2.1 notes (2018) say the self-signed certificate is
  deprecated for newer library versions, and that `sendUrl` fails for HTTP URLs from HTTPS
  pages (we use `send` with raw ZPL, which is unaffected).
- **Chrome/Edge 142+ Local Network Access**: a request from a *public* site to loopback or
  the local network asks the user for permission (a prompt, per site). Per Chrome's
  developer page, **local-to-loopback is not yet gated** (planned), and an enterprise policy
  to pre-grant is planned but not available. So an inventory server on a private LAN address
  is probably not prompted today but could be later; a public-address server would be
  prompted once per browser profile. The page's own text says this is the launch state, so
  re-check when a Chrome release changes it.

Practical: serve the inventory over HTTPS, on the lab computer use Chrome/Edge/Firefox, and
test once with the real printer. Mixed content is not expected to block it, but that is
not confirmed on this hardware.

Sources: Zebra [Browser Print v1.2.1 notes](https://developer.zebra.com/community/home/blog/2018/12/04/browser-print-v121-released),
[Chrome Local Network Access](https://developer.chrome.com/blog/local-network-access),
and the client source above.

## Bottle + cap label is the inventory label (user decision)

For the bottle template the gaps narrow to:

- **Barcode string**: still lower-cased and validated as 7 hex (gap 1). Physically the
  PDF417 (4 rows, up to ~1.76 in wide) holds lowercase-alphanumeric codes up to at least 14
  characters (1.35 in to 1.68 in) and `INV-`+digits up to 13 at 1.35 in; the QR in the cap
  has ample room. The only blocker is the lower-casing/validation, not space.
- **Layout**: `line_1` (up to 19 characters at 0.15 in, ~48 at the floor) is also echoed
  on the cap, where only 10 characters fit at normal size and 15 at the floor. Put the short
  ID/barcode in `line_1`, name in `line_2` (24 / ~48), composition in `line_3`, and
  date, preparer, expiry and storage merged into `line_4` (29 / ~48). Four lines is the limit.
- The cap label would show `line_1` and the QR; the body PDF417 repeats the same code.

## Flexible codes and cap text (added after the fit review)

Additive and opt-in; with the new fields absent, output is unchanged (`test/golden/zpl.golden.txt`
is byte-identical, SHA-1 `20d6ab92…`). The app's `dist/` JS hash changes because the shared
source files were edited, but ZPL for every existing input is the same.

- `LabelData.freeCode: true` — `code` is used exactly as given (trimmed, case kept), no
  uuid/hex shape rule. Printing is not blocked by the core; call `checkLabel(data)`.
- `LabelData.mirrorText: { cap_id: "Tris/NaCl" }` — text for mirror fields (bottle `cap_id`).
  Blank/absent keeps the echo of `line_1`, so PlateTagsWebApp behaves as before. The app's
  on-screen preview does not read `mirrorText` (it still echoes `line_1`); inventory should
  use its own preview or `buildLabelZpl`.
- `checkLabel(data): {level, field, message}[]` — `error` = will not print/scan correctly
  (non-ASCII, `^`/`~`, PDF417 needs more rows than the label has, code wider than the free
  space beside it, QR outside the cap circle); `warn` = text longer than `maxChars` at the
  smallest font (cut with `+`). Uses the real bwip-js module counts and the template's
  regions and neighbouring fields; margins are 0.08 in, gap 0.02 in. Example on the bottle:
  `INV-AB12CD34EF` passes; a 30-character code fails (PDF417 1.85 in vs 1.80 free, and the
  QR does not fit the cap circle). The practical bottle limit is therefore about 14 to 20
  characters depending on content.
- `test/golden/zpl-free.golden.txt` records ZPL plus `checkLabel` results for these cases.
Not verified by a physical print or a scan test; limits are computed geometry.
