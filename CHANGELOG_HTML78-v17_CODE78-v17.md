# HTML78-v17 + CODE78-v17 — Statistics Unavailable State + OPD Update Retrieval Fix

## 1. Patient / EEG Retrieval Portal

### Problem
When the selected city/date/mode had no matching records, the frontend rendered zero-valued summary cards, an empty table, and Download CSV.

### Change
If the selected Patient / EEG / Patient + EEG mode has zero relevant rows:
- shows a clear "Record is not available..." message,
- does not show zero summary cards,
- does not show a table,
- does not show Download CSV.

The actual selected city, period, and mode are included in the message.

No retrieval filtering logic was changed.

## 2. Update OPD Details — Address

### Problem
The backend response used by the update page did not include the spreadsheet Address column. The frontend therefore received `undefined`.

### Change
The backend now returns column F (Address) as `address`, and the frontend uses `x.address || ""`.

## 3. Update OPD Details — Payment Mode

### Problem
The update page always started with Cash selected and showed Cash/Online inputs regardless of the original payment.

### Change
The backend derives the original OPD payment mode from the stored payment amounts:
- Cash: cash > 0, online = 0
- Online: online > 0, cash = 0
- Split: both > 0
- Free: both = 0

The update page now loads the original mode and original cash/online amounts.

For Cash or Online mode:
- Cash/Online split input fields are hidden.
- Only the OPD Charges field and Payment Mode are shown.

For Split:
- Cash and Online fields are shown.
- Previously stored cash and online amounts are loaded.
- Total can be understood from the two displayed amounts.

## Strict scope

### Files changed
**Functional**
- `js/stats.js` — unavailable-record display.
- `code78-v17.gs` — returns Address and derived OPD payment mode for retrieval/update.
- `js/update.js` — consumes Address/payment-mode data and hides non-Split fields.
- `css/base.css` — unavailable-record styling.

**Version**
- `js/common.js` — version footer changed to HTML78-v17-CODE78-v17.

### Files unchanged
All booking, EEG booking, OPD booking, EEG update, security, IndexedDB, recovery, Service Worker, calendar/schedule, and other unrelated code remains unchanged.

`CODE78-v4.gs` is superseded by `CODE78-v17.gs` because backend response fields were required for the requested OPD Update correction. No other backend functions were modified.
