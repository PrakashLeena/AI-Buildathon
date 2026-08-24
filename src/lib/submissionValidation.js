const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?[0-9]{1,4}[\s-]?)?([0-9\s-]{7,15})$/;

/**
 * Validates the Submission Overview & Brief Form fields.
 * Returns an object mapping field keys to error messages.
 */
export function validateSubmissionForm(form) {
  const errors = {};

  // 1. Participant Details
  // Email
  const email = (form.participantEmail || '').trim();
  if (!email) {
    errors.participantEmail = 'Participant email address is required.';
  } else if (!EMAIL_RE.test(email) || email.length > 254) {
    errors.participantEmail = 'Please enter a valid email address (e.g. name@domain.com).';
  }

  // Team
  const team = (form.team || '').trim();
  if (!team) {
    errors.team = 'Please select or enter the participant’s team.';
  } else if (team.length < 2) {
    errors.team = 'Team name must be at least 2 characters.';
  }

  // WhatsApp Number
  const whatsapp = (form.whatsapp || '').trim();
  const digitsOnly = whatsapp.replace(/\D/g, '');
  if (!whatsapp) {
    errors.whatsapp = 'WhatsApp number is required.';
  } else if (!PHONE_RE.test(whatsapp) || digitsOnly.length < 8 || digitsOnly.length > 15) {
    errors.whatsapp = 'Please enter a valid WhatsApp number (e.g. +94 77 123 4567).';
  }

  // 2. Email Verification OTP
  const otp = (form.otp || '').trim();
  if (form.isOtpRequired) {
    if (!form.otpToken) {
      errors.otp = 'Please send the verification code to your email first.';
    } else if (!otp) {
      errors.otp = 'Enter the OTP received by email.';
    } else if (!/^\d{6}$/.test(otp)) {
      errors.otp = 'OTP must be a 6-digit numeric code.';
    }
  }

  // 3. Project Brief & Background
  const brief = (form.projectBrief || '').trim();
  if (!brief) {
    errors.projectBrief = 'Please provide an overview and background for your project.';
  } else if (brief.length < 50) {
    errors.projectBrief = `Project brief is too short (${brief.length}/50 min characters). Please provide more background, problem details, and objectives.`;
  } else if (brief.length > 5000) {
    errors.projectBrief = `Project brief is too long (${brief.length}/5000 max characters).`;
  }

  return errors;
}
