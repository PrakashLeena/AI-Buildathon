import React, { useRef } from "react";
import useTimelineScroll from "../hooks/useTimelineScroll.js";
import { timelineItems } from "../data/timelineItems.js";

export default function Timeline({ techContainerRef }) {
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const laserTailRef = useRef(null);

  useTimelineScroll({
    containerRef,
    progressRef,
    laserTailRef,
    techContainerRef,
  });

  return (
    <section className="roadmap" id="timeline">
      <div
        style={{ maxWidth: 800, margin: "0 auto 3rem", textAlign: "center" }}
        className="reveal"
      >
        <span className="section-label">THE ROAD TO THE FINALS</span>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Your Buildathon Journey.
        </h2>
      </div>

      <div className="timeline-container" ref={containerRef}>
        <div className="timeline-bar">
          <div
            className="timeline-progress"
            id="timelineProgress"
            ref={progressRef}
          >
            <div className="timeline-progress-laser" id="timelineLaser">
              <div
                className="timeline-laser-tail"
                id="timelineLaserTail"
                ref={laserTailRef}
              ></div>
              <div className="timeline-laser-core"></div>
            </div>
          </div>
        </div>

        {timelineItems.map((item) => (
          <div
            className="timeline-item"
            data-phase={item.phase}
            key={item.phase}
          >
            <div className="timeline-dot-wrapper">
              <span className="timeline-phase">{item.phase}</span>
            </div>
            <div className="timeline-content reveal">
              <div
                className="timeline-content-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <div className="timeline-date" style={{ marginBottom: 0 }}>
                  {item.date}
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
