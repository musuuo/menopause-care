import { formatShort, addDays } from '../date';
import { LEVEL_LABELS } from '../defaults';

// 색만으로 구분하지 않도록 선 모양과 점 모양도 다르게 한다.
export const SERIES_STYLES = [
  { color: '#B23A5B', dash: '', marker: 'circle', markerLabel: '●' },
  { color: '#1F5FA8', dash: '8 5', marker: 'square', markerLabel: '■' },
  { color: '#2E7031', dash: '2 4', marker: 'triangle', markerLabel: '▲' },
] as const;

const W = 340;
const H = 210;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 30;

function Marker({ x, y, kind, color }: { x: number; y: number; kind: string; color: string }) {
  if (kind === 'square') return <rect x={x - 4} y={y - 4} width={8} height={8} fill={color} />;
  if (kind === 'triangle') return <polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill={color} />;
  return <circle cx={x} cy={y} r={4} fill={color} />;
}

export function LineChart({
  series,
  start,
  end,
}: {
  series: { name: string; values: (number | null)[] }[];
  start: string;
  end: string;
}) {
  const n = series[0]?.values.length ?? 0;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - (v / 3) * plotH;
  const showMarkers = n <= 31;
  const midKey = addDays(start, Math.floor((n - 1) / 2));
  const hasAny = series.some((s) => s.values.some((v) => v !== null));

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${formatShort(start)}부터 ${formatShort(end)}까지 증상 그래프`}>
        {[0, 1, 2, 3].map((lv) => (
          <g key={lv}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(lv)} y2={y(lv)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(lv) + 5} textAnchor="end" fontSize="13" fill="var(--text-muted)">
              {LEVEL_LABELS[lv]}
            </text>
          </g>
        ))}
        <text x={PAD_L} y={H - 8} fontSize="13" fill="var(--text-muted)">{formatShort(start)}</text>
        <text x={PAD_L + plotW / 2} y={H - 8} fontSize="13" textAnchor="middle" fill="var(--text-muted)">{formatShort(midKey)}</text>
        <text x={W - PAD_R} y={H - 8} fontSize="13" textAnchor="end" fill="var(--text-muted)">{formatShort(end)}</text>

        {series.map((s, si) => {
          const st = SERIES_STYLES[si % SERIES_STYLES.length];
          let d = '';
          let pen = false;
          s.values.forEach((v, i) => {
            if (v === null) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
            pen = true;
          });
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={st.color} strokeWidth={3} strokeDasharray={st.dash} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => {
                if (v === null) return null;
                const isolated = (s.values[i - 1] ?? null) === null && (s.values[i + 1] ?? null) === null;
                return showMarkers || isolated ? <Marker key={i} x={x(i)} y={y(v)} kind={st.marker} color={st.color} /> : null;
              })}
            </g>
          );
        })}
        {!hasAny && (
          <text x={PAD_L + plotW / 2} y={PAD_T + plotH / 2} textAnchor="middle" fontSize="15" fill="var(--text-muted)">
            이 기간에는 기록이 없어요
          </text>
        )}
      </svg>
      {series.length > 0 && (
        <figcaption className="chart-legend">
          {series.map((s, si) => {
            const st = SERIES_STYLES[si % SERIES_STYLES.length];
            return (
              <span key={s.name} className="legend-item">
                <svg width="34" height="14" aria-hidden="true">
                  <line x1="2" x2="32" y1="7" y2="7" stroke={st.color} strokeWidth="3" strokeDasharray={st.dash} />
                  <Marker x={17} y={7} kind={st.marker} color={st.color} />
                </svg>
                {s.name}
              </span>
            );
          })}
        </figcaption>
      )}
    </figure>
  );
}
