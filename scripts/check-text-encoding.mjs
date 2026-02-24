import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const skipDirs = new Set(['.git', 'node_modules', 'test-results', 'coverage', 'dist', 'build']);
const textExt = new Set([
    '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
    '.json', '.html', '.css', '.md', '.txt', '.xml',
    '.yml', '.yaml', '.svg', '.env', '.map',
]);

function isTextFile(filePath) {
    const base = path.basename(filePath);
    if (base.startsWith('.env')) return true;
    return textExt.has(path.extname(base).toLowerCase());
}

function hasSuspiciousChar(ch) {
    const cp = ch.codePointAt(0);
    if (cp === 0xC2 || cp === 0xC3 || cp === 0xE2 || cp === 0xF0 || cp === 0xFFFD) return true;
    return cp >= 0x80 && cp <= 0x9F;
}

async function walk(dir, collector) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (skipDirs.has(entry.name)) continue;
            await walk(abs, collector);
            continue;
        }
        if (!isTextFile(abs)) continue;
        collector.push(abs);
    }
}

const files = [];
await walk(projectRoot, files);

let issues = 0;
for (const file of files) {
    let content = '';
    try {
        content = await readFile(file, 'utf8');
    } catch {
        continue;
    }

    const lines = content.split(/\r?\n/);
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        let found = false;
        for (const ch of line) {
            if (hasSuspiciousChar(ch)) {
                found = true;
                break;
            }
        }
        if (!found) continue;
        issues++;
        const rel = path.relative(projectRoot, file).replaceAll('\\', '/');
        const preview = line.length > 180 ? `${line.slice(0, 180)}...` : line;
        console.error(`${rel}:${idx + 1}: ${preview}`);
    }
}

if (issues > 0) {
    console.error(`\nFound ${issues} suspicious mojibake line(s).`);
    process.exit(1);
}

console.log('No suspicious encoding patterns found.');
