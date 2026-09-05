import React, { useState } from 'react';
import Link from 'next/link';
import Turnstile from './Turnstile';

export default function ProjectSubmissionForm({ 
  registrationId, 
  participantEmail, 
  participantName, 
  teamName,
  hasExistingSubmission,
  otp: initialOtp,
  otpToken: initialOtpToken,
  onReset 
}) {
  const [formData, setFormData] = useState({
    problem: '',
    solution: '',
    ai_usage: '',
    technical_brief: '',
    impact: '',
    roadmap: '',
    demo_video: '',
    source_repo: '',
    hosted_prototype: '',
    ai_usage_statement: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Overwrite & OTP states
  const [otp, setOtp] = useState(initialOtp || '');
  const [otpToken, setOtpToken] = useState(initialOtpToken || '');
  const [captchaToken, setCaptchaToken] = useState('');
  const [needsFreshOtp, setNeedsFreshOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendFreshOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail,
          captchaToken,
          mode: 'project_submission'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      setOtpToken(data.otpToken);
      setOtpSent(true);
      setNeedsFreshOtp(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (hasExistingSubmission && (!otp || !otpToken)) {
      setNeedsFreshOtp(true);
      setError('Please verify with a security code before updating existing deliverables.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        registrationId,
        participantEmail,
        isOverwrite: hasExistingSubmission,
        otp: hasExistingSubmission ? otp.trim() : undefined,
        otpToken: hasExistingSubmission ? otpToken : undefined,
        ...formData
      };

      const res = await fetch('/api/project-submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.toLowerCase().includes('otp')) {
          setNeedsFreshOtp(true);
        }
        throw new Error(data.error || 'Failed to submit project.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.12)',
    color: 'var(--text-primary)'
  };

  if (success) {
    return (
      <div
        className="submission-card"
        style={{
          textAlign: 'center',
          padding: '3.5rem 2rem',
          background: '#ffffff',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.08)',
          borderRadius: '20px',
          color: 'var(--text-primary)'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#ecfdf5',
            border: '2px solid #10b981',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
            check_circle
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Submission Received!
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Thank you, <strong>{participantName}</strong>. Your final project deliverables for <strong>{teamName || 'your team'}</strong> have been saved successfully.
        </p>
        <div style={{ display: 'inline-flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/"
            className="submission-submit-btn"
            style={{ textDecoration: 'none', maxWidth: '240px' }}
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Detected Team Header Card */}
      <div
        className="detected-team-card"
        style={{
          background: '#ffffff',
          border: '1.5px solid rgba(255, 85, 0, 0.25)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
          color: 'var(--text-primary)'
        }}
      >
        <div className="team-card-header" style={{ borderBottom: '1px dashed rgba(255, 85, 0, 0.2)' }}>
          <div className="team-badge-icon">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div style={{ flex: 1 }}>
            <span className="team-eyebrow">VERIFIED TEAM CREDENTIALS</span>
            <h3 className="team-name-title" style={{ color: 'var(--text-primary)' }}>{teamName || 'AI Buildathon Team'}</h3>
          </div>
          {onReset && (
            <button type="button" className="btn-text-edit" onClick={onReset}>
              Switch Team
            </button>
          )}
        </div>
        <div className="team-details-grid">
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Participant Name</span>
            <span className="detail-value" style={{ color: 'var(--text-primary)' }}>{participantName || 'Participant'}</span>
          </div>
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Verified Email</span>
            <span className="detail-value" style={{ color: 'var(--text-primary)' }}>{participantEmail}</span>
          </div>
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Submission Status</span>
            <span
              className="detail-value"
              style={{ color: hasExistingSubmission ? '#d97706' : '#059669' }}
            >
              {hasExistingSubmission ? 'Existing Submission on File' : 'Ready for Submission'}
            </span>
          </div>
        </div>
      </div>

      {hasExistingSubmission && (
        <div
          className="submission-overwrite-notice"
          style={{
            background: '#fffbeb',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#92400e'
          }}
        >
          <span className="material-symbols-outlined notice-icon" style={{ color: '#d97706' }}>info</span>
          <div>
            <strong style={{ color: '#92400e' }}>Existing Submission Detected</strong>
            <p style={{ margin: 0, marginTop: '0.2rem', color: '#b45309' }}>
              Your team already has a submission recorded. Submitting this form will update and overwrite your deliverables with the new information below.
            </p>
          </div>
        </div>
      )}

      {/* Main Submission Form Card */}
      <form
        onSubmit={handleSubmit}
        className="submission-card"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.08)',
          borderRadius: '20px',
          color: 'var(--text-primary)'
        }}
      >
        {error && (
          <div className="submission-alert submission-alert-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Project Brief */}
        <div className="submission-step-block" style={{ borderBottomColor: 'rgba(0, 0, 0, 0.06)' }}>
          <div className="submission-step-header">
            <div className="submission-step-num">1</div>
            <div className="submission-step-info">
              <h4 style={{ color: 'var(--text-primary)' }}>Section 1: Project Brief</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Describe the core problem, solution, AI integration, and project roadmap.</p>
            </div>
          </div>

          <div className="submission-fields-grid">
            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Problem <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="problem"
                  rows={4}
                  value={formData.problem}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Describe the core problem your project addresses..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Solution <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="solution"
                  rows={4}
                  value={formData.solution}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Explain how your working solution solves the problem..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                AI usage <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="ai_usage"
                  rows={3}
                  value={formData.ai_usage}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Describe how AI was utilized in the general scope of this project..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Technical Brief <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="technical_brief"
                  rows={4}
                  value={formData.technical_brief}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Detail your technical architecture, frameworks, and tools used..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Impact <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="impact"
                  rows={3}
                  value={formData.impact}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="What is the measurable or expected impact of this solution?..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Roadmap <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="roadmap"
                  rows={3}
                  value={formData.roadmap}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Outline future plans, milestones, and next steps..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Links & Statements */}
        <div className="submission-step-block" style={{ borderBottomColor: 'rgba(0, 0, 0, 0.06)' }}>
          <div className="submission-step-header">
            <div className="submission-step-num">2</div>
            <div className="submission-step-info">
              <h4 style={{ color: 'var(--text-primary)' }}>Section 2: Deliverables & Statements</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Provide verified URLs for your demo video, repository, and prototype.</p>
            </div>
          </div>

          <div className="submission-fields-grid">
            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Demo Video <span className="req-star">*</span>
              </label>
              <div className="submission-input-wrapper">
                <span className="material-symbols-outlined input-icon">smart_display</span>
                <input
                  required
                  type="url"
                  name="demo_video"
                  value={formData.demo_video}
                  onChange={handleInputChange}
                  className="submission-input"
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="Enter unlisted YouTube video URL (Max 3 mins showcasing a walkthrough)"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Source Repository <span className="req-star">*</span>
              </label>
              <div className="submission-input-wrapper">
                <span className="material-symbols-outlined input-icon">code</span>
                <input
                  required
                  type="url"
                  name="source_repo"
                  value={formData.source_repo}
                  onChange={handleInputChange}
                  className="submission-input"
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="Enter public GitHub or GitLab URL containing source code, README, and setup instructions"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Hosted Prototype <span className="req-star">*</span>
              </label>
              <div className="submission-input-wrapper">
                <span className="material-symbols-outlined input-icon">open_in_browser</span>
                <input
                  required
                  type="url"
                  name="hosted_prototype"
                  value={formData.hosted_prototype}
                  onChange={handleInputChange}
                  className="submission-input"
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="Enter live URL for judges to try and evaluate your solution"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                AI Usage Statement <span className="req-star">*</span>
              </label>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="ai_usage_statement"
                  rows={3}
                  value={formData.ai_usage_statement}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="Briefly describe how Qoder was specifically used during the development of your solution"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Re-verify OTP fallback (in case session expired while writing) */}
        {needsFreshOtp && (
          <div className="submission-step-block" style={{ borderBottomColor: 'rgba(0, 0, 0, 0.06)' }}>
            <div className="submission-step-header">
              <div className="submission-step-num" style={{ background: '#f59e0b' }}>3</div>
              <div className="submission-step-info">
                <h4 style={{ color: 'var(--text-primary)' }}>Session Refresh Required</h4>
                <p style={{ color: 'var(--text-secondary)' }}>Your verification token expired while completing the form. Request a fresh code to submit.</p>
              </div>
            </div>

            <div className="otp-trigger-banner" style={{ background: 'rgba(255, 85, 0, 0.06)', borderColor: 'rgba(255, 85, 0, 0.2)' }}>
              {!otpSent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Turnstile onVerify={(token) => setCaptchaToken(token)} />
                  <button type="button" onClick={handleSendFreshOtp} disabled={loading || !captchaToken} className="btn-send-otp">
                    <span className="material-symbols-outlined">send</span>
                    {loading ? 'Sending Code...' : 'Send Fresh Verification Code'}
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>Enter New Code</label>
                  <div className="submission-input-wrapper" style={{ maxWidth: '240px' }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="submission-input otp-code-input"
                      style={{ ...inputStyle, textAlign: 'center', letterSpacing: '4px' }}
                      placeholder="••••••"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="submission-footer-actions" style={{ borderTopColor: 'rgba(0, 0, 0, 0.06)' }}>
          <button
            type="submit"
            disabled={loading}
            className="submission-submit-btn"
          >
            {loading ? (
              <>Processing Deliverables...</>
            ) : hasExistingSubmission ? (
              <>
                Update & Overwrite Submission
                <span className="material-symbols-outlined">published_with_changes</span>
              </>
            ) : (
              <>
                Submit Final Project
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <div className="submission-guarantee" style={{ color: 'var(--text-secondary)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-orange)' }}>verified</span>
            <span>All deliverables will be securely timestamped and provided to the evaluation panel.</span>
          </div>
        </div>
      </form>
    </div>
  );
}
