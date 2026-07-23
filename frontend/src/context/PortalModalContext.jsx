import React, { createContext, useCallback, useContext, useState } from 'react';

const PortalModalContext = createContext(null);

export function PortalModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
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
