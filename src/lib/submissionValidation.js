const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?[0-9]{1,4}[\s-]?)?([0-9\s-]{7,15})$/;

/**
 * Validates the Submission Overview & Brief Form fields.
 * Returns an object mapping field keys to error messages.
 */
export function validateSubmissionForm(form) {
  const errors = {};

  // 1. Participant Details
  // Email (supports any valid email, e.g. @stu.kln.ac.lk, @gmail.com, etc.)
  const email = (form.participantEmail || '').trim();
  if (!email) {
    errors.participantEmail = 'Participant email address is required.';
  } else if (!EMAIL_RE.test(email) || email.length > 254) {
    errors.participantEmail = 'Please enter a valid email address (e.g. name@stu.kln.ac.lk or name@gmail.com).';
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

  // 3. Project Brief & Background (validated when OTP is verified / on final submission)
  if (form.isBriefRequired) {
    const brief = (form.projectBrief || '').trim();
    if (!brief) {
      errors.projectBrief = 'Please provide an overview and background for your project.';
    } else if (brief.length < 20) {
      errors.projectBrief = `Project brief is too short (${brief.length}/20 min characters). Please provide a brief overview.`;
    } else if (brief.length > 1000) {
      errors.projectBrief = `Project brief cannot exceed 1000 characters (${brief.length}/1000).`;
    }
  }

  return errors;
}


