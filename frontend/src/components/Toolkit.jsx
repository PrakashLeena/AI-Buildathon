import React from 'react';

export default function Toolkit() {
  return (
    <section className="toolkit" id="tools">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }} className="reveal">
        <span className="section-label">Resources</span>
        <h2 className="section-title">The three developer tools you will master</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          Leverage official Alibaba Cloud developer suites to write code, design agent actions, and compile API endpoints.
        </p>
      </div>

      <div className="toolkit-grid">
        {/* Qoder Card */}
        <div className="tool-card reveal stagger-1">
          <div className="tool-header">
            <div className="tool-badge-circle">Q</div>
            <div className="tool-header-info">
              <h3>Qoder</h3>
              <span>Agentic IDE</span>
            </div>
          </div>
          <div
            className="tool-preview-svg"
            style={{
              height: 120,
              background: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid var(--border-glass)',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <svg viewBox="0 0 240 100" width="100%" height="100%">
              <rect x="10" y="5" width="220" height="90" rx="4" fill="var(--bg-dark-secondary)" stroke="var(--border-glass)" strokeWidth="1.2" />
              <circle cx="24" cy="18" r="3" fill="#ff5f56" />
              <circle cx="34" cy="18" r="3" fill="#ffbd2e" />
              <circle cx="44" cy="18" r="3" fill="#27c93f" />
              <rect x="20" y="32" width="60" height="6" rx="2" fill="var(--text-muted)" opacity="0.4" />
              <rect x="20" y="44" width="120" height="6" rx="2" fill="var(--primary-orange)" opacity="0.8" />
              <rect x="35" y="56" width="90" height="6" rx="2" fill="var(--text-secondary)" opacity="0.6" />
              <rect x="35" y="68" width="130" height="6" rx="2" fill="var(--primary-orange)" />
              <rect x="20" y="80" width="40" height="6" rx="2" fill="var(--text-muted)" opacity="0.4" />
              <g transform="translate(180, 68)">
                <path d="M 0,-8 L 2,-2 L 8,0 L 2,2 L 0,8 L -2,2 L -8,0 L -2,-2 Z" fill="var(--primary-orange)" />
                <circle cx="0" cy="0" r="14" stroke="var(--primary-orange)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              </g>
            </svg>
          </div>
          <div className="tool-body">
            <p>
              An AI-native developer portal, CLI interface, and JetBrains utility. Write, refactor, and test applications
              securely using Quest Mode, Experts engine, and spec-driven structures.
            </p>
            <div className="tool-footer-tag">Real Software Development</div>
          </div>
        </div>

        {/* QoderWork Card */}
        <div className="tool-card reveal stagger-2">
          <div className="tool-header">
            <div className="tool-badge-circle">QW</div>
            <div className="tool-header-info">
              <h3>QoderWork</h3>
              <span>Desktop AI Agent</span>
            </div>
          </div>
          <div
            className="tool-preview-svg"
            style={{
              height: 120,
              background: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid var(--border-glass)',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <svg viewBox="0 0 240 100" width="100%" height="100%">
              <g transform="translate(15, 15)">
                <rect x="0" y="15" width="50" height="30" rx="3" fill="var(--bg-dark-secondary)" stroke="var(--primary-orange)" strokeWidth="1.5" />
                <text x="25" y="33" fontSize="7" fontWeight="700" fill="var(--text-primary)" textAnchor="middle" fontFamily="var(--font-heading)">TRIGGER</text>
                <path d="M 50 30 L 75 30" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 75 30 L 70 27 M 75 30 L 70 33" stroke="var(--text-muted)" strokeWidth="1.5" />

                <rect x="75" y="15" width="50" height="30" rx="3" fill="var(--bg-dark-secondary)" stroke="var(--text-primary)" strokeWidth="1.2" />
                <text x="100" y="33" fontSize="7" fontWeight="700" fill="var(--text-primary)" textAnchor="middle" fontFamily="var(--font-heading)">ACTION</text>
                <path d="M 125 30 L 150 30" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 150 30 L 145 27 M 150 30 L 145 33" stroke="var(--text-muted)" strokeWidth="1.5" />

                <rect x="150" y="15" width="55" height="30" rx="3" fill="var(--bg-dark-secondary)" stroke="var(--primary-orange)" strokeWidth="1.5" />
                <text x="177" y="33" fontSize="7" fontWeight="700" fill="var(--primary-orange)" textAnchor="middle" fontFamily="var(--font-heading)">RESOLVED</text>

                <path d="M 25 45 C 25 65, 177 65, 177 45" fill="none" stroke="var(--primary-orange)" strokeWidth="1.5" />
                <circle cx="101" cy="59" r="4" fill="var(--primary-orange)" />
              </g>
            </svg>
          </div>
          <div className="tool-body">
            <p>
              Automate desktop and code tasks on the fly. Plan, execute, edit files, script browsers, and coordinate
              modular workflows in an isolated sandbox tailored for multi-step task resolution.
            </p>
            <div className="tool-footer-tag">Provided to all Teams</div>
          </div>
        </div>

        {/* MuleRun Card */}
        <div className="tool-card reveal stagger-3">
          <div className="tool-header">
            <div className="tool-badge-circle">M</div>
            <div className="tool-header-info">
              <h3>MuleRun</h3>
              <span>AI Workflow Runtime</span>
            </div>
          </div>
          <div
            className="tool-preview-svg"
            style={{
              height: 120,
              background: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid var(--border-glass)',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <svg viewBox="0 0 240 100" width="100%" height="100%">
              <g transform="translate(30, 50)">
                <path d="M -30 0 A 30 30 0 0 1 30 0" fill="none" stroke="var(--text-muted)" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                <path d="M -30 0 A 30 30 0 0 1 10 -25" fill="none" stroke="var(--primary-orange)" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="8" y2="-20" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="0" cy="0" r="3" fill="var(--text-primary)" />
                <text x="0" y="18" fontSize="8" fontWeight="700" fill="var(--primary-orange)" textAnchor="middle" fontFamily="var(--font-heading)">98.5ms</text>
              </g>
              <g transform="translate(135, 15)">
                <rect x="0" y="5" width="70" height="15" rx="2" fill="var(--bg-dark-secondary)" stroke="var(--border-glass)" strokeWidth="1" />
                <circle cx="10" cy="12" r="2.5" fill="#27c93f" />
                <rect x="22" y="10" width="35" height="4" rx="1" fill="var(--text-muted)" opacity="0.5" />

                <rect x="0" y="25" width="70" height="15" rx="2" fill="var(--bg-dark-secondary)" stroke="var(--border-glass)" strokeWidth="1" />
                <circle cx="10" cy="32" r="2.5" fill="#27c93f" />
                <rect x="22" y="30" width="35" height="4" rx="1" fill="var(--text-muted)" opacity="0.5" />

                <rect x="0" y="45" width="70" height="15" rx="2" fill="var(--bg-dark-secondary)" stroke="var(--primary-orange)" strokeWidth="1.2" />
                <circle cx="10" cy="52" r="2.5" fill="var(--primary-orange)" />
                <rect x="22" y="50" width="35" height="4" rx="1" fill="var(--primary-orange)" opacity="0.8" />
              </g>
            </svg>
          </div>
          <div className="tool-body">
            <p>
              Instantly run, scale, and publish workflow networks. Connect complex APIs, models, databases, and structured
              inputs into robust, shareable environments.
            </p>
            <div className="tool-footer-tag">Cloud Credits Available</div>
          </div>
        </div>
      </div>
    </section>
  );
}
