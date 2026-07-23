import React, { useEffect, useRef, useState } from 'react';
import useHeaderScroll from '../hooks/useHeaderScroll.js';

export default function Header() {
  const scrolled = useHeaderScroll();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        navRef.current &&
        btnRef.current &&
        !navRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <header className={scrolled ? 'scrolled' : ''}>
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center' }}>
        <a href="#" className="event-logo" aria-label="AI Buildathon Logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/assets/event-logo.png" alt="AI Buildathon" style={{ height: 38, width: 'auto', display: 'block' }} />
        </a>
      </div>
      <ul className={`nav-links${menuOpen ? ' active' : ''}`} ref={navRef}>
        <li>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        </li>
        <li>
          <a href="#tools" onClick={() => setMenuOpen(false)}>Toolkit</a>
        </li>
        <li>
          <a href="#timeline" onClick={() => setMenuOpen(false)}>Timeline</a>
        </li>
        <li>
          <a href="#prizes" onClick={() => setMenuOpen(false)}>Prizes</a>
        </li>
      </ul>
      <div
        className="menu-btn"
        id="mobileMenuBtn"
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>
    </header>
  );
}
