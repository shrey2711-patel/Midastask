const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Pure Node.js PNG encoder
function createSimplePNG(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte (0) per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Slight gradient
      const factor = 1 - (y / height) * 0.3;
      rawData[pxOffset] = Math.round(r * factor);
      rawData[pxOffset + 1] = Math.round(g * factor);
      rawData[pxOffset + 2] = Math.round(b * factor);
      rawData[pxOffset + 3] = a;
    }
  }

  const idatCompressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatCompressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Standard CRC32
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createIcoFromPng(pngBuffer, width = 256, height = 256) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width === 256 ? 0 : width, 0);   // width 0 = 256
  entry.writeUInt8(height === 256 ? 0 : height, 1); // height 0 = 256
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4);  // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);  // bytes in res
  entry.writeUInt32LE(6 + 16, 12);           // image offset

  return Buffer.concat([header, entry, pngBuffer]);
}

const iconsDir = path.join(__dirname, '..', 'dashboard', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PWA icons
const p192 = createSimplePNG(192, 192, 99, 102, 241);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);

const p512 = createSimplePNG(512, 512, 79, 70, 229);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);

const pApple = createSimplePNG(180, 180, 99, 102, 241);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pApple);

// Generate 256x256 Windows Icon
const widgetAssetsDir = path.join(__dirname, '..', 'desktop-widget', 'assets');
if (!fs.existsSync(widgetAssetsDir)) {
  fs.mkdirSync(widgetAssetsDir, { recursive: true });
}

const p256 = createSimplePNG(256, 256, 99, 102, 241);
fs.writeFileSync(path.join(widgetAssetsDir, 'icon.png'), p256);

const icoBuffer = createIcoFromPng(p256, 256, 256);
fs.writeFileSync(path.join(widgetAssetsDir, 'icon.ico'), icoBuffer);

console.log('Icons (including 256x256 Windows ICO) generated successfully.');
