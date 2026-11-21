import type { ReactNode } from 'react';

/** **굵게**만 처리 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

/** 아주 단순한 마크다운: ## 소제목, - 목록, 빈 줄로 문단 구분 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="md">
      {blocks.map((b, i) => {
        if (b.startsWith('## ')) return <h2 key={i}>{inline(b.slice(3))}</h2>;
        const lines = b.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => <li key={j}>{inline(l.trim().slice(2))}</li>)}
            </ul>
          );
        }
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}
