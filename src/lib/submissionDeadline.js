/**
 * Central configuration for the project submission deadline.
 * Submissions close on September 5, 2026 at 11:59 PM local time.
 */
export const SUBMISSION_CUTOFF_DATE = "September 5, 2026 23:59:00";

// Master switch for the Final Submission Portal (nav link, hero/CTA buttons,
// submission countdowns, and the /submit-project page). Flip to true to
// bring the whole portal back.
export const SUBMISSION_PORTAL_ENABLED = false;

export function isSubmissionClosed() {
  const targetDate = new Date(SUBMISSION_CUTOFF_DATE).getTime();
  const now = new Date().getTime();
  return now >= targetDate;
}
