import React, { useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import About from '../components/About.jsx';
import Toolkit from '../components/Toolkit.jsx';
import Timeline from '../components/Timeline.jsx';
import Prizes from '../components/Prizes.jsx';
import FinalCta from '../components/FinalCta.jsx';
import Footer from '../components/Footer.jsx';
import RegisterModal from '../components/RegisterModal.jsx';
import { PortalModalProvider } from '../context/PortalModalContext.jsx';
import useLenisSmoothScroll from '../hooks/useLenisSmoothScroll.js';
import useRevealOnScroll from '../hooks/useRevealOnScroll.js';

export default function Home() {
  const techContainerRef = useRef(null);

  useLenisSmoothScroll();
  useRevealOnScroll();

  return (
    <PortalModalProvider>
      <Head>
        <title>AI Buildathon | Alibaba Cloud & University of Kelaniya</title>
        <meta
          name="description"
          content="Official registration portal for the AI Build-athon 2026 co-organized by Alibaba Cloud International and University of Kelaniya (Department of Industrial Management). Form teams, build AI prototypes using Qoder, QoderWork & MuleRun, and win big."
        />
      </Head>
      <div className="glow-bg"></div>
      <div className="grid-overlay"></div>

      <Header />
      <Hero />
      <About techContainerRef={techContainerRef} />
      <Toolkit />
      <Timeline techContainerRef={techContainerRef} />
      <Prizes />
      <FinalCta />
      <RegisterModal />
      <Footer />
    </PortalModalProvider>
  );
}
