import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastState { id: number; message: string; undo?: () => void }
interface ConfirmOptions { title: string; message?: string; okText?: string; cancelText?: string; danger?: boolean }
interface ConfirmState extends ConfirmOptions { resolve: (ok: boolean) => void }

interface FeedbackApi {
  toast: (message: string, undo?: () => void) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

const TOAST_MS = 1500;
const TOAST_WITH_UNDO_MS = 4000; // 되돌리기 버튼을 누를 시간을 준다

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dialog, setDialog] = useState<ConfirmState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, undo });
    timer.current = window.setTimeout(() => setToast(null), undo ? TOAST_WITH_UNDO_MS : TOAST_MS);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast: showToast, confirm }}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                되돌리기
              </button>
            )}
          </div>
        )}
      </div>
      {dialog && <ConfirmDialog state={dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={() => onClose(false)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title">{state.title}</h2>
        {state.message && <p>{state.message}</p>}
        <div className="dialog-buttons">
          <button ref={cancelRef} className="btn btn-secondary" onClick={() => onClose(false)}>
            {state.cancelText ?? '아니요'}
          </button>
          <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onClose(true)}>
            {state.okText ?? '네'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useFeedback(): FeedbackApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('FeedbackProvider가 필요합니다');
  return v;
}
