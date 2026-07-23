import React, { useRef } from 'react';
import useTimelineScroll from '../hooks/useTimelineScroll.js';
import { timelineItems } from '../data/timelineItems.js';

export default function Timeline({ techContainerRef }) {
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const laserTailRef = useRef(null);

  useTimelineScroll({ containerRef, progressRef, laserTailRef, techContainerRef });

  return (
    <section className="roadmap" id="timeline">
      <div style={{ maxWidth: 800, marginBottom: '4rem' }} className="reveal">
        <span className="section-label">Timeline</span>
        <h2 className="section-title">Three-Week Roadmap & Key Dates</h2>
      </div>

      <div className="timeline-container" ref={containerRef}>
        <div className="timeline-bar">
          <div className="timeline-progress" id="timelineProgress" ref={progressRef}>
            <div className="timeline-progress-laser" id="timelineLaser">
              <div className="timeline-laser-tail" id="timelineLaserTail" ref={laserTailRef}></div>
              <div className="timeline-laser-core"></div>
            </div>
          </div>
        </div>

        {timelineItems.map((item) => (
          <div className="timeline-item reveal" data-phase={item.phase} key={item.phase}>
            <div className="timeline-dot-wrapper">
              <span className="timeline-phase">{item.phase}</span>
              <div className="timeline-dot"></div>
            </div>
            <div className="timeline-content">
              <div
                className="timeline-content-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}
              >
                <div className="timeline-date" style={{ marginBottom: 0 }}>{item.date}</div>
                <div
                  className="tech-status"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--text-muted)' }}
                >
                  [ STATUS: INACTIVE ]
                </div>
              </div>
              <h3 className="timeline-title">{item.title}</h3>
              <ul className="timeline-details">
                {item.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
