import React from "react";
import useCountdown from "../hooks/useCountdown.js";
import { usePortalModal } from "../context/PortalModalContext.jsx";
import { REGISTRATION_CUTOFF_DATE } from "../lib/registrationDeadline.js";

export default function FinalCta() {
  const { openModal } = usePortalModal();
  const countdown = useCountdown(REGISTRATION_CUTOFF_DATE);

  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="final-cta-content reveal">
        <span className="final-cta-eyebrow">Ready to build?</span>
        <h2 id="final-cta-title">Your Idea Starts Here.</h2>

        <p className="final-cta-intro section-subtitle">
          You have <strong>two weeks</strong> to take an idea from your head to
          a working AI-powered solution.
        </p>

        <div className="final-cta-manifesto" aria-label="Ways to build">
          <span>Build solo.</span>
          <span>Build with friends.</span>
          <span>Build something worth showing.</span>
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
          <a
            href="#submission"
            className="final-cta-button"
            style={{ textDecoration: "none" }}
          >
            Submit Project Brief{" "}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </a>
        )}

        <a className="final-cta-contact-link" href="#contact">
          Questions? Contact us <span aria-hidden="true">→</span>
        </a>

        <p className="final-cta-deadline">
          <strong>Registrations close August 14</strong>
          <span>Open to students of the University of Kelaniya.</span>
        </p>
      </div>
    </section>
  );
}
