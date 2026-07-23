import React, { useMemo, useState } from 'react';
import { usePortalModal } from '../context/PortalModalContext.jsx';
import { faculties, facultyDeptData } from '../data/facultyDepartments.js';
import { registerTeam } from '../lib/api.js';

const initialFormState = {
  fullName: '',
  email: '',
  studentId: '',
  faculty: '',
  department: '',
  yearOfStudy: '1st Year',
  teamName: ''
};

export default function RegisterModal() {
  const { isOpen, closeModal } = usePortalModal();
  const [form, setForm] = useState(initialFormState);
  const [teamSize, setTeamSize] = useState(1);
  const [members, setMembers] = useState([]); // extra members beyond the lead
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const departmentOptions = useMemo(() => facultyDeptData[form.faculty] || [], [form.faculty]);

  const resetAll = () => {
    setForm(initialFormState);
    setTeamSize(1);
    setMembers([]);
    setErrorMsg('');
    setSuccess(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    closeModal();
    resetAll();
  };

  const handleFieldChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'faculty') next.department = '';
      return next;
    });
  };

  const handleTeamSizeChange = (size) => {
    setTeamSize(size);
    setMembers((prev) => {
      const needed = size - 1;
      const next = prev.slice(0, needed);
      while (next.length < needed) next.push({ name: '', student_id: '' });
      return next;
    });
  };

  const handleMemberChange = (index, field) => (e) => {
    const value = e.target.value;
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      await registerTeam({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        student_id: form.studentId.trim(),
        faculty: form.faculty,
        department: form.department,
        year_of_study: form.yearOfStudy,
        team_name: form.teamName.trim(),
        team_size: teamSize,
        members,
        tools_interested: []
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 3500);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`portal-modal${isOpen ? ' active' : ''}`} id="portalModal" onClick={(e) => {
      if (e.target.id === 'portalModal') handleClose();
    }}>
      <div className="portal-card">
        <button className="close-portal-btn" id="closePortalBtn" aria-label="Close modal" onClick={handleClose}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M13.5 4.5l-9 9m0-9l9 9" />
          </svg>
        </button>

        <div className="portal-pane active" id="paneRegister">
          <div className={`success-overlay${success ? ' active' : ''}`} id="registerSuccessOverlay">
            <div className="checkmark-circle">
              <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="portal-title" style={{ color: '#10b981' }}>Roster Registered!</h3>
            <p className="portal-sub" style={{ marginBottom: '0.5rem' }}>
              Congratulations, team{' '}
              <strong id="successTeamName" style={{ color: 'var(--primary-orange)' }}>{form.teamName}</strong>!
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your team profile has been successfully registered. Check your inbox for confirmation details.
            </p>
          </div>

          <div id="registerFormContent" style={{ display: success ? 'none' : 'block' }}>
            <h3 className="portal-title">Join the AI Sprint</h3>
            <p className="portal-sub">Build your team and kick off your journey</p>

            <div className="form-message error" id="registerMsg" style={{ display: errorMsg ? 'block' : 'none' }}>
              {errorMsg}
            </div>

            <form id="registerForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="regName">Full Name (Lead Builder)</label>
                <input
                  type="text"
                  id="regName"
                  className="form-input"
                  placeholder="Enter your full name"
                  required
                  value={form.fullName}
                  onChange={handleFieldChange('fullName')}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regEmail">Email Address</label>
                <input
                  type="email"
                  id="regEmail"
                  className="form-input"
                  placeholder="Enter your email address"
                  required
                  value={form.email}
                  onChange={handleFieldChange('email')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regStudentId">Student ID / Reg No</label>
                  <input
                    type="text"
                    id="regStudentId"
                    className="form-input"
                    placeholder="Enter your Student ID / Reg No"
                    required
                    value={form.studentId}
                    onChange={handleFieldChange('studentId')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regFaculty">Faculty</label>
                  <select
                    id="regFaculty"
                    className="form-input"
                    required
                    value={form.faculty}
                    onChange={handleFieldChange('faculty')}
                  >
                    <option value="" disabled>Select Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regDept">Department</label>
                  <select
                    id="regDept"
                    className="form-input"
                    required
                    disabled={!form.faculty}
                    value={form.department}
                    onChange={handleFieldChange('department')}
                  >
                    <option value="" disabled>{form.faculty ? 'Select Department' : 'Select Faculty First'}</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regYear">Year of Study</label>
                  <select
                    id="regYear"
                    className="form-input"
                    required
                    value={form.yearOfStudy}
                    onChange={handleFieldChange('yearOfStudy')}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="regTeamName">Team Name</label>
                  <input
                    type="text"
                    id="regTeamName"
                    className="form-input"
                    placeholder="Enter your team name"
                    required
                    value={form.teamName}
                    onChange={handleFieldChange('teamName')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Team Size</label>
                  <div className="segmented-control">
                    {[1, 2, 3].map((size) => (
                      <button
                        type="button"
                        key={size}
                        className={`segment-btn${teamSize === size ? ' active' : ''}`}
                        data-size={size}
                        onClick={() => handleTeamSizeChange(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div id="memberFieldsContainer">
                {members.length > 0 && (
                  <label className="form-label" style={{ marginTop: '1rem' }}>Team Member Information</label>
                )}
                {members.map((member, index) => (
                  <div className="form-row" key={index}>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-input member-name"
                        placeholder={`Member ${index + 2} Full Name`}
                        required
                        value={member.name}
                        onChange={handleMemberChange(index, 'name')}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-input member-sid"
                        placeholder={`Member ${index + 2} Student ID`}
                        required
                        value={member.student_id}
                        onChange={handleMemberChange(index, 'student_id')}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '2rem' }} disabled={submitting}>
                <span id="registerBtnText">{submitting ? 'Registering Team...' : 'Register Team'}</span>
                <div className="loading-spinner" id="registerSpinner" style={{ display: submitting ? 'inline-block' : 'none' }}></div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
