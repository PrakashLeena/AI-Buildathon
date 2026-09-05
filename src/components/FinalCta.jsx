import React from "react";
import Link from "next/link";
import useCountdown from "../hooks/useCountdown.js";
import { usePortalModal } from "../context/PortalModalContext.jsx";
import { REGISTRATION_CUTOFF_DATE } from "../lib/registrationDeadline.js";

export default function FinalCta() {
  const { openModal } = usePortalModal();
  const countdown = useCountdown(REGISTRATION_CUTOFF_DATE);

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
            className="final-cta-button"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            Go to Final Project Submission Portal{" "}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        )}

        <a className="final-cta-contact-link" href="#contact">
          Questions? Contact us <span aria-hidden="true">→</span>
        </a>

        <p className="final-cta-deadline">
          <strong>Final Submissions Open</strong>
          <span>Open to all registered participants of the AI Buildathon.</span>
        </p>
      </div>
    </section>
  );
}
