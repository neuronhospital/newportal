# HTML78-v10 + CODE78-v4 — OPD Follow-up Fix

## Scope
Only the OPD Follow-up section was modified.

### 1. Removed duplicate WhatsApp field
The WhatsApp field that appeared below OPD Charges was the registration field (`id="wa"`). In Follow-up mode this duplicated the already-used retrieval number (`id="followWa"`).

It was removed from the OPD form. Follow-up patients continue to be retrieved using the WhatsApp number at the top.

The patient remains linked to the retrieved WhatsApp number; no second WhatsApp field is presented for editing.

### 2. Follow-up Date of Appointment
The follow-up patient-selection handler previously did:

`$("date").value=""; delete $("date").dataset.key;`

and stopped there. Therefore the Date of Appointment field became blank.

The follow-up selection now:
- selects the retrieved patient's Visit Location,
- keeps Next Follow-up City,
- enables the booking fields,
- positions the calendar on the current India-local month,
- invokes the existing calendar renderer,
- allows the existing schedule logic to determine the valid appointment dates.

No calendar availability rules or backend date validation were changed.

## Strict scope
`CODE78-v4` is unchanged.

No changes were made to:
- New OPD booking logic
- payment logic
- OPD confirmation
- EEG Booking
- OPD Update
- EEG Update
- Statistics
- IndexedDB
- Service Worker
- city schedule definitions
- backend
- spreadsheet schema
- Apps Script endpoint

## Files changed
### Functional
- `opd_booking.html` — removed the duplicate Follow-up WhatsApp/registration field.
- `js/opd.js` — changed only follow-up patient selection/date initialization.

### Version only
- `js/common.js` — version footer only.
