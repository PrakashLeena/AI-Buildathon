import React, { useEffect, useId, useMemo, useState } from "react";
import { sendVerificationOtp, submitProjectBrief, verifySubmissionOtp } from "../lib/api.js";
import { validateSubmissionForm } from "../lib/submissionValidation.js";

const initialForm = {
  participantEmail: "",
  whatsapp: "",
  otp: "",
  otpToken: "",
  projectBrief: "",
};

export default function SubmissionForm() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});

  // Active step flow:
  // 1: "details" (Email & WhatsApp)
  // 2: "otp" (OTP Verification)
  // 3: "brief" (Team Details on top + Project Description below)
  const [currentStep, setCurrentStep] = useState("details");

  // Detected team details after OTP verification
  const [detectedTeam, setDetectedTeam] = useState(null);

  // OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
  const [otpErrorMsg, setOtpErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [honeypot, setHoneypot] = useState("");

  const emailInputId = useId();
  const whatsappInputId = useId();
  const otpInputId = useId();
  const projectBriefId = useId();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Client validation
  const errors = useMemo(() => {
    return validateSubmissionForm({
      ...form,
      isOtpRequired: currentStep === "otp",
      isBriefRequired: currentStep === "brief",
    });
  }, [form, currentStep]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "participantEmail" && value !== prev.participantEmail) {
        setDetectedTeam(null);
        setOtpSent(false);
        setOtpSuccessMsg("");
        updated.otp = "";
        updated.otpToken = "";
      }
      return updated;
    });
    if (submitError) setSubmitError("");
    if (otpErrorMsg) setOtpErrorMsg("");
  };

  // Step 1 -> Step 2: Send OTP
  const handleProceedToOtp = async (e) => {
    if (e) e.preventDefault();
    setTouched((prev) => ({
      ...prev,
      participantEmail: true,
      whatsapp: true,
    }));

    if (errors.participantEmail || errors.whatsapp || !form.participantEmail.trim() || !form.whatsapp.trim()) {
      return;
    }

    setSendingOtp(true);
    setOtpErrorMsg("");
    setOtpSuccessMsg("");

    try {
      const res = await sendVerificationOtp({
        email: form.participantEmail.trim().toLowerCase(),
        full_name: "Participant",
        mode: "submission",
        previousToken: form.otpToken || undefined,
        company_website: honeypot,
      });

      setForm((prev) => ({
        ...prev,
        otpToken: res.otpToken,
      }));
      setOtpSent(true);
      setResendCooldown(60);
      setOtpSuccessMsg(res.message || "Verification code sent to your email.");
      setCurrentStep("otp");
    } catch (err) {
      setOtpErrorMsg(err.message || "Failed to send verification OTP. Please check your email and try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and Auto-detect Team
  const handleVerifyOtpAndDetectTeam = async (e) => {
    if (e) e.preventDefault();
    setTouched((prev) => ({ ...prev, otp: true }));

    if (!form.otp || !/^\d{6}$/.test(form.otp.trim())) {
      setOtpErrorMsg("Please enter the 6-digit verification code received by email.");
      return;
    }
    if (!form.otpToken) {
      setOtpErrorMsg("Please click 'Send Code' to receive your verification code first.");
      return;
    }

    setVerifyingOtp(true);
    setOtpErrorMsg("");

    try {
      const result = await verifySubmissionOtp({
        email: form.participantEmail.trim().toLowerCase(),
        otp: form.otp.trim(),
        otpToken: form.otpToken,
      });

      if (result?.team) {
        setDetectedTeam(result.team);
        if (result.existingBrief && !form.projectBrief) {
          setForm((prev) => ({ ...prev, projectBrief: result.existingBrief }));
        }
        setCurrentStep("brief");
        setOtpSuccessMsg("Email verified! Team details detected successfully.");
      } else {
        setOtpErrorMsg("Could not verify team details. Please check code and try again.");
      }
    } catch (err) {
      setOtpErrorMsg(err.message || "OTP verification failed. Please check the code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Final Submit Project Brief
  const handleSubmitBrief = async (e) => {
    if (e) e.preventDefault();
    setTouched((prev) => ({
      ...prev,
      projectBrief: true,
    }));

    if (!form.projectBrief.trim()) {
      setSubmitError("Please enter your project brief and background before submitting.");
      return;
    }
    if (form.projectBrief.trim().length < 20) {
      setSubmitError("Project brief is too short (minimum 20 characters).");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        participant_email: form.participantEmail.trim().toLowerCase(),
        team_name: detectedTeam?.teamName || `Team ${form.participantEmail.split("@")[0]}`,
        whatsapp_number: form.whatsapp.trim(),
        otp: form.otp.trim(),
        otpToken: form.otpToken,
        project_brief: form.projectBrief.trim(),
        company_website: honeypot,
      };

      const result = await submitProjectBrief(payload);
      setSubmittedData(result.submission || payload);
      setForm(initialForm);
      setTouched({});
      setDetectedTeam(null);
      setCurrentStep("details");
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedData(null);
    setForm(initialForm);
    setTouched({});
    setDetectedTeam(null);
    setCurrentStep("details");
    setOtpSent(false);
    setOtpSuccessMsg("");
    setOtpErrorMsg("");
    setSubmitError("");
  };

  return (
    <section className="submission-section" id="submission" aria-labelledby="submission-title">
      <div className="submission-container reveal">
        {/* Header Title & Subtitle */}
        <div className="submission-header">
          <div className="submission-badge">
            <span className="submission-badge-dot"></span>
            <span>PROJECT SUBMISSION</span>
          </div>
          <h2 id="submission-title" className="submission-title">
            Submission Overview and Brief Form
          </h2>
          <p className="submission-subtitle">
            Registration has closed. Submissions are strictly for registered teams. Enter your registered email and WhatsApp number to auto-detect your team and submit your project brief.
          </p>
        </div>

        {submittedData ? (
          /* SUCCESS STATE */
          <div className="submission-success-card">
            <div className="submission-success-icon" aria-hidden="true">
              <span className="material-symbols-outlined">
                {submittedData.isOverwritten ? "published_with_changes" : "check_circle"}
              </span>
            </div>
            <h3>
              {submittedData.isOverwritten
                ? "Previous Submission Overwritten & Updated!"
                : "Project Brief Submitted Successfully!"}
            </h3>
            <p className="submission-success-desc">
              {submittedData.isOverwritten
                ? `Your team's previous project brief has been successfully replaced and updated with the latest version.`
                : `Your submission has been securely recorded. If you need to make changes, submitting again will automatically overwrite and update your team's brief.`}
            </p>

            <div className="submission-summary-box">
              <div className="summary-row">
                <span className="summary-label">Status</span>
                <span className="summary-val" style={{ color: submittedData.isOverwritten ? "#ff5500" : "#10b981" }}>
                  {submittedData.isOverwritten ? "Updated / Overwritten" : "First Submission"}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Submission ID</span>
                <span className="summary-val code-val">{submittedData.id || "SUB-CONFIRMED"}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Team</span>
                <span className="summary-val">{submittedData.teamName || submittedData.team_name}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Participant Email</span>
                <span className="summary-val">{submittedData.participantEmail || submittedData.participant_email}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">WhatsApp</span>
                <span className="summary-val">{submittedData.whatsappNumber || submittedData.whatsapp_number}</span>
              </div>
            </div>

            <button type="button" className="submission-btn-secondary" onClick={resetForm}>
              Submit Another Brief or Update
            </button>
          </div>
        ) : (
          /* MULTI-STEP FLOW */
          <div className="submission-card">
            {/* Honeypot field for bot protection */}
            <div style={{ display: "none" }} aria-hidden="true">
              <label htmlFor="company_website_sub">Leave this field blank</label>
              <input
                type="text"
                id="company_website_sub"
                name="company_website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Step Progress Tracker */}
            <div className="submission-stepper">
              <div className={`step-pill ${currentStep === "details" ? "active" : currentStep === "otp" || currentStep === "brief" ? "done" : ""}`}>
                <span className="step-pill-num">1</span>
                <span className="step-pill-label">Participant Details</span>
              </div>
              <div className="step-pill-divider"></div>
              <div className={`step-pill ${currentStep === "otp" ? "active" : currentStep === "brief" ? "done" : ""}`}>
                <span className="step-pill-num">2</span>
                <span className="step-pill-label">Email Verification</span>
              </div>
              <div className="step-pill-divider"></div>
              <div className={`step-pill ${currentStep === "brief" ? "active" : ""}`}>
                <span className="step-pill-num">3</span>
                <span className="step-pill-label">Team & Project Brief</span>
              </div>
            </div>

            {/* STEP 1: PARTICIPANT DETAILS (EMAIL & WHATSAPP) */}
            {currentStep === "details" && (
              <form onSubmit={handleProceedToOtp} noValidate className="submission-step-content">
                <div className="submission-step-header">
                  <div className="submission-step-num">1</div>
                  <div className="submission-step-info">
                    <h4>Participant Details</h4>
                    <p>Enter your email address and WhatsApp number to get started.</p>
                  </div>
                </div>

                {otpErrorMsg && (
                  <div className="submission-alert submission-alert-error" role="alert">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      warning
                    </span>
                    <span>{otpErrorMsg}</span>
                  </div>
                )}

                <div className="submission-fields-grid">
                  {/* Participant Email Address */}
                  <div className={`submission-field full-width ${touched.participantEmail && errors.participantEmail ? "has-error" : ""}`}>
                    <label htmlFor={emailInputId} className="submission-field-label">
                      Participant Email Address <span className="req-star">*</span>
                    </label>
                    <span className="submission-field-desc">Enter the registered email address of the participant (e.g. @stu.kln.ac.lk, @gmail.com).</span>
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon" aria-hidden="true">
                        mail
                      </span>
                      <input
                        id={emailInputId}
                        type="email"
                        className="submission-input"
                        placeholder="e.g. name@stu.kln.ac.lk or name@gmail.com"
                        value={form.participantEmail}
                        onChange={(e) => handleChange("participantEmail", e.target.value)}
                        onBlur={() => handleBlur("participantEmail")}
                        autoComplete="email"
                      />
                      {touched.participantEmail && !errors.participantEmail && form.participantEmail && (
                        <span className="material-symbols-outlined valid-icon" aria-hidden="true">
                          check_circle
                        </span>
                      )}
                    </div>
                    {touched.participantEmail && errors.participantEmail && (
                      <span className="field-error-text">{errors.participantEmail}</span>
                    )}
                  </div>

                  {/* WhatsApp Number */}
                  <div className={`submission-field full-width ${touched.whatsapp && errors.whatsapp ? "has-error" : ""}`}>
                    <label htmlFor={whatsappInputId} className="submission-field-label">
                      WhatsApp Number <span className="req-star">*</span>
                    </label>
                    <span className="submission-field-desc">Enter the participant’s WhatsApp number.</span>
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon" aria-hidden="true">
                        call
                      </span>
                      <input
                        id={whatsappInputId}
                        type="tel"
                        className="submission-input"
                        placeholder="e.g. +94 77 123 4567"
                        value={form.whatsapp}
                        onChange={(e) => handleChange("whatsapp", e.target.value)}
                        onBlur={() => handleBlur("whatsapp")}
                        autoComplete="tel"
                      />
                      {touched.whatsapp && !errors.whatsapp && form.whatsapp && (
                        <span className="material-symbols-outlined valid-icon" aria-hidden="true">
                          check_circle
                        </span>
                      )}
                    </div>
                    {touched.whatsapp && errors.whatsapp && <span className="field-error-text">{errors.whatsapp}</span>}
                  </div>
                </div>

                <div className="submission-footer-actions">
                  <button
                    type="submit"
                    className="submission-submit-btn"
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? (
                      <>
                        <span className="spinner-sm" aria-hidden="true"></span>
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Email Verification</span>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: EMAIL VERIFICATION (OTP SCREEN) */}
            {currentStep === "otp" && (
              <form onSubmit={handleVerifyOtpAndDetectTeam} noValidate className="submission-step-content">
                <div className="submission-step-header">
                  <div className="submission-step-num">2</div>
                  <div className="submission-step-info">
                    <h4>Email Verification</h4>
                    <p>An OTP has been sent to your email to verify your identity and detect your team.</p>
                  </div>
                </div>

                <div className="otp-trigger-banner">
                  <div className="otp-banner-text">
                    <span className="material-symbols-outlined banner-icon" aria-hidden="true">
                      mark_email_read
                    </span>
                    <div>
                      <strong>Verification Code Sent</strong>
                      <p>
                        We sent a 6-digit verification code to <span className="highlight-email">{form.participantEmail}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-text-edit"
                    onClick={() => setCurrentStep("details")}
                  >
                    Change Email
                  </button>
                </div>

                {otpSuccessMsg && (
                  <div className="submission-alert submission-alert-success" role="status">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      check_circle
                    </span>
                    <span>{otpSuccessMsg}</span>
                  </div>
                )}

                {otpErrorMsg && (
                  <div className="submission-alert submission-alert-error" role="alert">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      warning
                    </span>
                    <span>{otpErrorMsg}</span>
                  </div>
                )}

                {/* Enter OTP Field */}
                <div className={`submission-field full-width ${touched.otp && errors.otp ? "has-error" : ""}`}>
                  <label htmlFor={otpInputId} className="submission-field-label">
                    Enter OTP <span className="req-star">*</span>
                  </label>
                  <span className="submission-field-desc">
                    Enter the OTP received by email to verify the participant’s email address.
                  </span>
                  <div className="submission-otp-input-group">
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon" aria-hidden="true">
                        key
                      </span>
                      <input
                        id={otpInputId}
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="submission-input otp-code-input"
                        placeholder="6-digit OTP code (e.g. 123456)"
                        value={form.otp}
                        onChange={(e) => handleChange("otp", e.target.value.replace(/\D/g, ""))}
                        onBlur={() => handleBlur("otp")}
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-send-otp"
                      onClick={handleProceedToOtp}
                      disabled={sendingOtp || resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
                    </button>
                  </div>
                  {touched.otp && errors.otp && <span className="field-error-text">{errors.otp}</span>}
                </div>

                <div className="submission-footer-actions">
                  <button
                    type="submit"
                    className="submission-submit-btn"
                    disabled={verifyingOtp || form.otp.length !== 6}
                  >
                    {verifyingOtp ? (
                      <>
                        <span className="spinner-sm" aria-hidden="true"></span>
                        <span>Verifying & Finding Team...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SHOW TEAM DETAILS ON TOP & PROJECT DESCRIPTION BELOW */}
            {currentStep === "brief" && (
              <form onSubmit={handleSubmitBrief} noValidate className="submission-step-content">
                {/* AUTO-DETECTED TEAM DETAILS ON TOP */}
                <div className="detected-team-card">
                  <div className="team-card-header">
                    <div className="team-badge-icon" aria-hidden="true">
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                    <div>
                      <h3 className="team-name-title">{detectedTeam?.teamName || "Your Registered Team"}</h3>
                    </div>
                  </div>

                  <div className="team-details-grid">
                    <div className="team-detail-item">
                      <span className="detail-label">Verified Email</span>
                      <span className="detail-value">{form.participantEmail}</span>
                    </div>
                    <div className="team-detail-item">
                      <span className="detail-label">WhatsApp</span>
                      <span className="detail-value">{form.whatsapp}</span>
                    </div>
                    {detectedTeam?.leadName && (
                      <div className="team-detail-item">
                        <span className="detail-label">Team Leader</span>
                        <span className="detail-value">{detectedTeam.leadName}</span>
                      </div>
                    )}
                    {detectedTeam?.department && (
                      <div className="team-detail-item">
                        <span className="detail-label">Department</span>
                        <span className="detail-value">{detectedTeam.department}</span>
                      </div>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="submission-alert submission-alert-error" role="alert">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      error
                    </span>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* PROJECT DESCRIPTION BELOW */}
                <div className="submission-step-block" style={{ marginTop: "2rem", borderBottom: "none" }}>
                  <div className="submission-step-header">
                    <div className="submission-step-num">3</div>
                    <div className="submission-step-info">
                      <h4>Project Brief & Background</h4>
                      <p>
                        Please provide a brief overview of your project, including its background, the problem or need it addresses,
                        and the key objectives of the project.
                      </p>
                    </div>
                  </div>

                  <div className={`submission-field full-width ${touched.projectBrief && errors.projectBrief ? "has-error" : ""}`}>
                    <label htmlFor={projectBriefId} className="submission-field-label">
                      Project Brief, Problem Statement & Objectives <span className="req-star">*</span>
                    </label>
                    <span className="submission-field-desc">
                      Outline your project&apos;s background, core problem tackled, proposed AI solution, and expected key outcomes.
                    </span>

                    <div className="submission-textarea-wrapper">
                      <textarea
                        id={projectBriefId}
                        rows={7}
                        maxLength={1000}
                        className="submission-textarea"
                        placeholder="Provide your project overview here... (up to 1,000 characters)&#10;&#10;1. Background & Context: What inspired this project?&#10;2. Problem Statement: What critical challenge or need are you solving?&#10;3. Key Objectives: What are the primary goals, AI components, and impact of your solution?"
                        value={form.projectBrief}
                        onChange={(e) => handleChange("projectBrief", e.target.value)}
                        onBlur={() => handleBlur("projectBrief")}
                        autoFocus
                      ></textarea>
                      <div className="textarea-footer">
                        <span className={`char-counter ${form.projectBrief.length > 1000 ? "counter-low" : "counter-ok"}`}>
                          {form.projectBrief.length} / 1000 characters
                        </span>
                        {form.projectBrief.trim().length >= 20 && form.projectBrief.length <= 1000 && (
                          <span className="char-badge-ok">
                            <span className="material-symbols-outlined" aria-hidden="true">
                              check_circle
                            </span>
                            Ready for submission
                          </span>
                        )}
                      </div>
                    </div>
                    {touched.projectBrief && errors.projectBrief && (
                      <span className="field-error-text">{errors.projectBrief}</span>
                    )}
                  </div>
                </div>

                <div className="submission-footer-actions">
                  <button
                    type="submit"
                    className="submission-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-sm" aria-hidden="true"></span>
                        <span>Submitting Brief...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Project Brief</span>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                  <p className="submission-guarantee">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      lock
                    </span>
                    Submitting will overwrite any previous brief for this team.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
