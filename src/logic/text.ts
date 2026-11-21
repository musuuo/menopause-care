/** 받침이 있으면 withFinal, 없으면 withoutFinal (예: 이/가, 은/는) */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return word + withFinal; // 한글이 아니면 받침 있는 쪽
  return word + (code % 28 ? withFinal : withoutFinal);
}

/** "얼굴 화끈거림(열감)" → "열감", 괄호가 없으면 그대로 */
export function shortLabel(label: string): string {
  const m = label.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : label;
}
