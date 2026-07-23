import React, { useRef } from 'react';
import useAboutSphereCanvas from '../hooks/useAboutSphereCanvas.js';

export default function About({ techContainerRef }) {
  const canvasRef = useRef(null);
  useAboutSphereCanvas(canvasRef);

  return (
    <section className="quick-facts" id="about">
      <div className="about-container">
        <div className="about-left">
          <div className="reveal" style={{ marginBottom: '4rem', textAlign: 'center' }}>
            <span className="section-label">Overview</span>
            <h2 className="section-title">An online sprint to ship AI-powered solutions</h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                lineHeight: 1.8,
                textAlign: 'justify',
                textJustify: 'inter-word',
                maxWidth: 1100,
                margin: '0 auto'
              }}
            >
              The AI Buildathon is a two-week, fully online innovation sprint for University of Kelaniya students.
              Throughout the event, you&apos;ll explore modern tools, collaborate in small teams, and build a working
              prototype that solves real-world problems across any industry. Whether it&apos;s a video generator, mobile
              app, enterprise system, or public platform, if technology is at its core, it belongs here.
            </p>
          </div>

          <div className="facts-grid">
            <div className="fact-card reveal stagger-1">
              <div className="fact-icon">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="fact-title">Format</h3>
              <p className="fact-desc">Conducted entirely online with mentorship workshops.</p>
              <div className="fact-value">100% Online</div>
            </div>
            <div className="fact-card reveal stagger-2">
              <div className="fact-icon">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="fact-title">Team Size</h3>
              <p className="fact-desc">Build alone or collaborate in groups of up to three.</p>
              <div className="fact-value">1 – 3 Builders</div>
            </div>
          </div>
        </div>

        <div className="about-right reveal stagger-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            className="interactive-tech-container"
            id="interactiveTechContainer"
            ref={techContainerRef}
            style={{ width: '100%', maxWidth: 380, aspectRatio: '1', margin: '0 auto', position: 'relative' }}
          >
            <canvas id="aboutVisualCanvas" ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
