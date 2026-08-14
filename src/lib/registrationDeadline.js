/**
 * Central configuration for registration cutoff.
 * Registrations close on August 15, 2026 at 07:00 AM local time.
 */
export const REGISTRATION_CUTOFF_DATE = "August 15, 2026 07:00:00";

export function isRegistrationClosed() {
  const targetDate = new Date(REGISTRATION_CUTOFF_DATE).getTime();
  const now = new Date().getTime();
  return now >= targetDate;
}
