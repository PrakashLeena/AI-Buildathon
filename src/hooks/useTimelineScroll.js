import { useEffect } from 'react';

/**
 * Scroll-driven timeline progress bar + glowing "laser" tracker + active
 * item states, ported 1:1 from the original app.js. Also mirrors the
 * (currently hidden-via-CSS) about-section tech container rotation.
 */
export default function useTimelineScroll({ containerRef, progressRef, laserTailRef, techContainerRef }) {
  useEffect(() => {
    const timelineContainer = containerRef.current;
    const timelineProgress = progressRef.current;
    const timelineLaserTail = laserTailRef.current;
    if (!timelineContainer || !timelineProgress) return;

    const timelineItems = timelineContainer.querySelectorAll('.timeline-item');

    let lastScrollY = window.scrollY;
    let lastScrollTimeVal = Date.now();
    let targetTailHeight = 0;
    let currentTailHeight = 0;
    let animationFrameId = null;
    let scrollFrameId = null;

    const updateTailPhysics = () => {
      if (Date.now() - lastScrollTimeVal > 80) {
        targetTailHeight = 0;
      }

      currentTailHeight += (targetTailHeight - currentTailHeight) * 0.15;

      if (timelineLaserTail) {
        timelineLaserTail.style.height = `${currentTailHeight}px`;

        if (currentTailHeight > 1.5) {
          timelineLaserTail.style.opacity = Math.min(0.2 + currentTailHeight / 80, 0.95);
        } else {
          timelineLaserTail.style.opacity = 0;
        }
      }

      if (Math.abs(targetTailHeight - currentTailHeight) > 0.1 || currentTailHeight > 0.5) {
        animationFrameId = requestAnimationFrame(updateTailPhysics);
      } else {
        currentTailHeight = 0;
        if (timelineLaserTail) {
          timelineLaserTail.style.height = '0px';
          timelineLaserTail.style.opacity = 0;
        }
        animationFrameId = null;
      }
    };

    const handleTimelineScroll = () => {
      const containerRect = timelineContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const triggerPoint = viewportHeight * 0.6;

      // ── Snap bar track to span exactly first→last circle center ──────────
      const barEl = timelineContainer.querySelector('.timeline-bar');
      if (barEl && timelineItems.length > 0) {
        const firstCircle = timelineItems[0].querySelector('.timeline-phase');
        const lastCircle = timelineItems[timelineItems.length - 1].querySelector('.timeline-phase');
        if (firstCircle && lastCircle) {
          const firstRect = firstCircle.getBoundingClientRect();
          const lastRect  = lastCircle.getBoundingClientRect();
          const firstMid  = firstRect.top + firstRect.height / 2 - containerRect.top;
          const lastMid   = lastRect.top  + lastRect.height  / 2 - containerRect.top;
          barEl.style.top    = firstMid + 'px';
          barEl.style.bottom = (containerRect.height - lastMid) + 'px';
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      let totalHeight = containerRect.height;
      if (timelineItems.length > 0) {
        const lastItem = timelineItems[timelineItems.length - 1];
        const lastItemCircle = lastItem.querySelector('.timeline-phase');
        if (lastItemCircle) {
          const lastItemCircleRect = lastItemCircle.getBoundingClientRect();
          const offset = containerRect.bottom - lastItemCircleRect.bottom + lastItemCircleRect.height / 2;
          totalHeight -= offset;
        }
      }

      const scrolledDistance = triggerPoint - containerRect.top;
      let scrollPercent = scrolledDistance / totalHeight;
      scrollPercent = Math.min(Math.max(scrollPercent, 0), 1);

      timelineProgress.style.height = scrollPercent * 100 + '%';

      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const distance = Math.abs(currentScrollY - lastScrollY);
      const timeDiff = currentTime - lastScrollTimeVal;

      if (timeDiff > 0 && distance > 0) {
        const speed = distance / timeDiff;
        targetTailHeight = Math.min(speed * 90, 140);

        lastScrollTimeVal = currentTime;

        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(updateTailPhysics);
        }
      }

      lastScrollY = currentScrollY;

      timelineItems.forEach((item) => {
        const circle = item.querySelector('.timeline-phase');
        if (!circle) return;

        const circleRect = circle.getBoundingClientRect();
        const circleMidY = circleRect.top + circleRect.height / 2;

        if (circleMidY <= triggerPoint) {
          if (!item.classList.contains('active-timeline')) {
            item.classList.add('active-timeline');
          }
        } else if (item.classList.contains('active-timeline')) {
          item.classList.remove('active-timeline');
        }
      });
    };

    const handleScrollInteractions = () => {
      handleTimelineScroll();

      const techContainer = techContainerRef?.current;
      if (techContainer) {
        const rotation = window.scrollY * 0.06;
        const scale = 1 + Math.sin(window.scrollY * 0.002) * 0.02;
        techContainer.style.transform = `rotate(${rotation}deg) scale(${scale})`;
      }
    };

    // Native scroll, touch input, and Lenis can all emit during the same
    // rendered frame. Collapse them into one layout/read-write pass to avoid
    // repeated getBoundingClientRect calls and mobile scroll jank.
    const requestScrollUpdate = () => {
      if (scrollFrameId !== null) return;

      scrollFrameId = requestAnimationFrame(() => {
        scrollFrameId = null;
        handleScrollInteractions();
      });
    };

    window.addEventListener('scroll', requestScrollUpdate, { passive: true });

    // Lenis may initialize slightly after this effect (child effects run
    // before the parent's Lenis-init effect), so attach lazily too.
    const attachLenisListener = () => window.__lenis?.on('scroll', requestScrollUpdate);
    attachLenisListener();
    const lenisAttachTimer = setTimeout(attachLenisListener, 50);

    handleScrollInteractions();

    return () => {
      window.removeEventListener('scroll', requestScrollUpdate);
      window.__lenis?.off('scroll', requestScrollUpdate);
      clearTimeout(lenisAttachTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
    };
  }, [containerRef, progressRef, laserTailRef, techContainerRef]);
}
