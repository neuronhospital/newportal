# HTML78-v16 + CODE78-v4 — Footer Restoration

## Actual problem

The footer was not removed from the individual HTML pages. Every page still contains its normal:

`<div id="footer"></div>`

placeholder.

The problem was in `js/common.js` from HTML78-v15. The footer assignment was malformed:

`if(f)f.innerHTML='' \`<footer ...`

The extra quote before the template literal made `common.js` syntactically invalid. Because `common.js` stopped parsing, its DOMContentLoaded code did not execute, so the dynamically generated footer was not inserted.

## Fix

Only the malformed footer assignment was corrected.

The footer is restored with the existing navigation:

- Home
- OPD Booking
- EEG Booking
- Update OPD
- Update EEG
- Statistics

The existing hospital contact section is also restored.

The existing numeric-input and button-click-feedback code from v15 is retained.

## Files changed

### Functional
- `js/common.js` — corrected the footer template literal and updated the displayed version.

### Files unchanged
- `code78-v4.gs`
- all HTML pages
- `js/opd.js`
- `js/eeg.js`
- `js/stats.js`
- `js/update.js`
- `js/api.js`
- `js/secure.js`
- `js/utils.js`
- `js/idb.js`
- `js/recovery.js`
- `js/schedule.js`
- `service-worker.js`
- `css/base.css`

No booking, payment, retrieval, scheduling, spreadsheet, backend, EEG, update, or statistics logic was changed.
