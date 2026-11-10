import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    TABLE[n] = c >>> 0;
}

function crc32(buffer) {
    let c = 0xffffffff;
    for (let i = 0; i < buffer.length; i += 1)
        c = TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const name = Buffer.from(type);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
}

function png(size, paint) {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y += 1) {
        const row = y * (size * 4 + 1);
        raw[row] = 0;
        for (let x = 0; x < size; x += 1) {
            const [r, g, b, a] = paint(x, y, size);
            const index = row + 1 + x * 4;
            raw[index] = r;
            raw[index + 1] = g;
            raw[index + 2] = b;
            raw[index + 3] = a;
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size, 0);
    header.writeUInt32BE(size, 4);
    header[8] = 8;
    header[9] = 6;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

const INK = [248, 250, 252, 255];
const TILE = [15, 23, 42, 255];

function insideRoundedTile(x, y, size) {
    const radius = size * 0.22;
    const px = x + 0.5;
    const py = y + 0.5;
    const insideX = px >= radius && px <= size - radius;
    const insideY = py >= radius && py <= size - radius;
    if (insideX || insideY) return px >= 0 && py >= 0 && px <= size && py <= size;
    const cx = px < radius ? radius : size - radius;
    const cy = py < radius ? radius : size - radius;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
}

function onMark(u, v) {
    const stem = u > 0.455 && u < 0.545 && v > 0.4 && v < 0.8;
    const left = u > 0.3 && u < 0.4 && v > 0.18 && v < 0.48;
    const right = u > 0.6 && u < 0.7 && v > 0.18 && v < 0.48;
    const dx = u - 0.5;
    const dy = v - 0.46;
    const distance = Math.hypot(dx, dy);
    const shoulder =
        v < 0.5 &&
        v > 0.32 &&
        distance > 0.15 &&
        distance < 0.25 &&
        u > 0.3 &&
        u < 0.7;
    return stem || left || right || shoulder;
}

function paintIcon(maskable) {
    return (x, y, size) => {
        if (!insideRoundedTile(x, y, size)) return [0, 0, 0, 0];
        const inset = maskable ? 0.18 : 0.08;
        const u = (x + 0.5) / size;
        const v = (y + 0.5) / size;
        const span = 1 - inset * 2;
        const markU = (u - inset) / span;
        const markV = (v - inset) / span;
        if (markU >= 0 && markU <= 1 && markV >= 0 && markV <= 1 && onMark(markU, markV))
            return INK;
        return TILE;
    };
}

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
writeFileSync(join(publicDir, "pwa-192.png"), png(192, paintIcon(false)));
writeFileSync(join(publicDir, "pwa-512.png"), png(512, paintIcon(false)));
writeFileSync(join(publicDir, "pwa-maskable-512.png"), png(512, paintIcon(true)));
writeFileSync(join(publicDir, "apple-touch-icon.png"), png(180, paintIcon(false)));
