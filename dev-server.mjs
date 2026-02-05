import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
};

function send(res, statusCode, body, headers = {}) {
    res.statusCode = statusCode;
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.end(body);
}

async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
        try {
            return raw ? JSON.parse(raw) : {};
        } catch {
            return null;
        }
    }
    return raw;
}

function createRes(res) {
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (obj) => {
        send(res, res.statusCode || 200, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
    };
    return res;
}

async function handleApi(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const apiPath = url.pathname.replace(/^\/api\//, '');

    const candidates = [
        path.join(__dirname, 'api', `${apiPath}.js`),
        path.join(__dirname, 'api', apiPath, 'index.js'),
    ];

    let filePath = null;
    for (const c of candidates) {
        try {
            const st = await stat(c);
            if (st.isFile()) {
                filePath = c;
                break;
            }
        } catch { }
    }

    if (!filePath) {
        return send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': 'application/json; charset=utf-8' });
    }

    const body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readBody(req);
    if (body === null) {
        return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }), { 'Content-Type': 'application/json; charset=utf-8' });
    }

    const mod = await import(pathToFileURL(filePath).href);
    const handler = mod?.default;
    if (typeof handler !== 'function') {
        return send(res, 500, JSON.stringify({ error: 'Invalid handler' }), { 'Content-Type': 'application/json; charset=utf-8' });
    }

    const reqLike = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
        socket: req.socket,
        query: Object.fromEntries(url.searchParams.entries()),
    };

    const resLike = createRes(res);
    await handler(reqLike, resLike);
}

async function serveStatic(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const safePath = pathname.replace(/\.\.(\/|\\)/g, '');
    const resolved = safePath === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, safePath);

    try {
        const st = await stat(resolved);
        if (!st.isFile()) throw new Error('not file');
        const ext = path.extname(resolved).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        const data = await readFile(resolved);
        send(res, 200, data, { 'Content-Type': type });
    } catch {
        if (safePath !== '/' && !safePath.includes('.')) {
            const data = await readFile(path.join(__dirname, 'index.html'));
            return send(res, 200, data, { 'Content-Type': MIME['.html'] });
        }
        send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.url?.startsWith('/api/')) {
            await handleApi(req, res);
            return;
        }
        await serveStatic(req, res);
    } catch (e) {
        send(res, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
});

server.listen(PORT, () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
});

