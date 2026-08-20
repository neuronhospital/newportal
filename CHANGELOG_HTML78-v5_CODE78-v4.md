# HTML78-v5 + CODE78-v4 Changelog

## Scope
This release addresses **only the two OPD Booking Portal issues reported after HTML78-v4**. CODE78-v4 is carried forward unchanged.

### 1. Multi-word text deletion / Backspace
**Problem:** OPD text fields normalize capitalization on every `input` event. The previous handler replaced the entire input value without restoring the user's caret/selection. On mobile browsers this could move the cursor to the end after each edit, making Backspace appear to work only on the last word.

**Fix:** The OPD-local capitalization handler now:
- preserves `selectionStart`
- preserves `selectionEnd`
- normalizes capitalization
- restores the corresponding caret/selection position

This applies only to the OPD Booking fields:
- Patient Name
- Patient Address
- Referred By Dr./Hospital

No global `utils.js` behavior was changed.

### 2. WhatsApp button icon
**Problem:** The compact OPD WhatsApp button was displaying `◉`, which is not a WhatsApp icon.

**Fix:** Replaced only that symbol with a self-contained green WhatsApp-style SVG icon. No external icon library or network dependency was introduced.

### Backend
**CODE78-v4 is unchanged.** No Apps Script/backend logic was modified for this release.

### Regression protection
No changes were made to:
- EEG Booking
- OPD Update
- EEG Update
- Statistics/Retrieval
- IndexedDB
- Service Worker
- scheduling logic
- payment logic
- spreadsheet schema
- Apps Script endpoint
- duplicate-booking logic
