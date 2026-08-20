# HTML78-v3 + CODE78-v3 — OPD Booking Changelog

## Compared with HTML78-v2 + CODE78-v2

### 1. OPD text fields — fixed typing-space problem
**Problem:** `U.title()` used `.trim()` during every `input` event. Therefore when the receptionist typed `Rahul `, the trailing space was immediately removed. The next word could not be entered naturally.

**Changed:**
- Added `U.titleTyping()`.
- It capitalizes each word while preserving a trailing space during typing.
- Final submission still uses `U.title()` for clean storage.
- Applied to Patient Name, Address and Referred By.

### 2. Follow-up retrieval field incorrectly remained visible in New mode
**Problem:** the Follow-up WhatsApp retrieval block was always visible; clicking New only revealed the New fields.

**Changed:**
- Follow-up retrieval section is visible only in Follow-up mode.
- New mode contains only the normal registration WhatsApp field below the patient/payment details.
- No retrieval/load function is attached to the New-mode WhatsApp field.

### 3. Switching New / Follow-up did not reset the form
**Problem:** previous patient data, payment values, WhatsApp verification and selected date could remain when changing mode.

**Changed:**
- New and Follow-up buttons call a complete form reset.
- Verification state, patient selection, date, calendar, payment fields, status messages and patient list are cleared.
- Follow-up remains the default mode after a successful booking.

### 4. Calendar was visible immediately
**Problem:** `calendar()` was called at page initialization, so the calendar was open by default.

**Changed:**
- Calendar is hidden by default.
- It opens only when the appointment-date field is tapped.
- It closes automatically after selecting a date.

### 5. Past scheduled visits were incorrectly displayed as selectable
**Problem:** the schedule API returned all scheduled dates in the month, including dates that had already elapsed. Example: on 21-Aug-2026, Udgir's 9-Aug visit was still purple/selectable.

**Changed:**
- Past dates are now rendered grey/black and disabled.
- Only today/future scheduled dates are selectable.
- Example: on 21-Aug-2026 for Udgir, 9-Aug is unavailable and 23-Aug is available.
- Added previous/next month calendar navigation.
- Backend independently rejects a past appointment date, so this is not only a UI restriction.

### 6. Submit-button feedback
**Problem:** pressing Book OPD gave no immediate visual acknowledgement before/while the network request was running.

**Changed:**
- Button is immediately disabled.
- Status changes to `Submitting your OPD appointment…`.
- On success: `✓ Appointment submitted successfully.`
- On network uncertainty: explicit warning not to submit again.
- Existing request-ID recovery remains intact.

### 7. OPD charges were incorrectly capped at ₹1,500 in backend payment derivation
**Problem:** the frontend allowed up to ₹2,000, but the backend still contained an older `<=1500` condition when deriving the actual OPD charge from payment fields. This could cause entered amounts to fall back to the default ₹500.

**Changed:**
- Backend payment-derived OPD charge ceiling changed to ₹2,000.
- Cash and Online use the entered amount.
- Split uses Cash + Online total.
- Backend remains authoritative and rejects totals above ₹2,000.

### 8. Split-payment UI
**Problem:** Split mode still left the `OPD Charges Paid` ₹500 field visible, creating ambiguity about which value was authoritative.

**Changed:**
- Cash/Online mode: `OPD Charges Paid` is shown.
- Split mode: `OPD Charges Paid` is hidden.
- Only Cash and Online fields are shown.
- Live `Total: ₹...` is displayed directly underneath.
- Split total is capped at ₹2,000.

### 9. Next Follow-up City was not reliably stored
**Problem:** CODE78-v2 intentionally blanked Next Follow-up City for non-Latur OPD bookings:
`city === "Latur" ? ... : ""`.

**Changed:**
- Next Follow-up City is now validated and stored for all nine visiting cities.
- The selected city is still the default, but the receptionist can change it.
- Confirmation displays the saved Next Follow-up City.

### 10. WhatsApp button width
**Problem:** the button contained text plus icon and occupied unnecessary horizontal space on mobile.

**Changed:**
- Replaced the text button with a compact WhatsApp icon-only button.
- Added `aria-label` and tooltip for accessibility.

### 11. Successful confirmation resets booking form
**Problem:** confirmation was displayed but the booking form retained the previous patient's values.

**Changed:**
- Immediately after a confirmed/recovered booking, the complete OPD form is reset.
- Confirmation remains visible.
- The portal returns to clean Follow-up mode ready for the next receptionist entry.

## Backend safeguards added
- Past appointment dates are rejected server-side.
- Next Follow-up City is persisted for all cities.
- OPD payment derivation now consistently permits ₹0–₹2,000.
- Existing request-ID idempotency/recovery remains unchanged.

## Version
- HTML: `HTML78-v3`
- Backend: `CODE78-v3`

## Testing focus for this version
1. Type `Rahul Patil` naturally with a space.
2. Switch New → Follow-up → New and verify all fields clear.
3. Confirm New mode has no Follow-up retrieval block.
4. Open date field and confirm calendar starts hidden.
5. Udgir on 21-Aug-2026: 9-Aug grey/unavailable, 23-Aug purple/selectable.
6. Navigate to next month.
7. Enter OPD ₹700 Cash and verify sheet stores 700.
8. Enter OPD ₹800 Online and verify sheet stores 800 Online.
9. Enter Split ₹300 + ₹450 and verify total ₹750.
10. Verify Next Follow-up City is stored even for non-Latur booking.
11. Confirm submit status appears immediately.
12. Confirm form clears immediately after successful confirmation.
