import { navigate } from '../router';
import { WARNING_TEXT, type Warning } from '../logic/warnings';

export function WarningCards({ warnings, onDismiss }: { warnings: Warning[]; onDismiss: (w: Warning) => void }) {
  if (!warnings.length) return null;
  return (
    <div className="warning-list">
      {warnings.map((w) => {
        const t = WARNING_TEXT[w.kind];
        return (
          <section key={`${w.kind}-${w.start}`} className="warning-card" aria-label="병원 방문 안내">
            <h2>
              <span aria-hidden="true">💗 </span>
              {t.title}
            </h2>
            <p>{t.body}</p>
            <div className="warning-buttons">
              <button className="btn btn-secondary btn-small" onClick={() => navigate('/info/07-hospital-signs')}>
                자세히 보기
              </button>
              <button className="btn btn-primary btn-small" onClick={() => onDismiss(w)}>
                알겠어요
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
