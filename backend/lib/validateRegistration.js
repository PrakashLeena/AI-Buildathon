const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// Sane upper bounds for free-text fields. These are generous for legitimate
// use but stop a malicious/scripted client (bypassing the frontend's own
// dropdowns/inputs and POSTing directly) from stuffing huge strings into the
// database - a cheap storage/DoS abuse vector and a data-integrity risk for
// the admin dashboard/export.
const MAX_LEN = {
  full_name: 150,
  email: 254, // RFC 5321 max mailbox length
  student_id: 50,
  faculty: 150,
  department: 150,
  team_name: 100,
  member_name: 150,
  member_student_id: 50,
  tool: 50
};
const MAX_TOOLS = 10;

function isNonEmptyString(value, maxLen) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;
}

/**
 * Validates a team registration payload sent from the frontend.
 * Returns { valid: true, data } or { valid: false, error }.
 */
export function validateRegistration(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body.' };
  }

  const {
    full_name,
    email,
    student_id,
    faculty,
    department,
    year_of_study,
    team_name,
    team_size,
    members,
    tools_interested
  } = body;

  if (!isNonEmptyString(full_name, MAX_LEN.full_name)) {
    return { valid: false, error: 'Full name is required.' };
  }
  if (
    !email ||
    typeof email !== 'string' ||
    email.trim().length > MAX_LEN.email ||
    !EMAIL_RE.test(email.trim())
  ) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  if (!isNonEmptyString(student_id, MAX_LEN.student_id)) {
    return { valid: false, error: 'Student ID / Reg No is required.' };
  }
  if (!isNonEmptyString(faculty, MAX_LEN.faculty)) {
    return { valid: false, error: 'Faculty is required.' };
  }
  if (!isNonEmptyString(department, MAX_LEN.department)) {
    return { valid: false, error: 'Department is required.' };
  }
  if (!VALID_YEARS.includes(year_of_study)) {
    return { valid: false, error: 'A valid year of study is required.' };
  }
  if (!isNonEmptyString(team_name, MAX_LEN.team_name)) {
    return { valid: false, error: 'Team name is required.' };
  }

  const size = Number(team_size);
  if (!Number.isInteger(size) || size < 1 || size > 3) {
    return { valid: false, error: 'Team size must be between 1 and 3.' };
  }

  const memberList = Array.isArray(members) ? members : [];
  if (memberList.length !== size - 1) {
    return { valid: false, error: 'Team member details do not match the selected team size.' };
  }
  for (const member of memberList) {
    if (
      !member ||
      !isNonEmptyString(member.name, MAX_LEN.member_name) ||
      !isNonEmptyString(member.student_id, MAX_LEN.member_student_id)
    ) {
      return { valid: false, error: 'Every team member needs a full name and student ID.' };
    }
  }

  // tools_interested is optional and currently unused by the form (always
  // sent as []), but since it's client-supplied, don't trust its shape or
  // size blindly - keep only well-formed, reasonably-sized string entries.
  const toolsList = Array.isArray(tools_interested)
    ? tools_interested
        .filter((t) => typeof t === 'string' && t.trim().length > 0 && t.trim().length <= MAX_LEN.tool)
        .slice(0, MAX_TOOLS)
        .map((t) => t.trim())
    : [];

  return {
    valid: true,
    data: {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      student_id: student_id.trim(),
      faculty: faculty.trim(),
      department: department.trim(),
      year_of_study,
      team_name: team_name.trim(),
      team_size: size,
      members: memberList.map((m) => ({ name: m.name.trim(), student_id: m.student_id.trim() })),
      tools_interested: toolsList
    }
  };
}
