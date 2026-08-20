# NEURON Hospital multi-page portal — HTML78-v2 / CODE78-v2

1. Deploy `code78-v2.gs` as the Apps Script web app.
2. Open `js/config.js` and replace `PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE` with the deployed `/exec` URL.
3. Upload the complete folder to GitHub Pages.
4. Put `doctor_photo.jpg` in `assets/` if it is not already there.
5. Test against a test spreadsheet before production.

Important changes:
- Beed = 2nd & 4th Thursday, 7 AM–10 PM.
- OPD maximum = ₹2000.
- EEG maximum = ₹3000.
- Latur EEG default = ₹1100; other cities = ₹1600.
- OPD typed text is normalized to first-letter-capitalized words before submission.
- Multi-page frontend with shared CSS/JS.
- IndexedDB transaction persistence for booking/update requests.
- Service-worker application-shell caching.


## Configured Apps Script endpoint
The supplied `/exec` endpoint has already been inserted into `js/config.js`.

## Doctor photo
The supplied photograph is included as `assets/doctor_photo.jpg` and referenced by `index.html`.
