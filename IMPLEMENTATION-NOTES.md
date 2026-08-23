# NEURON Hospital Website — Selected Hardening Changes

Baseline: `Baseline-Latesr-EverythingWorking-22082026.zip`

Implemented only the selected priorities:

1. Backend-enforced OPD/EEG update authentication
2. Password removed from public `secure.js`; password authority remains in Apps Script
3. OPD/EEG update recovery using existing request IDs/status checking
4. One canonical backend visit schedule
5. Latur 5th-Sunday availability
6. WhatsApp UI wording corrected so it does not claim number verification

## 1. Backend update authentication

The update pages now call `updateLogin`.

Apps Script creates a short-lived opaque update session token.

The backend validates that token for:

- `updateOPDDetails`
- `updateEEGDetails`
- `getUpdateStatus`
- update-page patient lookup when `updateToken` is supplied

The public frontend does not contain the password.

The existing password value remains server-side in `code78-v5.gs` through the backend configuration.

## 2. Update recovery

`recovery.js` now resolves:

- `OPD_UPDATE`
- `EEG_UPDATE`

using `getUpdateStatus` and the original `updateRequestId`.

The update token is deliberately **not stored inside the IndexedDB transaction payload**. Recovery obtains it from the authenticated browser session.

An uncertain update is never blindly resubmitted.

## 3. Canonical schedule

The backend now has one `VISIT_SCHEDULE` definition containing date rules and time windows.

The following backend operations use that definition:

- visit-date validation
- available-date generation
- today's active visit cities
- visit-information schedule text

The frontend calendar requests available dates from the backend and caches the returned calendar month in IndexedDB for offline fallback.

The old independent `schedule.js` rule set has been removed.

## 4. Latur 5th Sunday

Latur now explicitly includes the 5th Sunday rule:

- 5th Sunday: 8 AM–10 PM

Ordinary Sundays remain unavailable.

## 5. WhatsApp wording

The OPD booking UI now says:

`✓ WhatsApp link opened`

instead of:

`✓ WhatsApp number confirmed`

Opening a `wa.me` link does not prove ownership of the number, so the new wording reflects the actual action.

## 6. Service-worker consequence of this release

The service-worker cache was advanced from `neuron-static-v2` to `neuron-static-v3`.

Application JS/CSS now use network-first behavior with cached fallback. This is intentional: fresh booking/update code is more important than serving stale cached application code.

## Files changed

- `code78-v5.gs`
- `opd_update.html`
- `eeg_update.html`
- `js/secure.js`
- `js/opd_update.js`
- `js/eeg_update.js`
- `js/recovery.js`
- `js/opd.js`
- `opd_booking.html`
- `service-worker.js`

Removed obsolete duplicate modules:

- `js/update.js`
- `js/schedule.js`

## Deployment order

1. Deploy the updated Apps Script backend from `code78-v5.gs` as the new web-app version.
2. Keep the same `/exec` URL if possible.
3. Publish the updated GitHub Pages files.
4. Confirm the new service-worker cache version is active.
5. Test OPD update login.
6. Test EEG update login.
7. Test direct update calls without a token — they must be rejected by the backend.
8. Test an intentionally interrupted update and verify recovery using the same request ID.
9. Test Latur 5th Sunday in the calendar.
10. Test an ordinary Sunday for Latur remains unavailable.
11. Test WhatsApp button wording.

## Important

This release intentionally does **not** change:

- Google Sheets architecture
- booking idempotency
- ScriptLock booking mechanism
- OPD/EEG booking workflow
- statistics authentication architecture
- version-footer system
- 1,000-row active-search policy


## Statistics schedule-aware city selection

- `js/stats.js` now determines the default Statistics city from the backend canonical `VISIT_SCHEDULE`.
- New API action: `getScheduledCitiesForDate`.
- If one or more cities are scheduled today, the dropdown defaults to the currently active scheduled city when within a visit window; otherwise it defaults to the first city in canonical schedule order.
- The user can still manually change the city.
- The schedule result is cached locally for the current Asia/Kolkata date as a fallback if the schedule request fails.
- No GPS/browser location permission is used. This is schedule-aware, not device-GPS-aware.


## Schedule update — Latur 5th Sunday and Omerga

- Latur 5th Sunday is now **8 AM–10 PM**.
- Omerga 1st Saturday is **not available**.
- Omerga 2nd, 3rd, 4th and 5th Saturdays are **available 8 AM–3 PM**.
- The canonical backend `VISIT_SCHEDULE` remains the single schedule authority.
- Statistics schedule-aware city selection consumes the same backend schedule.
- Schedule version updated to `2026-08-22-v2`.
