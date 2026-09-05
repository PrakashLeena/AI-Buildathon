import React from "react";
import Link from "next/link";

export default function SubmissionForm() {
  return (
    <section className="submission-section" id="submission" aria-labelledby="submission-title">
      <div className="submission-container reveal">
        <div className="submission-header">
          <div className="submission-badge" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <span className="submission-badge-dot" style={{ background: "#ef4444" }}></span>
            <span>SUBMISSIONS CLOSED</span>
          </div>
          <h2 id="submission-title" className="submission-title">
            Project Brief Submissions Closed
          </h2>
          <p className="submission-subtitle">
            The initial Project Brief submission phase is now closed. If you have advanced to the final round, please submit your final project deliverables through the Final Project Submission Portal.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
            <Link href="/submit-project" style={{ 
              padding: '1rem 2rem', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              textDecoration: 'none', 
              display: 'inline-block',
              backgroundColor: '#4f46e5',
              color: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
              Go to Final Project Submission Portal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
