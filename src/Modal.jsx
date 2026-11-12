import { useEffect } from 'react';
import { motion } from 'framer-motion';

// A popup sheet. Closes on the X, a tap outside, or the Escape key.
// Pass onConfirm to show a check mark (save) beside the X.
export default function Modal({ title, onClose, onConfirm, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      >
        <header className="sheet-head">
          <h2>{title}</h2>
          {onConfirm && (
            <button className="sheet-close sheet-save" aria-label="Save" onClick={onConfirm}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </button>
          )}
          <button className="sheet-close" aria-label="Close" onClick={onClose} autoFocus>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}
