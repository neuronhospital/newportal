# HTML78-v6 + CODE78-v4 — OPD Booking Fix

## Compared with HTML78-v5 + CODE78-v4

### 1. Multi-word Backspace — corrected properly
The previous v5 attempted to preserve cursor position while rewriting the entire input value on every `input` event. That still allowed the capitalization routine to interfere with Android/mobile text editing.

For v6, the OPD text fields are deliberately **not rewritten during typing**.

While typing:
- spaces remain normal spaces
- Backspace behaves like a native input
- multiple words can be deleted normally
- the user's cursor is never moved by capitalization code

Capitalization is applied:
- when the field loses focus (`blur`)
- again immediately before OPD submission via the existing `U.title()` calls

Affected OPD fields only:
- Patient Name
- Patient Address
- Referred By Dr./Hospital

### 2. WhatsApp icon
The OPD WhatsApp button contains a self-contained green WhatsApp-style SVG icon. No external dependency was added.

### Strict scope
No changes were made to CODE78-v4.

No changes were made to:
- EEG Booking
- OPD Update
- EEG Update
- Statistics
- IndexedDB
- Service Worker
- schedule/calendar logic
- payment logic
- backend
- spreadsheet structure
- Apps Script URL

Only `js/opd.js`, `opd_booking.html`, and the displayed version footer in `js/common.js` were changed.
