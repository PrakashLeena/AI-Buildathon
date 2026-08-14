import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePortalModal } from "../context/PortalModalContext.jsx";
import { faculties, facultyDeptData } from "../data/facultyDepartments.js";
import { registerTeam, sendVerificationOtp } from "../lib/api.js";
import EditTeamFlow from "./EditTeamFlow.jsx";
import Turnstile from "./Turnstile.jsx";
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  saveRegistrationDraft,
  validateRegistrationForm,
} from "../lib/registrationValidation.js";
import { isRegistrationClosed } from "../lib/registrationDeadline.js";

const initialFormState = {
  fullName: "",
  email: "",
  studentId: "",
  faculty: "",
  department: "",
  yearOfStudy: "1st Year",
  teamName: "",
};

const emptyMember = {
  name: "",
  email: "",
  student_id: "",
  faculty: "",
  department: "",
  year_of_study: "1st Year",
};

export default function RegisterModal() {
  const { isOpen, closeModal } = usePortalModal();

  const [form, setForm] = useState(initialFormState);
  const [teamSize, setTeamSize] = useState(1);
  const [members, setMembers] = useState([]); // extra members beyond the lead
  const [isLoaded, setIsLoaded] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  // Email verification (OTP) step. "details" shows the registration form;
  // "otp" shows the 6-digit code entry after the code has been emailed to
  // the team leader. The otpToken is the server-signed proof of which email
  // the code was sent to - it goes back up with the code on final submit.
  const [step, setStep] = useState("details");
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  // Success screen: lets the user expand a summary of what they submitted.
  const [showDetails, setShowDetails] = useState(false);
  // "register" shows the normal sign-up flow; "edit" shows the flow for an
  // existing team leader to update their members' details.
  const [mode, setMode] = useState("register");
  const turnstileRef = useRef(null);
  const cardRef = useRef(null);
  // Honeypot anti-spam field: invisible to real users, but simple bots that
  // blindly fill every input on a form often fill this in too. Any
  // non-empty value here makes the backend silently reject the submission.
  const [honeypot, setHoneypot] = useState("");

  const departmentOptions = useMemo(
    () => facultyDeptData[form.faculty] || [],
    [form.faculty],
  );
  const errors = useMemo(
    () => validateRegistrationForm(form, teamSize, members),
    [form, teamSize, members],
  );

  // Restore any in-progress draft (e.g. if the modal was accidentally closed
  // by clicking outside it) exactly once, on first render.
  useEffect(() => {
    const draft = loadRegistrationDraft();
    if (draft) {
      if (draft.form) setForm(draft.form);
      if (draft.teamSize) setTeamSize(draft.teamSize);
      if (draft.members) setMembers(draft.members);
    }
    setIsLoaded(true);
  }, []);

  // Auto-save progress as the user types, so an accidental click outside the
  // modal (which just hides it) never erases what they've already entered.
  useEffect(() => {
    if (isLoaded) {
      saveRegistrationDraft({ form, teamSize, members });
    }
  }, [form, teamSize, members, isLoaded]);

  // Scroll card to top when an error is set so the message is visible.
  useEffect(() => {
    if (errorMsg) {
      cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [errorMsg]);

  // Ticks the "Resend code in Ns" countdown once per second.
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetAll = () => {
    setForm(initialFormState);
    setTeamSize(1);
    setMembers([]);
    setTouched({});
    setErrorMsg("");
    setSuccess(false);
    setSubmitting(false);
    setCaptchaToken("");
    turnstileRef.current?.reset();
    setHoneypot("");
    setStep("details");
    setOtpToken("");
    setOtpCode("");
    setResendCooldown(0);
    setResending(false);
    setShowDetails(false);
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
      setErrorMsg("");
    }
  };

  const markTouched = (field) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleFieldChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "faculty") next.department = "";
      return next;
    });
  };

  const handleTeamSizeChange = (size) => {
    setTeamSize(size);
    setMembers((prev) => {
      const needed = size - 1;
      const next = prev.slice(0, needed);
      while (next.length < needed) next.push({ ...emptyMember });
      return next;
    });
  };

  const handleMemberChange = (index, field) => (e) => {
    const value = e.target.value;
    setMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Changing faculty invalidates the previously selected department.
      if (field === "faculty") next[index].department = "";
      return next;
    });
  };

  // Step 1: validate the form, then email a 6-digit verification code to
  // the team leader instead of registering straight away. The CAPTCHA is
  // spent here - the returned otpToken is what authorises the final submit.
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
      setErrorMsg("Please fix the highlighted fields before submitting.");
      return;
    }

    if (!captchaToken) {
      setErrorMsg(
        "Please complete the CAPTCHA verification before submitting.",
      );
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const data = await sendVerificationOtp({
        email: form.email.trim(),
        full_name: form.fullName.trim(),
        captchaToken,
        company_website: honeypot,
      });

      setOtpToken(data.otpToken);
      setOtpCode("");
      setStep("otp");
      setResendCooldown(60);
      cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMsg(
        err.message || "Could not send the verification email. Please try again.",
      );
    } finally {
      // Turnstile tokens are single-use - the send attempt (successful or
      // not) consumed it, so force a fresh challenge for any re-submit.
      setCaptchaToken("");
      turnstileRef.current?.reset();
      setSubmitting(false);
    }
  };

  // Step 2: submit the registration together with the code the leader typed
  // and the signed otpToken. The backend verifies both before saving the
  // team and then emails the welcome message.
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMsg("Please enter the 6-digit code we emailed you.");
      return;
    }

    setErrorMsg("");
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
        members: members.map((member) => ({
          name: (member.name || "").trim(),
          email: (member.email || "").trim().toLowerCase(),
          student_id: (member.student_id || "").trim(),
          faculty: member.faculty || "",
          department: member.department || "",
          // Drafts saved before these fields existed may lack a year - default it.
          year_of_study: member.year_of_study || "1st Year",
        })),
        tools_interested: [],
        otp: otpCode.trim(),
        otpToken,
        company_website: honeypot,
      });

      setSuccess(true);
      setShowDetails(false);
      // The registration is safely stored server-side now - drop the local
      // draft immediately so it can't be confused with a fresh attempt.
      // Keep the modal open so the user can review their submitted details.
      clearRegistrationDraft();
      cardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMsg(err.message || "An error occurred during registration.");
    } finally {
      setSubmitting(false);
    }
  };

  // "Resend code": no fresh CAPTCHA needed - the previous otpToken proves
  // the original send already passed one. Rate-limited server-side.
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending || submitting) return;

    setErrorMsg("");
    setResending(true);
    try {
      const data = await sendVerificationOtp({
        email: form.email.trim(),
        full_name: form.fullName.trim(),
        previousToken: otpToken,
        company_website: honeypot,
      });
      setOtpToken(data.otpToken);
      setOtpCode("");
      setResendCooldown(60);
    } catch (err) {
      setErrorMsg(
        err.message || "Could not resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  // Back from the OTP step to fix a typo in the details (e.g. wrong email).
  // Re-submitting will require a fresh CAPTCHA + send a new code.
  const handleBackToDetails = () => {
    setStep("details");
    setOtpCode("");
    setErrorMsg("");
  };

  const fieldError = (key) => (touched[key] && errors[key] ? errors[key] : "");
  const inputClass = (key) =>
    `form-input${fieldError(key) ? " input-invalid" : ""}`;

  return (
    <div
      className={`portal-modal${isOpen ? " active" : ""}`}
      id="portalModal"
      onClick={(e) => {
        if (e.target.id === "portalModal") handleDismiss();
      }}
    >
      {/* data-lenis-prevent stops the Lenis smooth-scroll library from
          hijacking wheel/touch events over this card, so scrolling inside
          the modal scrolls the modal - not the page behind it. */}
      <div className="portal-card" ref={cardRef} data-lenis-prevent>
        <button
          className="close-portal-btn"
          id="closePortalBtn"
          aria-label="Close modal"
          onClick={handleDismiss}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M13.5 4.5l-9 9m0-9l9 9" />
          </svg>
        </button>

        <div className="portal-pane active" id="paneRegister">
          {mode === "edit" ? (
            <EditTeamFlow
              isOpen={isOpen}
              onBack={() => setMode("register")}
              onDone={() => {
                setMode("register");
                closeModal();
              }}
            />
          ) : (
            <>
          <div
            className={`success-overlay${success ? " active" : ""}`}
            id="registerSuccessOverlay"
          >
            <div className="checkmark-circle">
              <svg
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="portal-title" style={{ color: "#10b981" }}>
              Roster Registered!
            </h3>
            <p className="portal-sub" style={{ marginBottom: "0.5rem" }}>
              Congratulations, team{" "}
              <strong
                id="successTeamName"
                style={{ color: "var(--primary-orange)" }}
              >
                {form.teamName}
              </strong>
              !
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Your team profile has been successfully registered. Check your
              inbox for confirmation details.
            </p>

            <button
              type="button"
              className="submit-btn"
              style={{
                marginTop: "1.5rem",
                background: showDetails
                  ? "transparent"
                  : "var(--primary-orange)",
                border: showDetails
                  ? "1px solid var(--border-glass)"
                  : "none",
                color: showDetails ? "var(--text-primary)" : "#fff",
              }}
              onClick={() => setShowDetails((open) => !open)}
            >
              {showDetails
                ? "Hide registration details"
                : "View registration details"}
            </button>

            {showDetails && (
              <div
                className="registration-summary"
                style={{
                  marginTop: "1.25rem",
                  textAlign: "left",
                  border: "1px solid var(--border-glass)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--primary-orange)",
                  }}
                >
                  Your registration
                </p>

                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    Team
                  </p>
                  <p style={{ margin: "0.15rem 0 0", fontWeight: 600 }}>
                    {form.teamName}{" "}
                    <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                      ({teamSize} {teamSize === 1 ? "member" : "members"})
                    </span>
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border-glass)",
                    paddingTop: "0.9rem",
                    marginBottom: members.length ? "0.9rem" : 0,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Lead Builder
                  </p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{form.fullName}</p>
                  <p style={{ margin: "0.2rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {form.email}
                  </p>
                  <p style={{ margin: "0.2rem 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    ID: {form.studentId}
                  </p>
                  <p style={{ margin: "0.2rem 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {[form.faculty, form.department, form.yearOfStudy]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                {members.map((member, index) => (
                  <div
                    key={index}
                    style={{
                      borderTop: "1px solid var(--border-glass)",
                      paddingTop: "0.9rem",
                      marginBottom:
                        index === members.length - 1 ? 0 : "0.9rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Member {index + 2}
                    </p>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {member.name}
                    </p>
                    {member.email && (
                      <p
                        style={{
                          margin: "0.2rem 0 0",
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {member.email}
                      </p>
                    )}
                    <p
                      style={{
                        margin: "0.2rem 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      ID: {member.student_id}
                    </p>
                    <p
                      style={{
                        margin: "0.2rem 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {[
                        member.faculty,
                        member.department,
                        member.year_of_study,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="submit-btn"
              style={{
                marginTop: "1.25rem",
                background: "transparent",
                border: "1px solid var(--border-glass)",
                color: "var(--text-secondary)",
              }}
              onClick={handleDismiss}
            >
              Done
            </button>
          </div>

          <div
            id="registerFormContent"
            style={{ display: success ? "none" : "block" }}
          >
            {isRegistrationClosed() ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <h3 className="portal-title">Registration Closed</h3>
                <p className="portal-sub" style={{ marginTop: "1rem" }}>
                  Registrations for the AI Buildathon closed on August 15 at 7:00 AM.
                </p>
                <button
                  type="button"
                  className="submit-btn"
                  style={{ marginTop: "1.5rem" }}
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h3 className="portal-title">
              {step === "otp" ? "Verify Your Email" : "Join the AI Sprint"}
            </h3>
            <p className="portal-sub">
              {step === "otp" ? (
                <>
                  Enter the 6-digit code we sent to{" "}
                  <strong style={{ color: "var(--primary-orange)" }}>
                    {form.email.trim()}
                  </strong>
                </>
              ) : (
                "Build your team and kick off your journey"
              )}
            </p>

            <div
              className="form-message error"
              id="registerMsg"
              style={{ display: errorMsg ? "block" : "none" }}
            >
              {errorMsg}
            </div>

            {step === "otp" ? (
              <form id="otpForm" onSubmit={handleVerifyAndRegister} noValidate>
                <div
                  className="form-group"
                  style={{ marginTop: "1.5rem", textAlign: "center" }}
                >
                  <label className="form-label" htmlFor="otpInput">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="otpInput"
                    className="form-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    style={{
                      textAlign: "center",
                      fontSize: "1.6rem",
                      letterSpacing: "0.5em",
                      fontFamily: "'Courier New', Courier, monospace",
                    }}
                  />
                  <p
                    style={{
                      marginTop: "0.75rem",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    The code expires in 10 minutes. Check your spam folder if
                    you can&rsquo;t find it.
                  </p>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: "1rem" }}
                  disabled={submitting || otpCode.length !== 6}
                >
                  <span>
                    {submitting
                      ? "Verifying & Registering..."
                      : "Verify & Register Team"}
                  </span>
                  <div
                    className="loading-spinner"
                    style={{
                      display: submitting ? "inline-block" : "none",
                    }}
                  ></div>
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBackToDetails}
                    disabled={submitting}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                  >
                    ← Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending || submitting}
                    style={{
                      background: "none",
                      border: "none",
                      cursor:
                        resendCooldown > 0 || resending
                          ? "not-allowed"
                          : "pointer",
                      color:
                        resendCooldown > 0 || resending
                          ? "var(--text-secondary)"
                          : "var(--primary-orange)",
                      fontSize: "0.85rem",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                  >
                    {resending
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                </div>
              </form>
            ) : (
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
                <label className="form-label" htmlFor="regName">
                  Full Name (Lead Builder)
                </label>
                <input
                  type="text"
                  id="regName"
                  className={inputClass("fullName")}
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={handleFieldChange("fullName")}
                  onBlur={markTouched("fullName")}
                />
                {fieldError("fullName") && (
                  <span className="field-error">{fieldError("fullName")}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="regEmail">
                  Email Address
                </label>
                <input
                  type="email"
                  id="regEmail"
                  className={inputClass("email")}
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={handleFieldChange("email")}
                  onBlur={markTouched("email")}
                />
                {fieldError("email") && (
                  <span className="field-error">{fieldError("email")}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regStudentId">
                    Student ID / Reg No
                  </label>
                  <input
                    type="text"
                    id="regStudentId"
                    className={inputClass("studentId")}
                    placeholder="Enter your Student ID / Reg No"
                    value={form.studentId}
                    onChange={handleFieldChange("studentId")}
                    onBlur={markTouched("studentId")}
                  />
                  {fieldError("studentId") && (
                    <span className="field-error">
                      {fieldError("studentId")}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regFaculty">
                    Faculty
                  </label>
                  <select
                    id="regFaculty"
                    className={inputClass("faculty")}
                    value={form.faculty}
                    onChange={handleFieldChange("faculty")}
                    onBlur={markTouched("faculty")}
                  >
                    <option value="" disabled>
                      Select Faculty
                    </option>
                    {faculties.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                  {fieldError("faculty") && (
                    <span className="field-error">{fieldError("faculty")}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="regDept">
                    Department
                  </label>
                  <select
                    id="regDept"
                    className={inputClass("department")}
                    disabled={!form.faculty}
                    value={form.department}
                    onChange={handleFieldChange("department")}
                    onBlur={markTouched("department")}
                  >
                    <option value="" disabled>
                      {form.faculty
                        ? "Select Department"
                        : "Select Faculty First"}
                    </option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {fieldError("department") && (
                    <span className="field-error">
                      {fieldError("department")}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="regYear">
                    Year of Study
                  </label>
                  <select
                    id="regYear"
                    className="form-input"
                    value={form.yearOfStudy}
                    onChange={handleFieldChange("yearOfStudy")}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div
                className="form-row"
                style={{
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--border-glass)",
                  paddingTop: "1.5rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="regTeamName">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="regTeamName"
                    className={inputClass("teamName")}
                    placeholder="Enter your team name"
                    value={form.teamName}
                    onChange={handleFieldChange("teamName")}
                    onBlur={markTouched("teamName")}
                  />
                  {fieldError("teamName") && (
                    <span className="field-error">
                      {fieldError("teamName")}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Team Size</label>
                  <div className="segmented-control">
                    {[1, 2, 3].map((size) => (
                      <button
                        type="button"
                        key={size}
                        className={`segment-btn${teamSize === size ? " active" : ""}`}
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
                {members.map((member, index) => (
                  <div
                    key={index}
                    style={{
                      marginTop: "1.5rem",
                      borderTop: "1px solid var(--border-glass)",
                      paddingTop: "1.5rem",
                    }}
                  >
                    <label className="form-label">
                      Member {index + 2} Information
                    </label>
                    <div className="form-row">
                      <div className="form-group">
                        <label
                          className="form-label"
                          htmlFor={`member-${index}-name`}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          id={`member-${index}-name`}
                          className={inputClass(`member-${index}-name`)}
                          placeholder="Enter full name"
                          value={member.name}
                          onChange={handleMemberChange(index, "name")}
                          onBlur={markTouched(`member-${index}-name`)}
                        />
                        {fieldError(`member-${index}-name`) && (
                          <span className="field-error">
                            {fieldError(`member-${index}-name`)}
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label
                          className="form-label"
                          htmlFor={`member-${index}-student_id`}
                        >
                          Student ID / Reg No
                        </label>
                        <input
                          type="text"
                          id={`member-${index}-student_id`}
                          className={inputClass(`member-${index}-student_id`)}
                          placeholder="Enter Student ID / Reg No"
                          value={member.student_id}
                          onChange={handleMemberChange(index, "student_id")}
                          onBlur={markTouched(`member-${index}-student_id`)}
                        />
                        {fieldError(`member-${index}-student_id`) && (
                          <span className="field-error">
                            {fieldError(`member-${index}-student_id`)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor={`member-${index}-email`}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        id={`member-${index}-email`}
                        className={inputClass(`member-${index}-email`)}
                        placeholder="Enter email address"
                        value={member.email || ""}
                        onChange={handleMemberChange(index, "email")}
                        onBlur={markTouched(`member-${index}-email`)}
                      />
                      {fieldError(`member-${index}-email`) && (
                        <span className="field-error">
                          {fieldError(`member-${index}-email`)}
                        </span>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label
                          className="form-label"
                          htmlFor={`member-${index}-faculty`}
                        >
                          Faculty
                        </label>
                        <select
                          id={`member-${index}-faculty`}
                          className={inputClass(`member-${index}-faculty`)}
                          value={member.faculty || ""}
                          onChange={handleMemberChange(index, "faculty")}
                          onBlur={markTouched(`member-${index}-faculty`)}
                        >
                          <option value="" disabled>
                            Select Faculty
                          </option>
                          {faculties.map((faculty) => (
                            <option key={faculty} value={faculty}>
                              {faculty}
                            </option>
                          ))}
                        </select>
                        {fieldError(`member-${index}-faculty`) && (
                          <span className="field-error">
                            {fieldError(`member-${index}-faculty`)}
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label
                          className="form-label"
                          htmlFor={`member-${index}-department`}
                        >
                          Department
                        </label>
                        <select
                          id={`member-${index}-department`}
                          className={inputClass(`member-${index}-department`)}
                          disabled={!member.faculty}
                          value={member.department || ""}
                          onChange={handleMemberChange(index, "department")}
                          onBlur={markTouched(`member-${index}-department`)}
                        >
                          <option value="" disabled>
                            {member.faculty
                              ? "Select Department"
                              : "Select Faculty First"}
                          </option>
                          {(facultyDeptData[member.faculty] || []).map(
                            (dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ),
                          )}
                        </select>
                        {fieldError(`member-${index}-department`) && (
                          <span className="field-error">
                            {fieldError(`member-${index}-department`)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor={`member-${index}-year`}
                      >
                        Year of Study
                      </label>
                      <select
                        id={`member-${index}-year`}
                        className="form-input"
                        value={member.year_of_study || "1st Year"}
                        onChange={handleMemberChange(index, "year_of_study")}
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: "1.5rem" }}>
                {isOpen && (
                  <Turnstile
                    ref={turnstileRef}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken("")}
                  />
                )}
              </div>

              <button
                type="submit"
                className="submit-btn"
                style={{ marginTop: "2rem" }}
                disabled={submitting}
              >
                <span id="registerBtnText">
                  {submitting
                    ? "Sending Verification Code..."
                    : "Register Team"}
                </span>
                <div
                  className="loading-spinner"
                  id="registerSpinner"
                  style={{ display: submitting ? "inline-block" : "none" }}
                ></div>
              </button>

              <p
                style={{
                  marginTop: "1.25rem",
                  textAlign: "center",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setMode("edit");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--primary-orange)",
                    fontSize: "0.85rem",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Edit your team details
                </button>
              </p>
            </form>
            )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
