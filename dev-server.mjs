import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILES = ['.env.local', '.env'];

function stripEnvQuotes(value) {
    const v = String(value ?? '');
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    return v;
}

async function loadEnvFile(fileName) {
    try {
        const filePath = path.join(__dirname, fileName);
        const raw = await readFile(filePath, 'utf8');
        raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eq = trimmed.indexOf('=');
            if (eq <= 0) return;
            const key = trimmed.slice(0, eq).trim();
            const value = stripEnvQuotes(trimmed.slice(eq + 1).trim());
            if (!key) return;
            if (process.env[key] == null || process.env[key] === '') process.env[key] = value;
        });
    } catch { }
}

await Promise.all(ENV_FILES.map(loadEnvFile));
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

    // Mirror key Vercel rewrites in local dev to keep API behavior aligned.
    const adminRewriteMap = {
        '/api/admin/users': 'users',
        '/api/admin/list-users': 'list-users',
        '/api/admin/export-store': 'export',
        '/api/admin/import-store': 'import',
        '/api/mercadopago/oauth/connect': 'mp-oauth-connect',
        '/api/mercadopago/oauth/status': 'mp-oauth-status',
        '/api/mercadopago/oauth/disconnect': 'mp-oauth-disconnect',
    };
    const adminAction = adminRewriteMap[url.pathname];
    if (adminAction) {
        url.pathname = '/api/admin';
        if (!url.searchParams.get('action')) url.searchParams.set('action', adminAction);
    }

    if (url.pathname === '/api/public-config') {
        url.pathname = '/api/checkout';
        if (!url.searchParams.get('action')) url.searchParams.set('action', 'public_config');
    }
    if (url.pathname === '/api/mercadopago/oauth/callback') {
        url.pathname = '/api/checkout';
        if (!url.searchParams.get('action')) url.searchParams.set('action', 'mp_oauth_callback');
    }
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
        url: url.pathname + (url.search || ''),
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
