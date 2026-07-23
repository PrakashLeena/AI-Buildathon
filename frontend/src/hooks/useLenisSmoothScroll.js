import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Initializes Lenis smooth scrolling and wires up smooth-scroll for all
 * in-page anchor links (offset for the floating navbar), matching the
 * original vanilla implementation. Attaches the Lenis instance to
 * `window.__lenis` so other hooks (timeline scroll) can listen to its
 * 'scroll' event exactly like the original app.js did.
 */
export default function useLenisSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      infinite: false
    });

    window.__lenis = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const anchors = document.querySelectorAll('a[href^="#"]');
    const handleClick = function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        lenis.scrollTo(target, {
          offset: -80,
          duration: 1.2
        });
      }
    };

    anchors.forEach((anchor) => anchor.addEventListener('click', handleClick));

    return () => {
      anchors.forEach((anchor) => anchor.removeEventListener('click', handleClick));
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
}
