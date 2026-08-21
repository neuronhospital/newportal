# HTML78-v19 + CODE78-v19 — Consolidated Changelog

## CURRENT PAIR — HTML78-v19 + CODE78-v19

### 1. Patient / EEG Retrieval Portal — retrieval session error after reload

**Problem:** The browser kept a local 12-hour access window, while the Apps Script retrieval session is stored in server CacheService and can expire independently. After a fresh page load, the local browser could therefore believe access was still valid while the backend token had already expired.

**Change:**
- Added a backend `validateRetrievalSession` action.
- On a page reload with cached access, the frontend validates the stored backend token when network is available.
- If the backend session has expired, the cached token is cleared and the password gate is shown again.
- If validation fails because the network is unavailable, the existing 12-hour local access is retained so offline access is not unnecessarily blocked.

### 2. Update OPD Details — invalid Correct WhatsApp Number

**Problem:** A number shorter than 10 digits could reach the update request/IDB uncertainty path, producing:

`Update status is uncertain. Do not repeat it until the original request is checked.`

**Change:**
- Validate the Correct WhatsApp Number before creating the update transaction.
- OPD Update now requires exactly 10 digits beginning with 6, 7, 8, or 9.
- Invalid input immediately shows:

`Enter a valid 10-digit WhatsApp Number.`

- No backend update request is sent for this validation failure.

### 3. Update OPD Details — Details Updated confirmation

**Problem:** The confirmation contained only a generic statement:

`Updated values are now saved in the spreadsheet.`

**Change:**
- The confirmation now lists the fields that actually changed.
- Each changed field shows the previous value and the new value.

Example:

`Address: Old Address → New Address`

`OPD Charges: ₹500 → ₹600`

`Payment Mode: Cash → Split`

If no field values changed, it explicitly says:

`No field values changed.`

- The previous confirmation is collapsed/cleared when Update Details is submitted again.

### 4. Update OPD Details — Address retrieval robustness

**Problem:** Address could appear blank even though the spreadsheet contained an address.

**Change:**
- Backend retrieval now explicitly normalizes the Address field before sending it to the frontend.
- The same normalization is applied through the shared `patientObject_()` response used by update/retrieval paths.
- Existing Address spreadsheet data is preserved; this change does not overwrite it.

### 5. Existing v18 functionality retained

The complete v18 pair remains the baseline, including:
- OPD Update Split Payment total.
- Statistics no-record message.
- Statistics CSV behavior.
- OPD Update payment-mode retrieval.
- OPD Update Address retrieval.
- Footer restoration.
- Numeric mobile keyboard.
- Button click feedback.
- Statistics/session behavior from earlier versions.

---

# HISTORICAL CHANGELOG

## HTML78-v18 + CODE78-v18

- Added live `Total Paid: ₹...` below Cash + Online fields in OPD Update Split mode.
- Total updates when either amount is edited.
- Split fields and total remain hidden for Cash/Online modes.

## HTML78-v17 + CODE78-v17

- Statistics now explicitly reports when no records exist for the selected city/date/mode.
- Empty results no longer display meaningless zero summaries, table, or CSV button.
- OPD Update retrieval now returns Address.
- OPD Update retrieves the actual stored OPD payment mode.
- Original Cash/Online amounts are loaded.
- Cash/Online split fields are shown only for Split mode.

## HTML78-v16 + CODE78-v4

- Restored the dynamically generated footer.
- Corrected the malformed common.js footer template literal.
- Retained the v15 common functionality.

## HTML78-v15 + CODE78-v4

- Added non-JSON API response handling.
- Improved Statistics CSV download reliability on mobile.
- Centered Download CSV button.
- Added Update OPD/EEG Load retrieval feedback.
- Added global button click visual feedback.
- Added numeric keyboard input mode for password and WhatsApp fields.

## HTML78-v14 + CODE78-v4

- New OPD Date of Appointment now uses the selected Visit Location schedule to determine the next valid appointment date instead of automatically using today's date.

## HTML78-v13 + CODE78-v4

- Repaired OPD Follow-up Load initialization regression.
- Restored New-only WhatsApp controls required by existing OPD JavaScript initialization.
- Added visible Follow-up Load/search status.

## HTML78-v12 + CODE78-v4

- Repaired missing New-only WhatsApp DOM elements that prevented OPD JavaScript initialization.
- Follow-up continued to use only its top WhatsApp retrieval field.

## HTML78-v11 + CODE78-v4

- Follow-up Date of Appointment now selects the first valid upcoming visit date for the selected city.
- Calendar remains collapsed until the date field is clicked.

## HTML78-v10 + CODE78-v4

- Removed duplicate Follow-up WhatsApp registration field.
- Continued use of the top Follow-up WhatsApp retrieval field.
- Improved Follow-up date initialization.

## Earlier HTML78 / CODE78 revisions

Earlier revisions established the multi-page portal architecture, common navigation/footer, OPD/EEG booking, Update portals, Statistics retrieval, city scheduling, password protection, IndexedDB recovery, Service Worker caching, idempotent booking/update request IDs, and the Google Sheets backend structure.

---

## PACKAGING RULE

This ZIP intentionally contains **exactly one `CHANGELOG*.md` file**.

The current pair's changes are always at the top, followed by the historical changelog.
