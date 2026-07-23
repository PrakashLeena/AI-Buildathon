import React from 'react';

export default function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <img
          src="/assets/event-logo-light.png"
          alt="AI Buildathon"
          style={{ height: 45, width: 'auto', display: 'block', margin: '0 auto 1.5rem' }}
        />

        <p
          className="footer-orgs"
          style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', maxWidth: 700, margin: '0 auto 2.5rem', lineHeight: 1.6 }}
        >
          Organized by the Industrial Management Science Students&apos; Association (IMSSA), University of Kelaniya
          <br />
          in partnership with Alibaba Cloud.
        </p>

        <div className="footer-logos">
          <span className="logo-item" title="Alibaba Cloud" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/alibaba-cloud-logo.png" alt="Alibaba Cloud" style={{ height: 18, width: 'auto', display: 'block' }} />
          </span>

          <div className="logo-separator"></div>

          <span className="logo-item" title="AI@IM" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/AI@IM.png" alt="AI@IM" style={{ height: 75, width: 'auto', display: 'block' }} />
          </span>

          <div className="mobile-break" style={{ flexBasis: '100%', height: 0, display: 'none' }}></div>
          <div className="logo-separator mobile-hide-separator"></div>

          <span className="logo-item" title="Department of Industrial Management" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/mit-it-logo.png" alt="MIT & IT Degree Programmes" style={{ height: 35, width: 'auto', display: 'block' }} />
          </span>

          <div className="logo-separator"></div>

          <span className="logo-item" title="IMSSA" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/imssa-logo.png" alt="IMSSA" style={{ height: 38, width: 'auto', display: 'block' }} />
          </span>

          <div className="logo-separator"></div>

          <span className="logo-item" title="University of Kelaniya" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/uok-crest.png" alt="University of Kelaniya" style={{ height: 38, width: 'auto', display: 'block' }} />
          </span>
        </div>

        <p className="footer-credits">
          &copy; 2026 AI Build-athon. Powered by Alibaba Cloud International. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
