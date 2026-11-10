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

function png(width, height, paint) {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y += 1) {
        const row = y * (width * 4 + 1);
        raw[row] = 0;
        for (let x = 0; x < width; x += 1) {
            const [r, g, b, a] = paint(x, y, width, height);
            const index = row + 1 + x * 4;
            raw[index] = r;
            raw[index + 1] = g;
            raw[index + 2] = b;
            raw[index + 3] = a;
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

const INK = [247, 244, 238, 255];
const TILE = [18, 49, 46, 255];

function onMark(u, v) {
    const left = u > 0.34 && u < 0.42 && v > 0.18 && v < 0.48;
    const right = u > 0.58 && u < 0.66 && v > 0.18 && v < 0.48;
    const stem = u > 0.46 && u < 0.54 && v > 0.55 && v < 0.82;
    const dx = u - 0.5;
    const dy = v - 0.5;
    const distance = Math.hypot(dx, dy);
    const shoulder = v < 0.58 && v > 0.36 && distance > 0.14 && distance < 0.24;
    return left || right || stem || shoulder;
}

function iconPaint(x, y, size) {
    const radius = size * 0.22;
    const px = x + 0.5;
    const py = y + 0.5;
    const cx = Math.min(Math.max(px, radius), size - radius);
    const cy = Math.min(Math.max(py, radius), size - radius);
    if ((px - cx) ** 2 + (py - cy) ** 2 > radius * radius) return [0, 0, 0, 0];
    const u = px / size;
    const v = py / size;
    return onMark(u, v) ? INK : TILE;
}

function cardPaint(x, y, width, height) {
    const u = (x + 0.5) / width;
    const v = (y + 0.5) / height;
    const markU = (u - 0.35) / 0.3;
    const markV = (v - 0.22) / 0.56;
    if (markU >= 0 && markU <= 1 && markV >= 0 && markV <= 1 && onMark(markU, markV))
        return INK;
    return TILE;
}

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
writeFileSync(join(publicDir, "icon-192.png"), png(192, 192, (x, y, w) => iconPaint(x, y, w)));
writeFileSync(join(publicDir, "icon-512.png"), png(512, 512, (x, y, w) => iconPaint(x, y, w)));
writeFileSync(
    join(publicDir, "apple-touch-icon.png"),
    png(180, 180, (x, y, w) => iconPaint(x, y, w)),
);
writeFileSync(join(publicDir, "og.png"), png(1200, 630, cardPaint));
