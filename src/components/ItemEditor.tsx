import { useState } from 'react';
import type { ItemDef } from '../types';
import { useFeedback } from './Feedback';

/** 증상·습관 목록 편집: 숨기기, 순서 바꾸기, 직접 추가, 직접 추가한 것 지우기 */
export function ItemEditor({
  kind,
  defs,
  onChange,
  defaultIcon,
}: {
  kind: string;
  defs: ItemDef[];
  onChange: (d: ItemDef[]) => Promise<void>;
  defaultIcon: string;
}) {
  const { toast, confirm } = useFeedback();
  const [label, setLabel] = useState('');
  const sorted = [...defs].sort((a, b) => a.order - b.order);

  const save = (list: ItemDef[]) => onChange(list.map((d, i) => ({ ...d, order: i })));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const list = [...sorted];
    [list[i], list[j]] = [list[j], list[i]];
    void save(list);
  };

  const add = async () => {
    const name = label.trim();
    if (!name) return;
    if (sorted.some((d) => d.label === name)) {
      toast('이미 있는 이름이에요');
      return;
    }
    await save([...sorted, { id: `custom-${Date.now()}`, label: name, icon: defaultIcon, hidden: false, custom: true, order: sorted.length }]);
    setLabel('');
    toast(`'${name}'을(를) 추가했어요 ✓`);
  };

  const remove = async (d: ItemDef) => {
    const ok = await confirm({
      title: `'${d.label}'을(를) 목록에서 지울까요?`,
      message: '지금까지 기록한 내용은 지워지지 않아요.',
      okText: '지우기',
      cancelText: '그만두기',
      danger: true,
    });
    if (ok) await save(sorted.filter((x) => x.id !== d.id));
  };

  return (
    <div>
      <p className="hint">안 쓰는 {kind}은 '숨기기'를 누르면 화면에서 사라져요. 기록은 지워지지 않아요.</p>
      <ul className="editor-list">
        {sorted.map((d, i) => (
          <li key={d.id} className={`editor-item ${d.hidden ? 'is-hidden' : ''}`}>
            <span className="editor-label">
              <span aria-hidden="true">{d.icon} </span>
              {d.label}
              {d.hidden && <span className="tag">숨김</span>}
            </span>
            <span className="editor-actions">
              <button className="icon-btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${d.label} 위로`}>
                <span aria-hidden="true">▲</span>
              </button>
              <button className="icon-btn small" onClick={() => move(i, 1)} disabled={i === sorted.length - 1} aria-label={`${d.label} 아래로`}>
                <span aria-hidden="true">▼</span>
              </button>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => save(sorted.map((x) => (x.id === d.id ? { ...x, hidden: !x.hidden } : x)))}
                aria-label={`${d.label} ${d.hidden ? '보이기' : '숨기기'}`}
              >
                {d.hidden ? '보이기' : '숨기기'}
              </button>
              {d.custom && (
                <button className="btn btn-small btn-danger-outline" onClick={() => remove(d)} aria-label={`${d.label} 지우기`}>
                  지우기
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <h2>{kind} 직접 추가하기</h2>
      <div className="add-row">
        <input
          className="text-input"
          type="text"
          value={label}
          maxLength={20}
          placeholder={kind === '증상' ? '예: 어지러움' : '예: 스트레칭 10분'}
          aria-label={`추가할 ${kind} 이름`}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add} disabled={!label.trim()}>추가</button>
      </div>
    </div>
  );
}
