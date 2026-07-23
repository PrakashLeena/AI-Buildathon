import { useEffect } from 'react';

/**
 * Apple-style scroll reveal system. Observes every element with the
 * `.reveal` class currently in the DOM and adds `.active` once it enters
 * the viewport, exactly like the original app.js IntersectionObserver.
 */
export default function useRevealOnScroll() {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));

    return () => revealObserver.disconnect();
  }, []);
}
