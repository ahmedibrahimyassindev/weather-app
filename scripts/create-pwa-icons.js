const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function makeIcon(size) {
  const scale = size / 512;
  const rowBytes = size * 4 + 1;
  const pixels = Buffer.alloc(rowBytes * size);
  const circles = [[180, 330, 84], [268, 286, 112], [370, 335, 82]];

  for (let y = 0; y < size; y++) {
    const py = y / scale;
    const row = y * rowBytes;
    pixels[row] = 0;
    for (let x = 0; x < size; x++) {
      const px = x / scale;
      const i = row + 1 + x * 4;
      const sky = py / 512;
      let color = [Math.round(15 + 12 * sky), Math.round(29 + 17 * sky), Math.round(57 + 30 * sky)];
      const dx = px - 337;
      const dy = py - 181;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const rayAngle = Math.atan2(Math.sin(angle * 12), Math.cos(angle * 12)) / 12;
      const onRay = Math.abs(rayAngle) < 0.055 && radius >= 95 && radius <= 124;
      if (radius < 91 || onRay) {
        const glow = Math.max(0, Math.min(1, 1 - Math.max(0, radius - 75) / 50));
        color = [255, Math.round(177 + 28 * glow), Math.round(39 + 25 * glow)];
      }

      const inCloud = (px > 126 && px < 413 && py > 309 && py < 394)
        || circles.some(([cx, cy, r]) => ((px - cx) ** 2 + (py - cy) ** 2) < r ** 2);
      if (inCloud) {
        const t = Math.max(0, Math.min(1, (py - 205) / 225));
        color = [Math.round(235 - 58 * t), Math.round(246 - 42 * t), Math.round(255 - 15 * t)];
      }

      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const output = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(output, { recursive: true });
for (const size of [180, 192, 512]) fs.writeFileSync(path.join(output, `icon-${size}.png`), makeIcon(size));
