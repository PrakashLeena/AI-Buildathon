import React, { useEffect, useRef } from 'react';
import useHeroParticles from '../hooks/useHeroParticles.js';
import useCountdown from '../hooks/useCountdown.js';
import { usePortalModal } from '../context/PortalModalContext.jsx';

export default function Hero() {
  const canvasRef = useRef(null);
  const titleMainRef = useRef(null);
  const { openModal } = usePortalModal();
  useHeroParticles(canvasRef);
  const countdown = useCountdown('August 10, 2026 23:59:59');

  // Blur character entry animation for the Hero Title on load (ported 1:1).
  useEffect(() => {
    const titleEl = titleMainRef.current;
    if (!titleEl) return;
    const text = titleEl.textContent;
    titleEl.innerHTML = '';
    text.split(' ').forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.whiteSpace = 'nowrap';

      word.split('').forEach((char, charIdx) => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        charSpan.style.animationDelay = `${index * 120 + charIdx * 25}ms`;
        wordSpan.appendChild(charSpan);
      });

      titleEl.appendChild(wordSpan);
      titleEl.appendChild(document.createTextNode(' '));
    });
  }, []);

  return (
    <section className="hero" id="home" style={{ position: 'relative', overflow: 'hidden' }}>
      <canvas
        id="heroParticles"
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
      />
      <div className="hero-banner-container" style={{ zIndex: 0 }}>
        <img src="/assets/hero-banner.jpg" alt="AI Build-athon Hands Intertwining with Glowing Orange Energy Line" />
      </div>
      <span
        className="badge"
        style={{
          zIndex: 2,
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.2rem',
          textTransform: 'none',
          border: 'none',
          background: 'transparent',
          boxShadow: 'none'
        }}
      >
        <img src="/assets/AI@IM2.png" alt="AI@IM" style={{ height: 32, width: 'auto', display: 'block' }} />
      </span>
      <h1 className="hero-title" style={{ zIndex: 2, position: 'relative' }}>
        <span className="hero-title-main" ref={titleMainRef}>AI</span> <span className="gradient-text">Buildathon.</span>
      </h1>
      <p
        className="hero-subtitle"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontSize: '1.5rem',
          color: 'var(--primary-orange)',
          marginBottom: '0.5rem',
          position: 'relative',
          zIndex: 2
        }}
      >
        Build. Learn. Compete.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          justifyContent: 'center',
          margin: '0 auto 2.5rem',
          position: 'relative',
          zIndex: 2
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: 'var(--text-secondary)',
            lineHeight: 1
          }}
        >
          Powered by
        </span>
        <img
          src="/assets/alibaba-cloud-logo.png"
          alt="Alibaba Cloud"
          style={{ height: 22, width: 'auto', display: 'block', mixBlendMode: 'multiply' }}
        />
      </div>
      <p className="hero-subtitle" style={{ marginTop: 0, maxWidth: 650, marginBottom: '3.5rem', position: 'relative', zIndex: 2 }}>
        Join the AI Buildathon and turn your ideas into real-world solutions. Learn, build, and compete using
        industry-grade tools, no prior experience needed.
      </p>
      <div className="hero-ctas" style={{ position: 'relative', zIndex: 2 }}>
        <a
          href="#"
          className="btn-primary open-portal-btn"
          data-tab="register"
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
        >
          Register Team
        </a>
        <a href="#about" className="btn-secondary">Explore Details</a>
      </div>

      <div className="countdown-container" style={{ position: 'relative', zIndex: 2 }}>
        {countdown.closed ? (
          <>
            <div className="countdown-title">Registration Closed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-orange)', marginTop: '0.5rem' }}>
              The Hackathon has officially kicked off!
            </div>
          </>
        ) : (
          <>
            <div className="countdown-title">Registration Deadline Countdown</div>
            <div className="countdown-grid">
              <div className="countdown-item">
                <span className="countdown-value" id="days">{countdown.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value" id="hours">{countdown.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value" id="minutes">{countdown.minutes}</span>
                <span className="countdown-label">Mins</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value" id="seconds">{countdown.seconds}</span>
                <span className="countdown-label">Secs</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
