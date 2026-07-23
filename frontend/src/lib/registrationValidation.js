const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Computes a { fieldKey: errorMessage } map for the registration form.
 * Used both for immediate per-field (on blur) feedback and to gate submit.
 */
export function validateRegistrationForm(form, teamSize, members) {
  const errors = {};

  if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!form.email.trim()) errors.email = 'Email address is required.';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!form.studentId.trim()) errors.studentId = 'Student ID / Reg No is required.';
  if (!form.faculty) errors.faculty = 'Please select a faculty.';
  if (!form.department) errors.department = form.faculty ? 'Please select a department.' : 'Select a faculty first.';
  if (!form.yearOfStudy) errors.yearOfStudy = 'Please select a year of study.';
  if (!form.teamName.trim()) errors.teamName = 'Team name is required.';

  for (let i = 0; i < teamSize - 1; i++) {
    const member = members[i] || {};
    if (!member.name || !member.name.trim()) {
      errors[`member-${i}-name`] = `Member ${i + 2}'s full name is required.`;
    }
    if (!member.student_id || !member.student_id.trim()) {
      errors[`member-${i}-student_id`] = `Member ${i + 2}'s Student ID is required.`;
    }
  }

  return errors;
}

const DRAFT_KEY = 'aibuildathon_register_draft_v1';

/** Loads a previously auto-saved (in-progress) draft, if any. */
export function loadRegistrationDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Auto-saves in-progress form data so an accidental modal close doesn't lose it. */
export function saveRegistrationDraft(data) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage may be unavailable (private browsing, quota, etc.) - fail silently.
  }
}

/** Clears the draft once it's no longer needed (successful submit / explicit reset). */
export function clearRegistrationDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
