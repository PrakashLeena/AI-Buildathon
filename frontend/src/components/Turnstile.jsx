import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Site key is safe to expose to the browser (it's public by design, like a
// reCAPTCHA site key) - the secret key stays server-only (see backend/.env).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

/**
 * Thin wrapper around Cloudflare Turnstile's imperative JS API
 * (window.turnstile), loaded globally via the <script> tag in index.html.
 *
 * Renders explicitly (rather than relying on Turnstile's auto-render-on-scan
 * behavior) so we fully control mount/unmount timing - important here since
 * the registration modal can be opened, closed and reopened without a full
 * page reload, and a stale/expired widget must not silently linger.
 *
 * Exposes `reset()` via ref so the parent form can clear a spent/expired
 * token and force the user to re-verify (e.g. after a failed submit).
 */
const Turnstile = forwardRef(function Turnstile({ onVerify, onExpire }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  }));

  useEffect(() => {
    if (!SITE_KEY) {
      console.error('[Turnstile] VITE_TURNSTILE_SITE_KEY is not set - CAPTCHA cannot render.');
      return;
    }

    let cancelled = false;

    // The api.js script tag is async, so window.turnstile may not exist yet
    // on first render - poll briefly until it's ready.
    const tryRender = () => {
      if (cancelled || !containerRef.current) return;
      if (!window.turnstile) {
        setTimeout(tryRender, 100);
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify?.(token),
        'expired-callback': () => onExpire?.(),
        'error-callback': () => onExpire?.()
      });
    };
    tryRender();

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="turnstile-widget" />;
});

export default Turnstile;
