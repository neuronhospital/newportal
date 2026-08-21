# HTML78-v18 + CODE78-v18 — OPD Update Split Payment Total

## Requested change
In Update OPD Details, when Payment Mode is Split, show the total of Cash + Online immediately below the two fields.

## Implementation
When Payment Mode = Split:
- Cash field is shown.
- Online field is shown.
- Previously retrieved Cash and Online amounts remain populated.
- `Total Paid: ₹amount` is shown below the two fields.
- The total updates immediately when either amount is edited.

Example:
Cash ₹200 + Online ₹300 → Total Paid ₹500.

When Payment Mode is Cash or Online:
- Cash/Online split fields remain hidden.
- Split total is hidden.

## Scope
Functional change:
- `js/update.js`

Version-only:
- `js/common.js`

No backend, spreadsheet, booking, EEG, Statistics, security, IndexedDB, Service Worker, calendar, or unrelated logic was changed.
