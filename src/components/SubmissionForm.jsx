import React, { useEffect, useId, useMemo, useState } from "react";
import { getRegisteredTeams, sendVerificationOtp, submitProjectBrief } from "../lib/api.js";
import { validateSubmissionForm } from "../lib/submissionValidation.js";

const initialForm = {
  participantEmail: "",
  team: "",
  whatsapp: "",
  otp: "",
  otpToken: "",
  projectBrief: "",
};

export default function SubmissionForm() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [isCustomTeam, setIsCustomTeam] = useState(false);

  // OTP state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
  const [otpErrorMsg, setOtpErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedData, setSubmittedData] = useState(null);
  const [honeypot, setHoneypot] = useState("");

  const emailInputId = useId();
  const teamSelectId = useId();
  const customTeamInputId = useId();
  const whatsappInputId = useId();
  const otpInputId = useId();
  const projectBriefId = useId();

  // Load registered teams for the dropdown
  useEffect(() => {
    let mounted = true;
    setTeamsLoading(true);
    getRegisteredTeams()
      .then((res) => {
        if (mounted && Array.isArray(res?.teams)) {
          setRegisteredTeams(res.teams);
        }
      })
      .catch((err) => {
        console.warn("Could not load registered teams:", err);
      })
      .finally(() => {
        if (mounted) setTeamsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
      isOtpRequired: true,
    });
  }, [form]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // If email changes after OTP is sent, reset OTP state
      if (field === "participantEmail" && value !== prev.participantEmail) {
        setIsOtpVerified(false);
        setOtpSent(false);
        setOtpSuccessMsg("");
        updated.otp = "";
        updated.otpToken = "";
      }
      if (field === "otp") {
        setIsOtpVerified(false);
      }
      return updated;
    });
    if (submitError) setSubmitError("");
  };

  // Send OTP
  const handleSendOtp = async () => {
    setTouched((prev) => ({ ...prev, participantEmail: true }));
    if (errors.participantEmail) {
      setOtpErrorMsg(errors.participantEmail);
      return;
    }

    setSendingOtp(true);
    setOtpErrorMsg("");
    setOtpSuccessMsg("");

    try {
      const res = await sendVerificationOtp({
        email: form.participantEmail.trim(),
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
      setOtpSuccessMsg(res.message || "Verification OTP code has been sent to your email.");
    } catch (err) {
      setOtpErrorMsg(err.message || "Failed to send verification OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Quick verify OTP local check
  const handleVerifyOtpCode = () => {
    setTouched((prev) => ({ ...prev, otp: true }));
    if (!form.otp || !/^\d{6}$/.test(form.otp.trim())) {
      setOtpErrorMsg("Please enter a valid 6-digit numeric OTP.");
      return;
    }
    if (!form.otpToken) {
      setOtpErrorMsg("Please click 'Send OTP' first to receive your code.");
      return;
    }
    setIsOtpVerified(true);
    setOtpErrorMsg("");
    setOtpSuccessMsg("OTP verified ready for submission!");
  };

  // Handle final form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      participantEmail: true,
      team: true,
      whatsapp: true,
      otp: true,
      projectBrief: true,
    });

    if (Object.keys(errors).length > 0) {
      setSubmitError("Please correct the errors in the form before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        participant_email: form.participantEmail.trim(),
        team_name: form.team.trim(),
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
      setIsOtpVerified(false);
      setOtpSent(false);
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
    setIsOtpVerified(false);
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
            Provide your team details, verify your email address, and submit your project brief and background to complete your milestone.
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
                ? `Your team's previous project brief has been successfully replaced and updated. The evaluation panel will review the latest version.`
                : `Your submission has been securely recorded. If you need to make changes, submitting again before the deadline will automatically overwrite and update your team's brief.`}
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
          /* FORM STATE */
          <form className="submission-card" onSubmit={handleSubmit} noValidate>
            {/* Overwrite info notice */}
            <div className="submission-overwrite-notice">
              <span className="material-symbols-outlined notice-icon" aria-hidden="true">
                info
              </span>
              <span>
                <strong>One submission per team:</strong> Submitting again for the same team will automatically overwrite and replace any previous brief.
              </span>
            </div>
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

            {submitError && (
              <div className="submission-alert submission-alert-error" role="alert">
                <span className="material-symbols-outlined" aria-hidden="true">
                  error
                </span>
                <span>{submitError}</span>
              </div>
            )}

            {/* SECTION 1: PARTICIPANT DETAILS */}
            <div className="submission-step-block">
              <div className="submission-step-header">
                <div className="submission-step-num">1</div>
                <div className="submission-step-info">
                  <h4>Participant Details</h4>
                  <p>Provide contact and team details for the participant.</p>
                </div>
              </div>

              <div className="submission-fields-grid">
                {/* Participant Email Address */}
                <div className={`submission-field ${touched.participantEmail && errors.participantEmail ? "has-error" : ""}`}>
                  <label htmlFor={emailInputId} className="submission-field-label">
                    Participant Email Address <span className="req-star">*</span>
                  </label>
                  <span className="submission-field-desc">Enter the participant’s Gmail address (@gmail.com).</span>
                  <div className="submission-input-wrapper">
                    <span className="material-symbols-outlined input-icon" aria-hidden="true">
                      mail
                    </span>
                    <input
                      id={emailInputId}
                      type="email"
                      className="submission-input"
                      placeholder="e.g. participant@gmail.com"
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

                {/* Team */}
                <div className={`submission-field ${touched.team && errors.team ? "has-error" : ""}`}>
                  <label htmlFor={isCustomTeam ? customTeamInputId : teamSelectId} className="submission-field-label">
                    Team <span className="req-star">*</span>
                  </label>
                  <span className="submission-field-desc">Select the participant’s team.</span>

                  {!isCustomTeam ? (
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon" aria-hidden="true">
                        groups
                      </span>
                      <select
                        id={teamSelectId}
                        className="submission-select"
                        value={form.team}
                        onChange={(e) => {
                          if (e.target.value === "__OTHER__") {
                            setIsCustomTeam(true);
                            handleChange("team", "");
                          } else {
                            handleChange("team", e.target.value);
                          }
                        }}
                        onBlur={() => handleBlur("team")}
                      >
                        <option value="">-- Select Team --</option>
                        {registeredTeams.map((teamName) => (
                          <option key={teamName} value={teamName}>
                            {teamName}
                          </option>
                        ))}
                        <option value="__OTHER__">+ Enter Custom Team Name...</option>
                      </select>
                      {touched.team && !errors.team && form.team && (
                        <span className="material-symbols-outlined valid-icon" aria-hidden="true">
                          check_circle
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="submission-input-wrapper">
                      <span className="material-symbols-outlined input-icon" aria-hidden="true">
                        groups
                      </span>
                      <input
                        id={customTeamInputId}
                        type="text"
                        className="submission-input"
                        placeholder="Enter your team name"
                        value={form.team}
                        onChange={(e) => handleChange("team", e.target.value)}
                        onBlur={() => handleBlur("team")}
                      />
                      <button
                        type="button"
                        className="btn-switch-select"
                        onClick={() => {
                          setIsCustomTeam(false);
                          handleChange("team", "");
                        }}
                        title="Back to list"
                      >
                        Choose from list
                      </button>
                    </div>
                  )}

                  {touched.team && errors.team && <span className="field-error-text">{errors.team}</span>}
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
            </div>

            {/* SECTION 2: EMAIL VERIFICATION */}
            <div className="submission-step-block">
              <div className="submission-step-header">
                <div className="submission-step-num">2</div>
                <div className="submission-step-info">
                  <h4>Email Verification</h4>
                  <p>An OTP will be sent to the participant’s email address.</p>
                </div>
              </div>

              <div className="submission-otp-container">
                <div className="otp-trigger-banner">
                  <div className="otp-banner-text">
                    <span className="material-symbols-outlined banner-icon" aria-hidden="true">
                      mark_email_read
                    </span>
                    <div>
                      <strong>Verify Participant Email</strong>
                      <p>
                        Click &ldquo;Send OTP&rdquo; to deliver a 6-digit verification code to{" "}
                        <span className="highlight-email">{form.participantEmail.trim() || "your email address"}</span>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-send-otp"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || resendCooldown > 0 || !form.participantEmail.trim()}
                  >
                    {sendingOtp ? (
                      <>
                        <span className="spinner-sm" aria-hidden="true"></span>
                        <span>Sending Code...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend Code ({resendCooldown}s)</span>
                    ) : otpSent ? (
                      <span>Resend OTP Code</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          send
                        </span>
                        <span>Send OTP</span>
                      </>
                    )}
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
                <div className={`submission-field ${touched.otp && errors.otp ? "has-error" : ""}`}>
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
                      />
                    </div>
                    <button
                      type="button"
                      className={`btn-verify-otp ${isOtpVerified ? "verified" : ""}`}
                      onClick={handleVerifyOtpCode}
                      disabled={!form.otp || form.otp.length !== 6}
                    >
                      {isOtpVerified ? (
                        <>
                          <span className="material-symbols-outlined" aria-hidden="true">
                            verified
                          </span>
                          <span>Verified</span>
                        </>
                      ) : (
                        <span>Verify Code</span>
                      )}
                    </button>
                  </div>
                  {touched.otp && errors.otp && <span className="field-error-text">{errors.otp}</span>}
                </div>
              </div>
            </div>

            {/* SECTION 3: PROJECT BRIEF & BACKGROUND */}
            <div className="submission-step-block">
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
                    rows={6}
                    maxLength={1000}
                    className="submission-textarea"
                    placeholder="Provide your project overview here... (up to 1,000 characters)&#10;&#10;1. Background & Context: What inspired this project?&#10;2. Problem Statement: What critical challenge or need are you solving?&#10;3. Key Objectives: What are the primary goals, AI components, and impact of your solution?"
                    value={form.projectBrief}
                    onChange={(e) => handleChange("projectBrief", e.target.value)}
                    onBlur={() => handleBlur("projectBrief")}
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

            {/* Submit Action Block */}
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
                Protected by email OTP verification. Your brief is directly evaluated by the AI Buildathon committee.
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
