# HTML78-v15 + CODE78-v4 — Statistics / Update Load / General UX Fixes

## 1. Patient / EEG Retrieval Portal — invalid JSON error
### Actual problem
`js/api.js` used `response.json()` directly. If the Apps Script endpoint/proxy returned an HTML response beginning with `<!DOCTYPE ...>` instead of JSON, the browser raised:

`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

### Change
The API wrapper now reads the response as text first and explicitly parses JSON. If the response is not JSON, it reports a meaningful server-response error instead of exposing the raw JSON parser exception.

No backend logic was changed.

## 2. Statistics — Download CSV
### Actual problem
The CSV was generated client-side, but the Blob URL was revoked immediately after `click()`. Some mobile browsers can cancel the download when the object URL is revoked too soon.

### Change
The object URL is kept alive for 1.5 seconds before cleanup.

### Alignment
The Download CSV row is now center-aligned.

## 3. Update OPD / Update EEG — Load feedback
### Change
The shared update-page Load handler now immediately changes the button to:
`Retrieving…`

and displays:
`Retrieving patient information from the server…`

The button is disabled while the request runs and restored afterward. Errors are displayed in the status area.

The underlying retrieval action was not changed.

## 4. General button click feedback
### Change
All buttons receive a short green visual feedback state when clicked, so the receptionist can immediately see that the click was received.

This is visual feedback only and does not alter button actions.

## 5. Numeric keyboard
### Change
Numeric input mode is applied to:
- Statistics password
- Update OPD password
- Update EEG password
- WhatsApp number fields where present
- Follow-up WhatsApp number
- Correct WhatsApp number in OPD Update

This requests the numeric keyboard on mobile devices. It does not change validation.

## Files changed
### Functional
- `js/api.js` — robust non-JSON response handling.
- `js/stats.js` — mobile-safe CSV download cleanup.
- `js/update.js` — Update OPD/EEG Load progress feedback.
- `js/common.js` — numeric input mode + global button click feedback.
- `statistics.html` — explicit numeric input mode on Statistics password.
- `css/base.css` — centered CSV button + click feedback styling.

### Version/changelog
- `js/common.js` also contains the displayed version footer update.
- `CHANGELOG_HTML78-v15_CODE78-v4.md` — documentation only.

## Files unchanged
- `code78-v4.gs`
- `opd_booking.html`
- `eeg_booking.html`
- `opd_update.html`
- `eeg_update.html`
- `js/opd.js`
- `js/eeg.js`
- `js/secure.js`
- `js/utils.js`
- `js/idb.js`
- `js/recovery.js`
- `js/schedule.js`
- `service-worker.js`

No Google Sheets schema, payment logic, appointment scheduling logic, booking logic, EEG logic, or backend code was changed.
