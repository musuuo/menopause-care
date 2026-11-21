import { INFO_CARDS } from '../content';
import { MedicalNotice, PageHeader } from '../components/Common';
import { Markdown } from '../components/Markdown';
import { navigate } from '../router';

export function Info({ id }: { id?: string }) {
  const card = id ? INFO_CARDS.find((c) => c.id === id) : undefined;

  if (card) {
    return (
      <div className="page">
        <PageHeader title={card.title} onBack={() => navigate('/info')} />
        <article className="info-article">
          <Markdown text={card.body} />
        </article>
        <MedicalNotice />
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/info')}>
          다른 이야기 보기
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="쉬운 정보" />
      <p className="hint">궁금한 이야기를 눌러 보세요.</p>
      <ul className="info-list">
        {INFO_CARDS.map((c) => (
          <li key={c.id}>
            <button className="info-item" onClick={() => navigate(`/info/${c.id}`)}>
              <span className="info-icon" aria-hidden="true">{c.icon}</span>
              <span className="info-title">{c.title}</span>
              <span className="chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
      <MedicalNotice />
    </div>
  );
}
