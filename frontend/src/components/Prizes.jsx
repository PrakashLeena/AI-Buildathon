import React from 'react';

export default function Prizes() {
  return (
    <section className="prizes" id="prizes">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }} className="reveal">
        <span className="section-label">Rewards</span>
        <h2 className="section-title">Prizes & Global Certification</h2>
      </div>

      <div className="prizes-grid">
        {/* 2nd Place */}
        <div className="prize-card reveal stagger-2">
          <div>
            <div className="prize-rank-circle rank-2nd">2nd</div>
            <h3 className="prize-name">1st Runner&apos;s Up</h3>
            <p className="prize-sub">Second Place Overall</p>
          </div>
          <div>
            <div className="prize-value">$800</div>
            <ul className="prize-benefits">
              <li>Alibaba Cloud Certificate</li>
              <li>Cloud platform credits</li>
            </ul>
          </div>
        </div>

        {/* 1st Place (Featured) */}
        <div className="prize-card champion reveal stagger-1">
          <div>
            <div className="prize-rank-circle rank-1st">1st</div>
            <h3 className="prize-name">Grand Prize</h3>
            <p className="prize-sub">Winner Overall</p>
          </div>
          <div>
            <div className="prize-value" style={{ fontSize: '2.6rem' }}>$1000</div>
            <ul className="prize-benefits">
              <li>Alibaba Cloud Official Certificate</li>
              <li>Direct showcase to Alibaba Cloud International</li>
              <li>Internship and project grant pathways</li>
            </ul>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="prize-card reveal stagger-3">
          <div>
            <div className="prize-rank-circle rank-3rd">3rd</div>
            <h3 className="prize-name">2nd Runner&apos;s Up</h3>
            <p className="prize-sub">Third Place Overall</p>
          </div>
          <div>
            <div className="prize-value">$500</div>
            <ul className="prize-benefits">
              <li>Alibaba Cloud Certificate</li>
              <li>Cloud platform credits</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
