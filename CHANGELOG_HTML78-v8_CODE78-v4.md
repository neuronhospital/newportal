# HTML78-v8 + CODE78-v4 — OPD Appointment Date Display Fix

## Problem
The OPD Booking Date of Appointment field was blank by default. The user should see today's date before opening the calendar.

## Actual cause
The OPD `resetFields()` routine cleared the date input:

`$("date").value=""`

and the initial page setup called that reset routine. The date field therefore remained blank until an appointment date was selected.

The calendar itself is a separate UI element and should remain collapsed until the date field is clicked.

## Fix
Only the OPD Booking page was changed.

- Date of Appointment now displays today's date by default.
- Today's date is calculated using the existing India/Asia-Kolkata date helper.
- Display format is `DD-MM-YYYY`.
- The calendar remains hidden/collapsed by default.
- The existing date-field interaction remains responsible for opening the calendar when the user taps/clicks the field.
- Resetting the OPD booking form restores today's date instead of leaving the field blank.

## Strict scope
`CODE78-v4` is unchanged.

No changes were made to:
- EEG Booking
- OPD Update
- EEG Update
- Statistics
- payment logic
- city schedules
- appointment availability rules
- IndexedDB
- Service Worker
- duplicate protection
- spreadsheet structure
- Apps Script endpoint

Only the OPD date initialization/reset behavior and the displayed version footer were changed.
