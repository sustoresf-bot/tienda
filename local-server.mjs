import http from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { extname, join } from 'path';

const base = process.cwd();
const port = Number(process.env.PORT || 8000);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

http
  .createServer((req, res) => {
    const t = new Date().toISOString();
    try {
      const u = new URL(req.url, `http://localhost:${port}`);
      let p = decodeURIComponent(u.pathname);
      if (p === '/') p = '/index.html';

      const file = join(base, p);
      if (!existsSync(file)) {
        console.log(t, 404, req.method, req.url);
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const st = statSync(file);
      if (st.isDirectory()) {
        console.log(t, 403, req.method, req.url);
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const contentType = mime[extname(file)] || 'application/octet-stream';
      console.log(t, 200, req.method, req.url, '->', p, '(', contentType, ')');
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      createReadStream(file).pipe(res);
    } catch (e) {
      console.log(t, 500, req.method, req.url, e?.message || e);
      res.statusCode = 500;
      res.end('Error');
    }
  })
  .listen(port, () => {
    console.log(`Local server running: http://localhost:${port}`);
  });

