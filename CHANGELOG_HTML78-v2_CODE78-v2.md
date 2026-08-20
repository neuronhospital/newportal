# HTML78-v2 + CODE78-v2 Changelog

## Compared with HTML78-v1 + CODE78-v1

### Reliability
- Added `recovery.js` to automatically inspect pending/uncertain OPD and EEG booking transactions after reopening when connectivity is available.
- IndexedDB upgraded to `NEURON_V2`.
- Added transaction indexes for `status` and `type`.
- Transaction records now retain `updatedAt`.
- Existing request-ID based recovery is retained.

### Offline shell
- Service worker cache upgraded to `neuron-static-v2`.
- Added navigation fallback to `index.html`.
- Old service-worker cache is deleted during activation.
- Cached-first application-shell behavior improves page reloads and browser restarts on poor networks.

### Secure portals
- 12-hour secure-access cache is explicitly configurable.
- Update OPD, Update EEG and Statistics remain protected.
- Once locally authorized, protected pages can open offline for the 12-hour window.

### Backend
- Added v2 bootstrap helpers without changing the nine-city spreadsheet schema.
- Beed remains Thursday (2nd & 4th Thursday, 7 AM–10 PM).
- Existing request-ID duplicate/recovery architecture is retained.

### Charges
- OPD max ₹2,000.
- EEG max ₹3,000.
- Latur EEG default ₹1,100.
- Other-city EEG default ₹1,600.

### Text normalization
- OPD name/address/referrer inputs retain first-letter capitalization.

## Deliberate limitation
This is still an **offline-tolerant** website, not a true offline-write database. A brand-new booking cannot be committed to Google Sheets without connectivity. IndexedDB protects the request and allows the browser to recover the server result after a temporary network failure.

## Required production regression tests
- New OPD
- Follow-up OPD
- Shared-family WhatsApp number
- OPD duplicate/double tap
- Network loss during OPD commit
- Browser close/reopen recovery
- EEG booking
- OPD update including mobile-number correction
- EEG update
- 12-hour secure access
- Offline protected-page access
- Statistics
- CSV export
- all nine city schedules
- Latur 5th Thursday exception
