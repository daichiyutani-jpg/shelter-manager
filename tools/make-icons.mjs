// アプリアイコンを独自に生成する（外部素材・外部ライブラリなし）。
// デザイン：深緑の角丸背景に、白い屋根と建物、オレンジの扉。
// 使い方: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [31, 111, 104];
const WHITE = [255, 255, 255];
const ORANGE = [240, 140, 50];

function pixel(u, v) {
  // u, v は 0〜1 の座標
  const r = 0.18; // 角丸
  const cx = Math.min(Math.max(u, r), 1 - r);
  const cy = Math.min(Math.max(v, r), 1 - r);
  if ((u - cx) ** 2 + (v - cy) ** 2 > r * r) return null; // 透明
  // 屋根（三角形）
  if (v >= 0.2 && v <= 0.45 && Math.abs(u - 0.5) <= (v - 0.2) * 1.4) return WHITE;
  // 建物
  if (v > 0.45 && v <= 0.8 && u >= 0.27 && u <= 0.73) {
    if (u >= 0.43 && u <= 0.57 && v >= 0.58) return ORANGE; // 扉
    return WHITE;
  }
  return BG;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
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

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const p = pixel((x + 0.5) / size, (y + 0.5) / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      if (p) { raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = 255; }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="18" fill="rgb(${BG})"/>
<polygon points="50,20 85,45 15,45" fill="#fff"/>
<rect x="27" y="45" width="46" height="35" fill="#fff"/>
<rect x="43" y="58" width="14" height="22" fill="rgb(${ORANGE})"/>
</svg>
`;

const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('icon-192.png', dir), png(192));
writeFileSync(new URL('icon-512.png', dir), png(512));
writeFileSync(new URL('icon.svg', dir), svg);
console.log('icons/ に icon-192.png, icon-512.png, icon.svg を生成しました');
