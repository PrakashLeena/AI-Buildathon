import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Turnstile from './Turnstile';

export default function ProjectSubmissionForm({ 
  registrationId, 
  participantEmail, 
  participantName, 
  teamName,
  hasExistingSubmission,
  submissionSessionToken,
  otp: initialOtp,
  otpToken: initialOtpToken,
  onReset 
}) {
  const DRAFT_KEY = `ai_buildathon_draft_${registrationId || 'default'}`;

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
    ai_usage_statement: '',
    whatsapp_number: ''
  });

  const [draftStatus, setDraftStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Overwrite & OTP states
  const [otp, setOtp] = useState(initialOtp || '');
  const [otpToken, setOtpToken] = useState(initialOtpToken || '');
  const [captchaToken, setCaptchaToken] = useState('');
  const [needsFreshOtp, setNeedsFreshOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Nudge for a missing demo video: ask once, then respect whatever they pick.
  const [showVideoNudge, setShowVideoNudge] = useState(false);
  const [videoNudgeAcknowledged, setVideoNudgeAcknowledged] = useState(false);
  const demoVideoRef = useRef(null);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const hasContent = Object.values(parsed).some((v) => typeof v === 'string' && v.trim().length > 0);
          if (hasContent) {
            setFormData((prev) => ({ ...prev, ...parsed }));
            setDraftStatus('Restored previous draft from this device');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load draft from localStorage', err);
    }
  }, [DRAFT_KEY]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        setDraftStatus('Draft auto-saved');
      } catch (err) {}
      return next;
    });
  };

  const handleClearDraft = () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to clear your drafted answers?')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {}
      setFormData({
        problem: '',
        solution: '',
        ai_usage: '',
        technical_brief: '',
        impact: '',
        roadmap: '',
        demo_video: '',
        source_repo: '',
        hosted_prototype: '',
        ai_usage_statement: '',
        whatsapp_number: ''
      });
      setDraftStatus('Draft cleared');
      setTimeout(() => setDraftStatus(''), 2500);
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.demo_video.trim() && !videoNudgeAcknowledged) {
      setShowVideoNudge(true);
      return;
    }

    doSubmit();
  };

  const doSubmit = async () => {
    setError('');

    // If no session token and no OTP, request code
    if (!submissionSessionToken && (!otp || !otpToken)) {
      setNeedsFreshOtp(true);
      setError('Please verify with a security code before submitting.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        registrationId,
        participantEmail,
        isOverwrite: hasExistingSubmission,
        submissionSessionToken,
        otp: otp ? otp.trim() : undefined,
        otpToken: otpToken || undefined,
        ...formData
      };

      const res = await fetch('/api/project-submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.otpError) {
          setNeedsFreshOtp(true);
        }
        throw new Error(data.error || 'Failed to submit project.');
      }

      // Submission successful - clean up draft
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {}

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
    color: 'var(--text-primary)',
    fontSize: '16px' // Prevents iOS Safari auto-zoom on mobile inputs
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
          Submitted!
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Thanks, <strong>{participantName}</strong> — <strong>{teamName || 'your team'}</strong>'s submission has been saved.
        </p>
        <div style={{ display: 'inline-flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/"
            className="submission-submit-btn"
            style={{ textDecoration: 'none', maxWidth: '240px' }}
          >
            Back to Home
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
        <div className="team-card-header" style={{ borderBottom: '1px dashed rgba(255, 85, 0, 0.2)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '200px' }}>
            <div className="team-badge-icon" style={{ flexShrink: 0 }}>
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <span className="team-eyebrow">TEAM VERIFIED</span>
              <h3 className="team-name-title" style={{ color: 'var(--text-primary)', fontSize: '1.35rem', margin: 0, wordBreak: 'break-word' }}>
                {teamName || 'AI Buildathon Team'}
              </h3>
            </div>
          </div>
          {onReset && (
            <button type="button" className="btn-text-edit" onClick={onReset} style={{ marginLeft: 'auto' }}>
              Switch Team
            </button>
          )}
        </div>
        <div className="team-details-grid">
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Participant</span>
            <span className="detail-value" style={{ color: 'var(--text-primary)' }}>{participantName || 'Participant'}</span>
          </div>
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Email</span>
            <span className="detail-value" style={{ color: 'var(--text-primary)' }}>{participantEmail}</span>
          </div>
          <div className="team-detail-item" style={{ background: '#f8fafc', borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <span className="detail-label" style={{ color: 'var(--text-muted)' }}>Status</span>
            <span
              className="detail-value"
              style={{ color: hasExistingSubmission ? '#d97706' : '#059669' }}
            >
              {hasExistingSubmission ? 'Already Submitted' : 'Ready to Submit'}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-save Draft Status Bar */}
      {draftStatus && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#065f46'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>
              cloud_done
            </span>
            <span style={{ fontWeight: 600 }}>{draftStatus}</span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'underline',
              padding: '0.2rem 0'
            }}
          >
            Clear Draft
          </button>
        </div>
      )}

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
            <strong style={{ color: '#92400e' }}>You've already submitted</strong>
            <p style={{ margin: 0, marginTop: '0.2rem', color: '#b45309' }}>
              Saving again will replace your previous answers.
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
              <h4 style={{ color: 'var(--text-primary)' }}>Project Brief</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Tell us about the problem, your solution, and what's next.</p>
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
                  placeholder="What problem does your project solve?"
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
                  placeholder="How does your solution solve it?"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                AI Features in Your Product <span className="req-star">*</span>
              </label>
              <p className="submission-field-desc">What does AI actually do for your users? (e.g. an LLM answers questions, a model detects fraud, computer vision reads a document)</p>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="ai_usage"
                  rows={3}
                  value={formData.ai_usage}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="e.g. Our app uses an LLM to auto-generate meeting summaries from uploaded audio"
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
                  placeholder="Stack, architecture, and tools you used"
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
                  placeholder="What impact does this have?"
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
                  placeholder="What's next for this project?"
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
              <h4 style={{ color: 'var(--text-primary)' }}>Links & Statement</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Share the links judges need to review your work.</p>
            </div>
          </div>

          <div className="submission-fields-grid">
            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Demo Video
              </label>
              <p className="submission-field-desc">Unlisted YouTube link, 3 minutes max.</p>
              <div className="submission-input-wrapper">
                <span className="material-symbols-outlined input-icon">smart_display</span>
                <input
                  ref={demoVideoRef}
                  type="url"
                  name="demo_video"
                  value={formData.demo_video}
                  onChange={handleInputChange}
                  className="submission-input"
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Source Repository <span className="req-star">*</span>
              </label>
              <p className="submission-field-desc">Public GitHub or GitLab repo with your code and setup steps.</p>
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
                  placeholder="https://github.com/your-team/project"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Hosted Prototype <span className="req-star">*</span>
              </label>
              <p className="submission-field-desc">Live link judges can open and try.</p>
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
                  placeholder="https://your-project.vercel.app"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                WhatsApp Number <span className="req-star">*</span>
              </label>
              <p className="submission-field-desc">So we can reach you about judging logistics or results.</p>
              <div className="submission-input-wrapper">
                <span className="material-symbols-outlined input-icon">chat</span>
                <input
                  required
                  type="tel"
                  name="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={handleInputChange}
                  className="submission-input"
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  placeholder="+94 71 234 5678"
                />
              </div>
            </div>

            <div className="submission-field full-width">
              <label className="submission-field-label" style={{ color: 'var(--text-primary)' }}>
                Qoder Usage Statement <span className="req-star">*</span>
              </label>
              <p className="submission-field-desc">Describe how Qoder helped you build this project, start to finish — and how was the experience using it?</p>
              <div className="submission-textarea-wrapper">
                <textarea
                  required
                  name="ai_usage_statement"
                  rows={3}
                  value={formData.ai_usage_statement}
                  onChange={handleInputChange}
                  className="submission-textarea"
                  style={inputStyle}
                  placeholder="e.g. Used Qoder to scaffold the project, build the frontend and backend, and debug deployment issues. It was fast for boilerplate, occasionally needed re-prompting for edge cases."
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
                <h4 style={{ color: 'var(--text-primary)' }}>Session Expired</h4>
                <p style={{ color: 'var(--text-secondary)' }}>Verify your email again to finish submitting.</p>
              </div>
            </div>

            <div className="otp-trigger-banner" style={{ background: 'rgba(255, 85, 0, 0.06)', borderColor: 'rgba(255, 85, 0, 0.2)' }}>
              {!otpSent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Turnstile onVerify={(token) => setCaptchaToken(token)} />
                  <button type="button" onClick={handleSendFreshOtp} disabled={loading || !captchaToken} className="btn-send-otp">
                    <span className="material-symbols-outlined">send</span>
                    {loading ? 'Sending...' : 'Send New Code'}
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
              <>Submitting...</>
            ) : hasExistingSubmission ? (
              <>
                Update Submission
                <span className="material-symbols-outlined">published_with_changes</span>
              </>
            ) : (
              <>
                Submit Project
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>

      {showVideoNudge && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(3, 7, 18, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.12), rgba(255, 136, 0, 0.08))',
                border: '1.5px solid rgba(255, 85, 0, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-orange)',
                marginBottom: '1rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>smart_display</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
              Skip the demo video?
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              A short walkthrough helps the evaluation panel understand your idea faster, and teams with a demo video tend to make a stronger impression on judges. You can still submit now and add one anytime before the deadline. Just come back and update your submission.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                type="button"
                className="submission-submit-btn"
                style={{ width: '100%', maxWidth: '100%' }}
                onClick={() => {
                  setShowVideoNudge(false);
                  demoVideoRef.current?.focus();
                }}
              >
                Add a Video
              </button>
              <button
                type="button"
                className="btn-text-edit"
                style={{ padding: '0.5rem' }}
                onClick={() => {
                  setVideoNudgeAcknowledged(true);
                  setShowVideoNudge(false);
                  doSubmit();
                }}
              >
                Submit Without Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
