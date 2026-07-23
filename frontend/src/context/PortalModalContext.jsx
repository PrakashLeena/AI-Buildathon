import React, { createContext, useCallback, useContext, useState } from 'react';

const PortalModalContext = createContext(null);

export function PortalModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
    // Lenis animates scroll via JS on wheel/touch events regardless of body
    // overflow, so without stopping it explicitly, scrolling inside the
    // modal on desktop would scroll the page behind it instead.
    window.__lenis?.stop();
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
    window.__lenis?.start();
  }, []);

  return (
    <PortalModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </PortalModalContext.Provider>
  );
}

export function usePortalModal() {
  const ctx = useContext(PortalModalContext);
  if (!ctx) throw new Error('usePortalModal must be used within a PortalModalProvider');
  return ctx;
}
