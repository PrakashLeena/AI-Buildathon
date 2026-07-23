const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

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

  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return { valid: false, error: 'Full name is required.' };
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  if (!student_id || typeof student_id !== 'string' || !student_id.trim()) {
    return { valid: false, error: 'Student ID / Reg No is required.' };
  }
  if (!faculty || typeof faculty !== 'string') {
    return { valid: false, error: 'Faculty is required.' };
  }
  if (!department || typeof department !== 'string') {
    return { valid: false, error: 'Department is required.' };
  }
  if (!VALID_YEARS.includes(year_of_study)) {
    return { valid: false, error: 'A valid year of study is required.' };
  }
  if (!team_name || typeof team_name !== 'string' || !team_name.trim()) {
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
    if (!member || !member.name || !member.name.trim() || !member.student_id || !member.student_id.trim()) {
      return { valid: false, error: 'Every team member needs a full name and student ID.' };
    }
  }

  return {
    valid: true,
    data: {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      student_id: student_id.trim(),
      faculty,
      department,
      year_of_study,
      team_name: team_name.trim(),
      team_size: size,
      members: memberList.map((m) => ({ name: m.name.trim(), student_id: m.student_id.trim() })),
      tools_interested: Array.isArray(tools_interested) ? tools_interested : []
    }
  };
}
