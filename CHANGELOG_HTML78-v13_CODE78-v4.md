# HTML78-v13 + CODE78-v4 — OPD Follow-up Load Button Repair

## Actual cause found after tracing v12

The Follow-up Load handler was not the immediate problem.

`js/opd.js` binds the Load handler only after binding several earlier controls, including:

- `$("wa").oninput`
- `$("waBtn").onclick`

The previous Follow-up cleanup had removed the `wa`/`waBtn` DOM elements from `opd_booking.html`, while `opd.js` still referenced them.

Therefore `opd.js` threw a JavaScript error during initialization at the missing element reference. Because initialization stopped at that point, the Load handler was never attached.

This explains both symptoms:
- Load button did nothing.
- There was no "searching/loading" message.

## Fix

### 1. Restore New-only WhatsApp controls
The `wa` and `waBtn` elements are restored inside the **New OPD section only**.

They are not displayed in Follow-up mode.

Follow-up therefore still has only:
- WhatsApp Number at top
- Load button
- Patient selection

### 2. Load feedback
The existing Load handler now explicitly shows:

- `Searching patient records…`
- `X patient(s) found.`
- `No patient found for this WhatsApp number.`
- `Unable to retrieve patient details: ...`

The button is disabled while the request is running and re-enabled afterward.

### 3. Retrieval logic unchanged
The existing API call remains:

`getPatientHistoryByWhatsApp`

No backend search algorithm was changed.

## Strict scope

`CODE78-v4` remains unchanged.

### Files changed
**Functional**
- `opd_booking.html` — restored New-only WhatsApp controls.
- `js/opd.js` — Load-button feedback and result/error messaging.

**Version only**
- `js/common.js` — version footer only.

### Files unchanged
- `code78-v4.gs`
- `js/utils.js`
- `js/api.js`
- `js/idb.js`
- `js/recovery.js`
- `js/schedule.js`
- `js/eeg.js`
- `js/update.js`
- `js/stats.js`
- `js/secure.js`
- `service-worker.js`
- `css/base.css`
- all other portal HTML files

No backend, spreadsheet, payment, calendar, EEG, Statistics, update, security, or offline logic was modified.
