# HTML78-v14 + CODE78-v4 — OPD New Booking Default Date

## Problem
In the New OPD section, Date of Appointment was showing today's date.

The requirement is that the appointment date must be determined by the existing visiting-city schedule logic:
- take the city currently selected in Visit Location,
- ignore elapsed dates,
- find the first valid upcoming visit date for that city,
- display that date by default,
- keep the calendar collapsed until the user clicks the Date of Appointment field.

## Actual cause
`resetFields()` was explicitly calling `setTodayDateDisplay()`, so the field was populated with today's date regardless of the selected city's visit schedule.

The Visit Location change handler also used `setTodayDateDisplay()`.

## Fix
Added one OPD-local helper: `setNextAvailableDate(city)`.

It:
1. Uses the current Visit Location.
2. Uses the existing `getCalendarDates()` function, which first uses the backend `getAvailableDates` schedule and falls back to `Schedule.dates`.
3. Searches the current and future months.
4. Ignores dates before today.
5. Selects the first valid upcoming scheduled date.
6. Sets the Date of Appointment field and its appointment-date key.
7. Does not open the calendar.

The Date of Appointment click handler remains unchanged and is still the only normal action that expands the calendar.

## Follow-up
The existing Follow-up-specific default-date helper remains untouched by this change. This release is specifically correcting the New/Visit Location default-date behavior.

## Strict scope

### Files changed
**Functional**
- `js/opd.js` — New OPD default appointment date and Visit Location date selection.

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

No backend, spreadsheet, payment, EEG, update, Statistics, security, or offline logic was changed.
