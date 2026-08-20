# HTML78-v4 + CODE78-v4 — Changelog

## Statistics / Patient-E.E.G. Retrieval fixes

### 1. Duplicate password prompt removed
**Problem:** Statistics secure access used the frontend gate, but `stats.js` separately called `retrievalLogin` and used `prompt("Statistics password:")` when no backend token existed.

**Change:** The single Statistics password entry now creates the backend retrieval session immediately. The Retrieve Records button reuses that token and does not ask for the password again.

### 2. CSV download added
- Added `Download CSV` after each generated report.
- CSV contains the exact report columns.
- Includes a final TOTAL row.
- Uses UTF-8 BOM for better Excel compatibility.
- Filename contains city, period and report mode.

### 3. Cash / Online collection added
Patient report now explicitly shows:
- Total OPD Collection
- Cash
- Online

EEG report shows:
- Total EEG Charges
- Cash
- Online

Patient + EEG report shows:
- OPD total/cash/online
- EEG total/cash/online
- Combined total collection
- Combined cash
- Combined online

### 4. Table totals added
Patient table footer:
- OPD Charges total
- Cash total
- Online total

EEG table footer:
- EEG Charges total
- Cash total
- Online total

Combined table footer:
- OPD Charges total
- EEG Charges total

### 5. Retrieval date selections aligned with requested portal
Backend now accepts:
- Today
- Yesterday
- Day Before Yesterday
- Current Month
- Last 12 Months
- Current Year
- Last Year

### 6. Retrieval session
The Apps Script retrieval session is extended to the maximum CacheService window (6 hours), so the same authenticated session can be reused throughout a typical working period without repeatedly entering the password.

## Files changed
- `statistics.html` — no structural change required
- `js/stats.js` — major retrieval/report/CSV update
- `js/secure.js` — single-password retrieval-session initialization
- `css/base.css` — report/total/download styling
- `code78-v4.gs` — retrieval session/date-range support
- `js/config.js` — version updated

## Intentionally preserved
- Existing OPD/EEG booking logic
- Existing spreadsheet schema
- Existing nine-city sheets
- Existing secure password
- Existing IndexedDB/service-worker architecture
- Existing doctor photo and Apps Script endpoint
