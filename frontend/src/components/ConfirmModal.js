import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import './ConfirmModal.css';

/**
 * Global confirm-modal med Promise-basert API.
 *
 * Bruk:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: '...', message: '...', confirmLabel: 'Slett' })) { ... }
 *
 * Wrap appen i <ConfirmProvider>.
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, cancelLabel, variant }
  const resolverRef = useRef(null);

  const confirm = useCallback((opts) => {
    setState({
      title: 'Er du sikker?',
      message: '',
      confirmLabel: 'Bekreft',
      cancelLabel: 'Avbryt',
      variant: 'primary',
      ...opts,
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handle = (value) => {
    if (resolverRef.current) resolverRef.current(value);
    resolverRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="cm-overlay" onClick={() => handle(false)} data-testid="confirm-modal-overlay">
          <div
            className="cm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="cm-title"
          >
            <h3 id="cm-title" className="cm-title">{state.title}</h3>
            {state.message && <p className="cm-message">{state.message}</p>}
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn-ghost"
                onClick={() => handle(false)}
                data-testid="confirm-cancel-btn"
                autoFocus
              >
                {state.cancelLabel}
              </button>
              <button
                className={`cm-btn cm-btn-${state.variant || 'primary'}`}
                onClick={() => handle(true)}
                data-testid="confirm-ok-btn"
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm må brukes innenfor <ConfirmProvider>');
  return ctx;
}
