/**
 * Generates simple PNG launcher icons for all Android mipmap densities.
 * Uses only Node.js built-ins — no external dependencies.
 * Run with: node generate-icons.js
 *
 * This creates minimal but valid PNG files so Gradle does not fail with
 * "resource mipmap/ic_launcher not found" errors.
 * Replace with real icons before production release.
 */

const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 transparent PNG (can be any size — we scale via XML)
// We generate actual sized PNGs using raw PNG encoding (no canvas needed).

function createMinimalPng(width, height, r, g, b) {
  // Build a simple uncompressed PNG with a solid color
  const zlib = require('zlib');

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc);
    return Buffer.concat([len, typeBuffer, data, crcBuf]);
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = makeCrcTable();
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) | 0;
  }

  let crcTable = null;
  function makeCrcTable() {
    if (crcTable) return crcTable;
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    return crcTable;
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Raw pixel data: filter byte (0) + RGB * width, for each row
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const offset = rowStart + 1 + x * 3;
      raw[offset]     = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  const ihdr = chunk('IHDR', ihdrData);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const densities = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resBase = path.join(__dirname, 'app', 'src', 'main', 'res');

// Amber #F59E0B → R:245 G:158 B:11
const [r, g, b] = [245, 158, 11];

for (const { dir, size } of densities) {
  const dirPath = path.join(resBase, dir);
  fs.mkdirSync(dirPath, { recursive: true });

  const pngData = createMinimalPng(size, size, r, g, b);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), pngData);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), pngData);
  console.log(`✓ Generated ${dir}/ic_launcher.png (${size}x${size})`);
}

console.log('\nAll launcher icons generated.');
