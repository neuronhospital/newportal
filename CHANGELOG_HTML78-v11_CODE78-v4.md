# HTML78-v11 + CODE78-v4 — OPD Follow-up Date Fix

## Problem
In OPD Follow-up mode, after a patient was loaded and selected, the Date of Appointment field remained blank.

The requirement is:
- use the selected patient's Visit Location,
- automatically show the first valid upcoming visit date for that city,
- keep the calendar collapsed,
- expand the calendar only when the Date of Appointment field is clicked.

## Actual cause
HTML78-v10 correctly invoked the calendar renderer after selecting the Follow-up patient, but the code still did:

`$("date").value=""; delete $("date").dataset.key;`

and then called `renderCalendar()`.

`renderCalendar()` is designed to **display/expand the calendar**, not to choose a default appointment date. Therefore the date field stayed blank and the calendar was expanded immediately.

## Fix
Added one OPD-local helper: `setFollowupDefaultDate(city)`.

It:
1. Uses the selected Visit Location.
2. Retrieves scheduled dates for the current month and future months.
3. Ignores dates earlier than today.
4. Selects the first valid upcoming visit date.
5. Places that date in the Date of Appointment field.
6. Stores the corresponding appointment-date key.
7. Explicitly keeps the calendar collapsed.

The existing `renderCalendar()` remains unchanged and is still called only when the receptionist clicks the Date of Appointment field.

## Example
If today is 21 August and Udgir visits are 2nd and 4th Sunday:
- 9 August is ignored because it has elapsed.
- 23 August becomes the default Date of Appointment.
- Calendar remains hidden.
- Clicking the date field expands the calendar.

## Strict scope
`CODE78-v4` is unchanged.

### Files changed
**Functional**
- `js/opd.js` — Follow-up default appointment-date selection only.

**Version only**
- `js/common.js` — displayed version footer only.

### Files unchanged
- `opd_booking.html`
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

No backend, spreadsheet, payment, EEG, update, statistics, security, or offline logic was changed.
