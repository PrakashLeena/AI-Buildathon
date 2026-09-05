import React, { useState } from 'react';
import Link from 'next/link';
import Turnstile from './Turnstile';

export default function ProjectSubmissionForm({ 
  registrationId, 
  participantEmail, 
  participantName, 
  teamName,
  hasExistingSubmission,
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
  const [isOverwriteFlow, setIsOverwriteFlow] = useState(hasExistingSubmission);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (hasExistingSubmission && !otpSent) {
      setError('Please click "Send Verification Code" and enter your OTP to overwrite your previous submission.');
      return;
    }

    if (hasExistingSubmission && otpSent && (!otp || otp.trim().length !== 6)) {
      setError('Please enter the 6-digit verification code sent to your email.');
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
        if (res.status === 409) {
          setIsOverwriteFlow(true);
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

  if (success) {
    return (
      <div className="submission-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
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
            marginBottom: '1.5rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
            check_circle
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Submission Received!
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
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
      <div className="detected-team-card">
        <div className="team-card-header">
          <div className="team-badge-icon">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div style={{ flex: 1 }}>
            <span className="team-eyebrow">VERIFIED TEAM CREDENTIALS</span>
            <h3 className="team-name-title">{teamName || 'AI Buildathon Team'}</h3>
          </div>
          {onReset && (
            <button type="button" className="btn-text-edit" onClick={onReset}>
              Switch Email
            </button>
          )}
        </div>
        <div className="team-details-grid">
          <div className="team-detail-item">
            <span className="detail-label">Participant Name</span>
            <span className="detail-value">{participantName || 'Participant'}</span>
          </div>
          <div className="team-detail-item">
            <span className="detail-label">Verified Email</span>
            <span className="detail-value">{participantEmail}</span>
          </div>
          <div className="team-detail-item">
            <span className="detail-label">Submission Status</span>
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
        <div className="submission-overwrite-notice">
          <span className="material-symbols-outlined notice-icon">info</span>
          <div>
            <strong>Existing Submission Detected</strong>
            <p style={{ margin: 0, marginTop: '0.2rem' }}>
              Your team already submitted deliverables. Filling out and submitting this form will overwrite your previous submission after verifying via email code.
            </p>
          </div>
        </div>
      )}

      {/* Main Submission Form Card */}
      <form onSubmit={handleSubmit} className="submission-card">
        {error && (
          <div className="submission-alert submission-alert-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Project Brief */}
        <div className="submission-step-block">
          <div className="submission-step-header">
            <div className="submission-step-num">1</div>
            <div className="submission-step-info">
              <h4>Section 1: Project Brief</h4>
              <p>Describe the core problem, solution, AI integration, and project roadmap.</p>
            </div>
          </div>

          <div className="submission-fields-grid">
            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Describe the core problem your project addresses..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Explain how your working solution solves the problem..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Describe how AI was utilized in the general scope of this project..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Detail your technical architecture, frameworks, and tools used..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="What is the measurable or expected impact of this solution?..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Outline future plans, milestones, and next steps..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Links & Statements */}
        <div className="submission-step-block">
          <div className="submission-step-header">
            <div className="submission-step-num">2</div>
            <div className="submission-step-info">
              <h4>Section 2: Deliverables & Statements</h4>
              <p>Provide verified URLs for your demo video, repository, and prototype.</p>
            </div>
          </div>

          <div className="submission-fields-grid">
            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter unlisted YouTube video URL (Max 3 mins showcasing a walkthrough)"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter public GitHub or GitLab URL containing source code, README, and setup instructions"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter live URL for judges to try and evaluate your solution"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label">
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
                  placeholder="Briefly describe how Qoder was specifically used during the development of your solution"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Overwrite Authorization (Only shown if team already has submission) */}
        {hasExistingSubmission && (
          <div className="submission-step-block">
            <div className="submission-step-header">
              <div className="submission-step-num" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                3
              </div>
              <div className="submission-step-info">
                <h4>Overwrite Verification Code</h4>
                <p>Confirm authorization by requesting an OTP code to your registered email address.</p>
              </div>
            </div>

            <div className="otp-trigger-banner" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="otp-banner-text">
                  <span className="material-symbols-outlined banner-icon">lock_reset</span>
                  <div>
                    <strong>Verification Required to Overwrite</strong>
                    <p>
                      A 6-digit OTP will be sent to <span className="highlight-email">{participantEmail}</span>.
                    </p>
                  </div>
                </div>

                {!otpSent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                    <Turnstile onVerify={(token) => setCaptchaToken(token)} />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || !captchaToken}
                      className="btn-send-otp"
                    >
                      <span className="material-symbols-outlined">send</span>
                      {loading ? 'Sending Code...' : 'Send Verification Code'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '1.2rem' }}>check_circle</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>Code sent! Check your inbox.</span>
                  </div>
                )}
              </div>

              {otpSent && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed rgba(255, 85, 0, 0.2)' }}>
                  <label className="submission-field-label">
                    Enter 6-Digit Verification Code <span className="req-star">*</span>
                  </label>
                  <div className="submission-input-wrapper" style={{ maxWidth: '240px' }}>
                    <span className="material-symbols-outlined input-icon">key</span>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="submission-input otp-code-input"
                      style={{ paddingLeft: '2.75rem', letterSpacing: '4px' }}
                      placeholder="••••••"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="submission-footer-actions">
          <button
            type="submit"
            disabled={loading || (hasExistingSubmission && (!otpSent || otp.length !== 6))}
            className="submission-submit-btn"
          >
            {loading ? (
              <>Processing Submission...</>
            ) : hasExistingSubmission ? (
              <>
                Verify & Overwrite Submission
                <span className="material-symbols-outlined">published_with_changes</span>
              </>
            ) : (
              <>
                Submit Final Project
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <div className="submission-guarantee">
            <span className="material-symbols-outlined">verified</span>
            <span>All deliverables will be securely timestamped and provided to the evaluation panel.</span>
          </div>
        </div>
      </form>
    </div>
  );
}
