// 외부 도구 없이 앱 아이콘 PNG를 만든다: 장밋빛 배경 위 흰 하트.
// 실행: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [168, 50, 79];
const FG = [255, 255, 255];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// 하트 안쪽인지: (x²+y²-1)³ - x²y³ ≤ 0
const inHeart = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;

function make(size, { maskable }) {
  const SS = 4; // 가장자리를 부드럽게 하려고 픽셀마다 4×4 표본
  const heartScale = maskable ? 0.2 : 0.25; // maskable은 안전 영역(가운데 80%) 안에
  const radius = maskable ? 0 : size * 0.22;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let fg = 0, cover = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS, y = py + (sy + 0.5) / SS;
        // 둥근 사각형 바깥은 투명
        const cx = Math.min(Math.max(x, radius), size - radius), cy = Math.min(Math.max(y, radius), size - radius);
        if (radius && (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue;
        cover++;
        const hx = (x - size / 2) / (size * heartScale);
        const hy = -(y - size * 0.52) / (size * heartScale);
        if (inHeart(hx * 1.0, hy * 1.0 + 0.05)) fg++;
      }
      const t = cover ? fg / cover : 0;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - t) + FG[i] * t);
      raw[o + 3] = Math.round((cover / (SS * SS)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', make(192, { maskable: false }));
writeFileSync('public/icon-512.png', make(512, { maskable: false }));
writeFileSync('public/icon-maskable-512.png', make(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', make(180, { maskable: true })); // iOS는 꽉 찬 사각형을 쓴다
console.log('아이콘을 만들었어요');
