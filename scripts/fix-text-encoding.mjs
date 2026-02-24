import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const cp1252Special = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
    [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
    [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

function isSuspiciousChunk(chunk) {
    for (const ch of chunk) {
        const cp = ch.codePointAt(0);
        if (cp === 0xC2 || cp === 0xC3 || cp === 0xE2 || cp === 0xF0 || cp === 0xFFFD) return true;
        if (cp >= 0x80 && cp <= 0x9F) return true;
    }
    return false;
}

function chunkToCp1252Bytes(chunk) {
    const bytes = [];
    for (const ch of chunk) {
        const cp = ch.codePointAt(0);
        if (cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF) || (cp >= 0x80 && cp <= 0x9F)) {
            bytes.push(cp & 0xFF);
            continue;
        }
        const mapped = cp1252Special.get(cp);
        if (mapped == null) return null;
        bytes.push(mapped);
    }
    return Buffer.from(bytes);
}

function fixChunk(chunk) {
    if (!isSuspiciousChunk(chunk)) return chunk;
    const bytes = chunkToCp1252Bytes(chunk);
    if (!bytes) return chunk;
    const decoded = bytes.toString('utf8');
    if (decoded.includes('\uFFFD')) return chunk;
    return decoded;
}

function sanitizeText(text) {
    return text.replace(/[^\x00-\x7F]+/g, (chunk) => fixChunk(chunk));
}

const argPath = process.argv[2] ? path.resolve(projectRoot, process.argv[2]) : path.join(projectRoot, 'script.js');

const original = await readFile(argPath, 'utf8');
const fixed = sanitizeText(original);

if (fixed === original) {
    console.log(`No encoding fixes needed: ${path.relative(projectRoot, argPath)}`);
    process.exit(0);
}

await writeFile(argPath, fixed, 'utf8');
console.log(`Encoding fixed: ${path.relative(projectRoot, argPath)}`);
