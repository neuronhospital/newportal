# HTML78-v21 + CODE78-v21 — Consolidated Changelog

## CURRENT PAIR — HTML78-v21 + CODE78-v21

### Update OPD Details — Address retrieval correction

**Requested behavior:** Do not use or display a Google Sheets displayed/formatting value as an Address fallback.

**Change:**
- Update OPD retrieval now uses only the actual stored Address value from spreadsheet column F (`row[5]`).
- Removed the `getDisplayValues()` fallback for Address.
- If the stored Address value is empty, the Update OPD Address field remains empty.
- No Google Sheets display-format value is substituted.

### Existing v20 functionality retained

- Update OPD/EEG read-only Load retry for intermittent HTTP 404 responses.
- Retrieval status during retry.
- All v19 and earlier functionality remains carried forward.

---

# HISTORICAL CHANGELOG

## HTML78-v20 + CODE78-v20

- Added up to 3 retries for intermittent HTTP 404 responses during read-only Update OPD/EEG patient Load.
- Added retry status feedback.
- Added Address fallback using displayed spreadsheet value. **This behavior is removed in v21 per request.**

## HTML78-v19 + CODE78-v19

- Added retrieval-session validation after Statistics page reload.
- Correct WhatsApp Number validated before update transaction creation.
- Details Updated confirmation shows actual changed fields.
- Previous confirmation cleared on a new update.
- Address retrieval normalization.

## HTML78-v18 + CODE78-v18

- Added live Total Paid for OPD Update Split payment.

## HTML78-v17 + CODE78-v17

- Added Statistics no-record handling.
- Hid empty-result table and CSV.
- Added OPD Update Address/payment-mode retrieval.
- Added Split payment field handling.

## HTML78-v16 + CODE78-v4

- Restored dynamically generated footer.
- Corrected malformed common.js footer template.

## HTML78-v15 + CODE78-v4

- Improved invalid/non-JSON response handling.
- Improved CSV download.
- Centered CSV button.
- Added retrieval feedback.
- Added button-click feedback.
- Added numeric keyboard input mode.

## HTML78-v14 + CODE78-v4

- OPD appointment date uses selected-city schedule to determine the next valid date.

## HTML78-v13 and earlier

- Earlier OPD Follow-up retrieval/date fixes and the previously established multi-page portal, booking, EEG, security, IndexedDB, recovery, Service Worker, schedule, and backend functionality.

---

## PACKAGING

Exactly **one** `CHANGELOG*.md` file is included in this ZIP.
