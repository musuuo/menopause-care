// 정보 카드 내용은 src/content/*.md 파일에 있다. 파일 이름 순서대로 보여 준다.
// 형식: 첫 줄 <!-- icon: 🌸 -->, 다음 "# 제목", 그 뒤 본문(## 소제목, - 목록, **굵게**)
const files = import.meta.glob('./content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface InfoCard {
  id: string;
  icon: string;
  title: string;
  body: string;
}

export const INFO_CARDS: InfoCard[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, raw]) => {
    const id = path.replace(/^.*\//, '').replace(/\.md$/, '');
    const icon = raw.match(/<!--\s*icon:\s*(.+?)\s*-->/)?.[1] ?? '📄';
    const title = raw.match(/^#\s+(.+)$/m)?.[1] ?? id;
    const body = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^#\s+.+$/m, '').trim();
    return { id, icon, title, body };
  });
