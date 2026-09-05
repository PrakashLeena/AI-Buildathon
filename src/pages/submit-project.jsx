import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProjectSubmissionForm from '../components/ProjectSubmissionForm';

export default function SubmitProjectPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null); // { registrationId, participantName, participantEmail, teamName, hasExistingSubmission }

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/project-submissions/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify email.');
      }

      setVerifiedData({
        registrationId: data.registrationId,
        participantName: data.participantName,
        participantEmail: email.trim().toLowerCase(),
        teamName: data.teamName,
        hasExistingSubmission: data.hasExistingSubmission
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

      <div className="glow-bg"></div>
      <div className="grid-overlay"></div>

      <Header />

      <main style={{ paddingTop: '8.5rem', minHeight: '100vh', paddingBottom: '5rem', position: 'relative', zIndex: 1 }}>
        <section className="submission-section" style={{ background: 'transparent', borderTop: 'none', padding: '0 var(--site-gutter)' }}>
          <div className="submission-container">
            <div className="submission-header">
              <div className="submission-badge">
                <span className="submission-badge-dot"></span>
                <span>FINAL PROJECT SUBMISSION</span>
              </div>
              <h1 className="submission-title">
                Final Project Submission Portal
              </h1>
              <p className="submission-subtitle">
                Welcome to the final submission phase. Enter your registered email address to verify your team credentials and submit your final deliverables.
              </p>
            </div>

            {!verifiedData ? (
              <div className="submission-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.12), rgba(255, 136, 0, 0.08))',
                      border: '1px solid rgba(255, 85, 0, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-orange)',
                      marginBottom: '1rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                      verified_user
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Verify Team Registration
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Enter the email of your team leader or member as registered in the AI Buildathon.
                  </p>
                </div>

                {error && (
                  <div className="submission-alert submission-alert-error">
                    <span className="material-symbols-outlined">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyEmail}>
                  <div className="submission-field full-width" style={{ marginBottom: '1.75rem' }}>
                    <label htmlFor="email" className="submission-field-label">
                      Registered Email Address <span className="req-star">*</span>
                    </label>
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon">mail</span>
                      <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="submission-input"
                        placeholder="e.g. yourname@stu.kln.ac.lk"
                        style={{ paddingLeft: '2.75rem' }}
                      />
                    </div>
                  </div>

                  <div className="submission-footer-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="submission-submit-btn"
                    >
                      {loading ? (
                        <>Verifying Registration...</>
                      ) : (
                        <>
                          Continue to Submission
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                      )}
                    </button>

                    <div className="submission-guarantee">
                      <span className="material-symbols-outlined">lock</span>
                      <span>Access restricted to verified AI Buildathon participant emails.</span>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <ProjectSubmissionForm
                {...verifiedData}
                onReset={() => {
                  setVerifiedData(null);
                  setEmail('');
                }}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
