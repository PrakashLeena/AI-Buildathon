import React, { useRef } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import Toolkit from './components/Toolkit.jsx';
import Timeline from './components/Timeline.jsx';
import Prizes from './components/Prizes.jsx';
import Footer from './components/Footer.jsx';
import RegisterModal from './components/RegisterModal.jsx';
import { PortalModalProvider } from './context/PortalModalContext.jsx';
import useLenisSmoothScroll from './hooks/useLenisSmoothScroll.js';
import useRevealOnScroll from './hooks/useRevealOnScroll.js';

export default function App() {
  const techContainerRef = useRef(null);

  useLenisSmoothScroll();
  useRevealOnScroll();

  return (
    <PortalModalProvider>
      <div className="glow-bg"></div>
      <div className="grid-overlay"></div>

      <Header />
      <Hero />
      <About techContainerRef={techContainerRef} />
      <Toolkit />
      <Timeline techContainerRef={techContainerRef} />
      <Prizes />
      <RegisterModal />
      <Footer />
    </PortalModalProvider>
  );
}
