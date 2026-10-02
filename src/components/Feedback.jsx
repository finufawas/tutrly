import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/*
  One popup system for the whole app.
  const { toast, confirm } = useFeedback();
  toast('Saved')                                  -> dark toast, auto-dismiss
  toast('Failed to save', 'error')                -> stays until closed
  const ok = await confirm({ title, message, tone, confirmText })            -> true / false
  const reason = await confirm({ ..., input: { type:'textarea', minWords:10 } }) -> string / null
  Desktop renders a centred dialog; ≤768px the same markup becomes a bottom sheet (ui.css).
  window.alert() is routed to toast() so older pages get the new look automatically.
*/

const FeedbackContext = createContext({ toast: () => {}, confirm: async () => false });
export const useFeedback = () => useContext(FeedbackContext);

const ICONS = { success: 'ri-check-line', error: 'ri-error-warning-line', warning: 'ri-time-line', info: 'ri-information-line' };
const TONE_ICON = { danger: 'ri-delete-bin-6-line', neutral: 'ri-question-line', warning: 'ri-alert-line' };

const guessType = (msg = '') => {
  const m = String(msg).toLowerCase();
  if (/fail|error|cannot|can't|not supported|denied/.test(m)) return 'error';
  if (/please|must|away|not provided/.test(m)) return 'warning';
  return 'success';
};
const wordCount = (s = '') => s.trim().split(/\s+/).filter(Boolean).length;

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  const toast = useCallback((message, type, opts = {}) => {
    const id = ++idRef.current;
    const kind = type || guessType(message);
    setToasts(t => [...t.slice(-2), { id, message, kind, title: opts.title }]);
    if (kind !== 'error') setTimeout(() => dismiss(id), opts.duration || 4000);
  }, [dismiss]);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setValue(opts.input?.initial || '');
    setDialog(opts);
  }), []);

  const close = (result) => {
    if (resolver.current) resolver.current(result);
    resolver.current = null;
    setDialog(null);
  };

  useEffect(() => {
    const original = window.alert;
    window.alert = (msg) => toast(String(msg));
    return () => { window.alert = original; };
  }, [toast]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => { if (e.key === 'Escape') close(dialog.input ? null : false); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [dialog]);

  const input = dialog?.input;
  const words = input?.minWords ? wordCount(value) : 0;
  const valid = !input
    || (input.minWords ? words >= input.minWords : true)
    && (input.mustEqual !== undefined ? value.trim() === String(input.mustEqual) : true)
    && (input.required ? value.trim().length > 0 : true);
  const tone = dialog?.tone || 'neutral';

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon"><i className={ICONS[t.kind] || ICONS.info}></i></span>
            <div className="toast-body">
              {t.title && <b>{t.title}</b>}
              <p>{t.message}</p>
            </div>
            <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss"><i className="ri-close-line"></i></button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(input ? null : false); }}>
          <div className={`dlg dlg-${tone}`} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
            <span className="dlg-grab"></span>
            {dialog.icon !== false && <span className={`dlg-icon tone-${tone}`}><i className={dialog.icon || TONE_ICON[tone]}></i></span>}
            <div>
              <h3 id="dlg-title">{dialog.title}</h3>
              {dialog.message && <p className="dlg-msg">{dialog.message}</p>}
            </div>
            {dialog.body}
            {input && (
              <div className="dlg-field">
                {input.label && <label className="field-label">{input.label}</label>}
                {input.type === 'textarea' ? (
                  <textarea autoFocus className="textarea" rows="3" value={value} placeholder={input.placeholder} onChange={(e) => setValue(e.target.value)}></textarea>
                ) : (
                  <input autoFocus className={`input ${input.mustEqual !== undefined && value && !valid ? 'invalid' : ''}`} type={input.type || 'text'} value={value} placeholder={input.placeholder} onChange={(e) => setValue(e.target.value)} />
                )}
                {input.minWords && (
                  <span className={words >= input.minWords ? 'count-ok' : 'count-bad'}>
                    {words >= input.minWords && <i className="ri-check-line"></i>} {words} / {input.minWords} words
                  </span>
                )}
              </div>
            )}
            <div className="dlg-actions">
              <button className="btn-soft" onClick={() => close(input ? null : false)}>{dialog.cancelText || 'Cancel'}</button>
              <button className={tone === 'danger' ? 'btn btn-danger-solid' : 'btn'} disabled={!valid} onClick={() => close(input ? value.trim() : true)}>
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
