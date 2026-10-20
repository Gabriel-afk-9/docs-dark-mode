import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(rootDir, 'assets', 'icons');
const SIZES = [16, 32, 48, 128];

const BACKGROUND = [0x21, 0x24, 0x28];
const CRESCENT = [0xe8, 0xea, 0xed];
const SAMPLES = 3;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(px, py, size, radius) {
  const clampedX = Math.min(Math.max(px, radius), size - radius);
  const clampedY = Math.min(Math.max(py, radius), size - radius);
  const dx = px - clampedX;
  const dy = py - clampedY;
  return dx * dx + dy * dy <= radius * radius;
}

function insideDisc(u, v, centerU, centerV, radius) {
  const du = u - centerU;
  const dv = v - centerV;
  return du * du + dv * dv <= radius * radius;
}

function isCrescent(u, v) {
  const onDisc = insideDisc(u, v, 0.46, 0.48, 0.3);
  const onCut = insideDisc(u, v, 0.6, 0.4, 0.28);
  return onDisc && !onCut;
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let alphaSum = 0;
      let red = 0;
      let green = 0;
      let blue = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (!insideRoundedRect(px, py, size, radius)) {
            continue;
          }
          const u = px / size;
          const v = py / size;
          const moon = isCrescent(u, v) ? 1 : 0;
          red += BACKGROUND[0] * (1 - moon) + CRESCENT[0] * moon;
          green += BACKGROUND[1] * (1 - moon) + CRESCENT[1] * moon;
          blue += BACKGROUND[2] * (1 - moon) + CRESCENT[2] * moon;
          alphaSum += 1;
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (y * size + x) * 4;
      if (alphaSum === 0) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 0;
        continue;
      }
      rgba[offset] = Math.round(red / alphaSum);
      rgba[offset + 1] = Math.round(green / alphaSum);
      rgba[offset + 2] = Math.round(blue / alphaSum);
      rgba[offset + 3] = Math.round((alphaSum / total) * 255);
    }
  }

  return encodePng(size, size, rgba);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  for (const size of SIZES) {
    const filePath = path.join(iconsDir, `icon-${size}.png`);
    await writeFile(filePath, renderIcon(size));
    console.log(`Ícone gerado: ${path.relative(rootDir, filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
