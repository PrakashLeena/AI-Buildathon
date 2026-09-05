import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Turnstile from '../components/Turnstile';
import ProjectSubmissionForm from '../components/ProjectSubmissionForm';

export default function SubmitProjectPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifiedData, setVerifiedData] = useState(null);
  const turnstileRef = useRef(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Step 1: Send OTP to registered email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          captchaToken,
          mode: 'project_submission'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setOtpToken(data.otpToken);
      setStep('otp');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and fetch team registration data
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/project-submissions/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          otpToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      setVerifiedData({
        registrationId: data.registrationId,
        participantName: data.participantName,
        participantEmail: email.trim().toLowerCase(),
        teamName: data.teamName,
        hasExistingSubmission: data.hasExistingSubmission,
        otp: data.otp,
        otpToken: data.otpToken
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVerifiedData(null);
    setStep('email');
    setOtp('');
    setOtpToken('');
    setError('');
    turnstileRef.current?.reset();
  };

  return (
    <>
      <Head>
        <title>Final Project Submission Portal | AI Buildathon</title>
        <meta
          name="description"
          content="Official Final Project Submission Portal for the AI Buildathon. Submit your demo video, source code repository, and live prototype."
        />
      </Head>

      {/* Whole-page vibrant orange cyber background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -3,
          backgroundColor: '#030712',
          backgroundImage: `
            radial-gradient(circle at 50% 12%, rgba(255, 85, 0, 0.45) 0%, transparent 60%),
            radial-gradient(circle at 10% 45%, rgba(255, 120, 0, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 90% 70%, rgba(255, 85, 0, 0.35) 0%, transparent 55%),
            radial-gradient(circle at 50% 95%, rgba(255, 85, 0, 0.4) 0%, transparent 60%),
            url('/assets/hero-bg.png')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="grid-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -2,
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      <Header />

      <main style={{ paddingTop: '8.5rem', minHeight: '100vh', paddingBottom: '5rem', position: 'relative', zIndex: 1 }}>
        <section className="submission-section" style={{ background: 'transparent', borderTop: 'none', padding: '0 var(--site-gutter)' }}>
          <div className="submission-container">
            <div className="submission-header">
              <div className="submission-badge" style={{ background: 'rgba(255, 85, 0, 0.15)', borderColor: 'rgba(255, 85, 0, 0.4)', color: '#ff6600' }}>
                <span className="submission-badge-dot"></span>
                <span>FINAL PROJECT SUBMISSION</span>
              </div>
              <h1 className="submission-title" style={{ color: '#ffffff', textShadow: '0 0 35px rgba(255, 85, 0, 0.35)' }}>
                Final Project Submission Portal
              </h1>
              <p className="submission-subtitle" style={{ color: '#e2e8f0' }}>
                Welcome to the final submission phase. Verify your registered team email with an OTP code to access the deliverables submission form.
              </p>
            </div>

            {!verifiedData ? (
              <div
                className="submission-card"
                style={{
                  maxWidth: '580px',
                  margin: '0 auto',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255, 85, 0, 0.35)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 85, 0, 0.15)',
                  color: '#ffffff'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.2), rgba(255, 136, 0, 0.1))',
                      border: '1.5px solid rgba(255, 85, 0, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-orange)',
                      marginBottom: '1rem',
                      boxShadow: '0 0 20px rgba(255, 85, 0, 0.3)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                      {step === 'email' ? 'verified_user' : 'mark_email_read'}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.4rem' }}>
                    Verify Team Registration
                  </h2>
                  <p style={{ fontSize: '0.92rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                    {step === 'email'
                      ? 'Enter your registered team email to receive a 6-digit verification code.'
                      : `A 6-digit code has been sent to ${email}. Enter it below to unlock the portal.`}
                  </p>
                </div>

                {error && (
                  <div className="submission-alert submission-alert-error" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
                    <span className="material-symbols-outlined">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {step === 'email' ? (
                  <form onSubmit={handleSendOtp}>
                    <div className="submission-field full-width" style={{ marginBottom: '1.5rem' }}>
                      <label htmlFor="email" className="submission-field-label" style={{ color: '#ffffff' }}>
                        Registered Email Address <span className="req-star">*</span>
                      </label>
                      <div className="submission-input-wrapper">
                        <span className="material-symbols-outlined input-icon" style={{ color: '#ff7700' }}>mail</span>
                        <input
                          type="email"
                          id="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="submission-input"
                          placeholder="e.g. yourname@stu.kln.ac.lk"
                          style={{
                            paddingLeft: '2.75rem',
                            background: 'rgba(3, 7, 18, 0.75)',
                            borderColor: 'rgba(255, 85, 0, 0.3)',
                            color: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                      <Turnstile ref={turnstileRef} onVerify={(token) => setCaptchaToken(token)} />
                    </div>

                    <div className="submission-footer-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                      <button
                        type="submit"
                        disabled={loading || !email.trim() || !captchaToken}
                        className="submission-submit-btn"
                        style={{ width: '100%', maxWidth: '100%' }}
                      >
                        {loading ? (
                          <>Sending Code...</>
                        ) : (
                          <>
                            Send Verification Code
                            <span className="material-symbols-outlined">send</span>
                          </>
                        )}
                      </button>

                      <div className="submission-guarantee" style={{ color: '#cbd5e1' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary-orange)' }}>lock</span>
                        <span>Access is restricted to pre-registered participant emails.</span>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div style={{ background: 'rgba(255, 85, 0, 0.08)', border: '1px solid rgba(255, 85, 0, 0.25)', borderRadius: '10px', padding: '0.85rem 1.15rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary-orange)' }}>mail</span>
                        <span style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setError('');
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-orange)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        Change
                      </button>
                    </div>

                    <div className="submission-field full-width" style={{ marginBottom: '1.75rem' }}>
                      <label htmlFor="otp" className="submission-field-label" style={{ color: '#ffffff' }}>
                        Enter 6-Digit Verification Code <span className="req-star">*</span>
                      </label>
                      <div className="submission-input-wrapper">
                        <span className="material-symbols-outlined input-icon" style={{ color: '#ff7700' }}>key</span>
                        <input
                          type="text"
                          id="otp"
                          required
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="submission-input otp-code-input"
                          placeholder="••••••"
                          style={{
                            paddingLeft: '2.75rem',
                            letterSpacing: '6px',
                            textAlign: 'center',
                            fontSize: '1.3rem',
                            fontWeight: '800',
                            background: 'rgba(3, 7, 18, 0.75)',
                            borderColor: 'rgba(255, 85, 0, 0.3)',
                            color: '#ffffff'
                          }}
                          autoFocus
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        {resendCooldown > 0 ? (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            Resend code in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={loading}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary-orange)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'underline' }}
                          >
                            Resend verification code
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="submission-footer-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                      <button
                        type="submit"
                        disabled={loading || otp.trim().length !== 6}
                        className="submission-submit-btn"
                        style={{ width: '100%', maxWidth: '100%' }}
                      >
                        {loading ? (
                          <>Verifying Code...</>
                        ) : (
                          <>
                            Verify & Access Portal
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <ProjectSubmissionForm
                {...verifiedData}
                onReset={handleReset}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
