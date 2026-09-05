import React from "react";
import Link from "next/link";
import useCountdown from "../hooks/useCountdown.js";
import { usePortalModal } from "../context/PortalModalContext.jsx";
import { REGISTRATION_CUTOFF_DATE } from "../lib/registrationDeadline.js";
import { SUBMISSION_CUTOFF_DATE } from "../lib/submissionDeadline.js";

export default function FinalCta() {
  const { openModal } = usePortalModal();
  const countdown = useCountdown(REGISTRATION_CUTOFF_DATE);
  const submissionCountdown = useCountdown(SUBMISSION_CUTOFF_DATE);

  return (
    <section className="final-cta" id="submission" aria-labelledby="final-cta-title">
      <div className="final-cta-content reveal">
        <span className="final-cta-eyebrow">FINAL DELIVERABLES</span>
        <h2 id="final-cta-title">Submit Your Final Project.</h2>

        <p className="final-cta-intro section-subtitle">
          The Project Brief phase is closed. Registered teams are now invited to submit their working prototypes, demo video walkthroughs, and repository links through the official portal.
        </p>

        <div className="final-cta-manifesto" aria-label="Ways to build">
          <span>Working Prototype.</span>
          <span>Demo Walkthrough.</span>
          <span>Source Repository.</span>
        </div>

        {!countdown.closed ? (
          <button
            type="button"
            className="final-cta-button"
            onClick={openModal}
          >
            Register for AI Buildathon{" "}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        ) : (
          <Link
            href="/submit-project"
            className="final-cta-button final-cta-button-outline"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            Go to Submission Portal{" "}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        )}

        <a className="final-cta-contact-link" href="#contact">
          Questions? Contact us <span aria-hidden="true">→</span>
        </a>

        {!submissionCountdown.closed ? (
          <div className="final-cta-countdown">
            <strong>Submission Deadline</strong>
            <div className="final-cta-countdown-grid">
              <span><b>{submissionCountdown.days}</b>d</span>
              <span><b>{submissionCountdown.hours}</b>h</span>
              <span><b>{submissionCountdown.minutes}</b>m</span>
              <span><b>{submissionCountdown.seconds}</b>s</span>
            </div>
          </div>
        ) : (
          <p className="final-cta-deadline">
            <strong>Submissions Closed</strong>
            <span>The project submission window has closed.</span>
          </p>
        )}
      </div>
    </section>
  );
}
