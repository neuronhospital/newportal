# HTML78-v9 + CODE78-v4 — OPD Appointment Date Default

## Problem
The Date of Appointment field should show today's date by default and tapping/clicking the field should open the calendar.

## Actual cause
HTML78-v8 correctly initialized today's date on page load/reset, but the OPD `city.onchange` handler then explicitly did:

`$("date").value=""`

Therefore, whenever the receptionist changed Visit Location, the Date of Appointment field became blank again.

This was especially confusing because changing Visit Location is a normal part of booking.

## Fix
Only the OPD city/date interaction was changed.

When Visit Location changes:
- Date of Appointment now returns to today's date.
- The calendar month remains positioned on the current month.
- The existing calendar click handler is preserved.
- The existing availability rules are untouched.

The date field remains disabled until WhatsApp verification, as required by the existing OPD flow. After WhatsApp verification, the field is enabled and clicking/tapping it opens the calendar.

## Strict scope
`CODE78-v4` is unchanged.

No changes were made to:
- EEG Booking
- OPD Update
- EEG Update
- Statistics
- payment logic
- schedule rules
- availability rules
- IndexedDB
- Service Worker
- duplicate protection
- spreadsheet schema
- Apps Script endpoint

Only `js/opd.js` and the displayed version footer in `js/common.js` were changed.
