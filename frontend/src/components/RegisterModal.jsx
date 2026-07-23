import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePortalModal } from '../context/PortalModalContext.jsx';
import { faculties, facultyDeptData } from '../data/facultyDepartments.js';
import { registerTeam } from '../lib/api.js';
import Turnstile from './Turnstile.jsx';
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  saveRegistrationDraft,
  validateRegistrationForm
} from '../lib/registrationValidation.js';

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

  // Restore any in-progress draft (e.g. if the modal was accidentally closed
  // by clicking outside it) exactly once, on first render.
  const draftRef = useRef();
  if (draftRef.current === undefined) {
    draftRef.current = loadRegistrationDraft() || {};
  }

  const [form, setForm] = useState(draftRef.current.form || initialFormState);
  const [teamSize, setTeamSize] = useState(draftRef.current.teamSize || 1);
  const [members, setMembers] = useState(draftRef.current.members || []); // extra members beyond the lead
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef(null);
  // Honeypot anti-spam field: invisible to real users, but simple bots that
  // blindly fill every input on a form often fill this in too. Any
  // non-empty value here makes the backend silently reject the submission.
  const [honeypot, setHoneypot] = useState('');

  const departmentOptions = useMemo(() => facultyDeptData[form.faculty] || [], [form.faculty]);
  const errors = useMemo(() => validateRegistrationForm(form, teamSize, members), [form, teamSize, members]);

  // Auto-save progress as the user types, so an accidental click outside the
  // modal (which just hides it) never erases what they've already entered.
  useEffect(() => {
    saveRegistrationDraft({ form, teamSize, members });
  }, [form, teamSize, members]);

  const resetAll = () => {
    setForm(initialFormState);
    setTeamSize(1);
    setMembers([]);
    setTouched({});
    setErrorMsg('');
    setSuccess(false);
    setSubmitting(false);
    setCaptchaToken('');
    turnstileRef.current?.reset();
    setHoneypot('');
    clearRegistrationDraft();
  };

  // Used by the "x" button and by clicking outside the card. Deliberately
  // does NOT clear entered data - only a successful submit (or closing after
  // one) clears the draft, so accidentally dismissing the modal never loses
  // the user's progress.
  const handleDismiss = () => {
    closeModal();
    if (success) {
      resetAll();
    } else {
      setErrorMsg('');
    }
  };

  const markTouched = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

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

    if (Object.keys(errors).length > 0) {
      // Reveal every validation error at once (not just the ones already
      // touched) so the user immediately sees everything left to fix.
      const allTouched = {};
      Object.keys(errors).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched((t) => ({ ...t, ...allTouched }));
      setErrorMsg('Please fix the highlighted fields before submitting.');
      return;
    }

    if (!captchaToken) {
      setErrorMsg('Please complete the CAPTCHA verification before submitting.');
      return;
    }

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
        tools_interested: [],
        captchaToken,
        company_website: honeypot
      });

      setSuccess(true);
      // The registration is safely stored server-side now - drop the local
      // draft immediately so it can't be confused with a fresh attempt.
      clearRegistrationDraft();
      setTimeout(() => {
        closeModal();
        resetAll();
      }, 3500);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during registration.');
      // Turnstile tokens are single-use - whether the failure was the
      // CAPTCHA itself or something else (e.g. duplicate email), the spent
      // token can no longer be redeemed, so force a fresh challenge.
      setCaptchaToken('');
      turnstileRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key) => (touched[key] && errors[key] ? errors[key] : '');
  const inputClass = (key) => `form-input${fieldError(key) ? ' input-invalid' : ''}`;

  return (
    <div
      className={`portal-modal${isOpen ? ' active' : ''}`}
      id="portalModal"
      onClick={(e) => {
        if (e.target.id === 'portalModal') handleDismiss();
      }}
    >
      {/* data-lenis-prevent stops the Lenis smooth-scroll library from
          hijacking wheel/touch events over this card, so scrolling inside
          the modal scrolls the modal - not the page behind it. */}
      <div className="portal-card" data-lenis-prevent>
        <button className="close-portal-btn" id="closePortalBtn" aria-label="Close modal" onClick={handleDismiss}>
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

            <form id="registerForm" onSubmit={handleSubmit} noValidate>
              {/* Honeypot: visually hidden from real users (off-screen, not
                  display:none - some bots skip display:none fields) and
                  excluded from tab order / screen readers. Left blank by
                  humans; often auto-filled by simple bots. */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="regCompanyWebsite">Website</label>
                <input
                  type="text"
                  id="regCompanyWebsite"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regName">Full Name (Lead Builder)</label>
                <input
                  type="text"
                  id="regName"
                  className={inputClass('fullName')}
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={handleFieldChange('fullName')}
                  onBlur={markTouched('fullName')}
                />
                {fieldError('fullName') && <span className="field-error">{fieldError('fullName')}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regEmail">Email Address</label>
                <input
                  type="email"
                  id="regEmail"
                  className={inputClass('email')}
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={handleFieldChange('email')}
                  onBlur={markTouched('email')}
                />
                {fieldError('email') && <span className="field-error">{fieldError('email')}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regStudentId">Student ID / Reg No</label>
                  <input
                    type="text"
                    id="regStudentId"
                    className={inputClass('studentId')}
                    placeholder="Enter your Student ID / Reg No"
                    value={form.studentId}
                    onChange={handleFieldChange('studentId')}
                    onBlur={markTouched('studentId')}
                  />
                  {fieldError('studentId') && <span className="field-error">{fieldError('studentId')}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regFaculty">Faculty</label>
                  <select
                    id="regFaculty"
                    className={inputClass('faculty')}
                    value={form.faculty}
                    onChange={handleFieldChange('faculty')}
                    onBlur={markTouched('faculty')}
                  >
                    <option value="" disabled>Select Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                  {fieldError('faculty') && <span className="field-error">{fieldError('faculty')}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regDept">Department</label>
                  <select
                    id="regDept"
                    className={inputClass('department')}
                    disabled={!form.faculty}
                    value={form.department}
                    onChange={handleFieldChange('department')}
                    onBlur={markTouched('department')}
                  >
                    <option value="" disabled>{form.faculty ? 'Select Department' : 'Select Faculty First'}</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {fieldError('department') && <span className="field-error">{fieldError('department')}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regYear">Year of Study</label>
                  <select
                    id="regYear"
                    className="form-input"
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
                    className={inputClass('teamName')}
                    placeholder="Enter your team name"
                    value={form.teamName}
                    onChange={handleFieldChange('teamName')}
                    onBlur={markTouched('teamName')}
                  />
                  {fieldError('teamName') && <span className="field-error">{fieldError('teamName')}</span>}
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
                        className={inputClass(`member-${index}-name`)}
                        placeholder={`Member ${index + 2} Full Name`}
                        value={member.name}
                        onChange={handleMemberChange(index, 'name')}
                        onBlur={markTouched(`member-${index}-name`)}
                      />
                      {fieldError(`member-${index}-name`) && (
                        <span className="field-error">{fieldError(`member-${index}-name`)}</span>
                      )}
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        className={inputClass(`member-${index}-student_id`)}
                        placeholder={`Member ${index + 2} Student ID`}
                        value={member.student_id}
                        onChange={handleMemberChange(index, 'student_id')}
                        onBlur={markTouched(`member-${index}-student_id`)}
                      />
                      {fieldError(`member-${index}-student_id`) && (
                        <span className="field-error">{fieldError(`member-${index}-student_id`)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                {isOpen && (
                  <Turnstile
                    ref={turnstileRef}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken('')}
                  />
                )}
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
