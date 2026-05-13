import React, { useEffect, useRef, useState } from 'react';
import './PresetDropdown.css';

/**
 * PresetDropdown — custom dropdown med dark popover.
 * Native <select> viser OS-tema for popoveren (hvit på Mac), så vi bygger eget.
 */
export default function PresetDropdown({
  value,
  options,
  onChange,
  placeholder = 'Velg…',
  testId,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options[value];

  return (
    <div className="pdd-wrap" ref={wrapRef} data-testid={testId}>
      <button
        type="button"
        className={`pdd-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="pdd-label">{selected?.name || placeholder}</span>
        <span className="pdd-chev" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="pdd-popover" role="listbox">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              role="option"
              aria-selected={idx === value}
              className={`pdd-item ${idx === value ? 'active' : ''}`}
              onClick={() => {
                onChange(idx);
                setOpen(false);
              }}
              data-testid={testId ? `${testId}-option-${idx}` : undefined}
            >
              <span className="pdd-check">{idx === value ? '✓' : ''}</span>
              <span className="pdd-item-label">{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
