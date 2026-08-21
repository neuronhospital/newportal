# HTML78-v7 + CODE78-v4 — OPD Confirmation Fix

## Problem
After a successful OPD booking, the page displayed:

**“✓ Appointment submitted successfully.”**

but the confirmation box was empty/not visible.

## Actual cause
The confirmation HTML was correctly created, but immediately afterward the code called:

`resetFields("Follow-up")`

The `resetFields()` function deliberately clears and hides the confirmation section:

- `confirmation.innerHTML=""`
- `confirmation.hidden=true`

Therefore the sequence was:

1. Build confirmation box.
2. Reset booking form.
3. Reset function deletes the confirmation box.
4. Code unhides the now-empty confirmation section.

This produced the exact behavior reported: successful submission message, but no confirmation content.

## Fix
The confirmation HTML is now stored in a temporary variable first.

Then:
1. Booking form is reset.
2. Confirmation HTML is restored.
3. Confirmation box is made visible.

The same correction was applied to the **recovered booking** path so network-recovery confirmations behave consistently.

## Strict scope
No backend changes.

`CODE78-v4` is carried forward unchanged.

No changes were made to:
- EEG Booking
- OPD Update
- EEG Update
- Statistics
- payment logic
- calendar/schedule
- IndexedDB
- Service Worker
- duplicate protection
- spreadsheet schema
- Apps Script endpoint

Only `js/opd.js` and the displayed version footer in `js/common.js` were changed.
