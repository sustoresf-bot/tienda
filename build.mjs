import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'fs/promises';
import { spawnSync } from 'child_process';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'assets');
const deployDir = path.join(__dirname, 'public');
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    || String(process.env.VERCEL_ENV || '').toLowerCase() === 'production';

function normalizeSiteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return withProtocol.replace(/\/+$/, '');
}

function runTailwindBuild() {
    const command = 'npx @tailwindcss/cli -i tailwind.input.css -o assets/tailwind.css --minify';
    const result = spawnSync(command, {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
    });

    if (result.status !== 0) {
        throw new Error(`Tailwind build failed with exit code ${result.status ?? 'unknown'} (${result.error?.message || 'no details'})`);
    }
}

const storeId = String(process.env.SUSTORE_APP_ID || 'sustore-63266-prod').trim();
const publicSiteUrl = normalizeSiteUrl(process.env.PUBLIC_SITE_URL || 'https://sustore.vercel.app');
const today = new Date().toISOString().slice(0, 10);
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const packageVersion = String(packageJson.version || '0.0.0').trim();
const buildStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const appAssetVersion = `${packageVersion}-${buildStamp}`;

console.log('Cleaning assets directory...');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

console.log('Building Tailwind CSS...');
runTailwindBuild();

console.log('Building app bundle with esbuild...');
await build({
    entryPoints: {
        app: path.join(__dirname, 'script.js'),
    },
    outdir: outDir,
    bundle: true,
    splitting: true,
    minify: true,
    sourcemap: isProduction ? false : true,
    format: 'esm',
    target: ['es2020'],
    charset: 'utf8',
    define: {
        __SUSTORE_APP_ID__: JSON.stringify(storeId),
        __PUBLIC_SITE_URL__: JSON.stringify(publicSiteUrl),
    },
    loader: {
        '.js': 'jsx',
    },
});

console.log('Preparing public directory for deployment...');
await rm(deployDir, { recursive: true, force: true });
await mkdir(deployDir, { recursive: true });

const filesToCopy = [
    'manifest.json',
    'sw.js',
    'icon-192.png',
    'icon-192.svg',
    'noise.svg',
    'styles.css',
    'sustia-ai-v2.jpg',
    'sustia-ai.jpg',
    'sustia-ai.png',
    'reset-password.html',
];

for (const file of filesToCopy) {
    try {
        await copyFile(path.join(__dirname, file), path.join(deployDir, file));
    } catch (error) {
        console.warn(`Warning: Could not copy ${file}: ${error.message}`);
    }
}

const indexTemplate = await readFile(path.join(__dirname, 'index.html'), 'utf8');
const indexRendered = indexTemplate
    .replaceAll('__PUBLIC_SITE_URL__', publicSiteUrl)
    .replaceAll('__APP_ASSET_VERSION__', appAssetVersion);
await writeFile(path.join(deployDir, 'index.html'), indexRendered, 'utf8');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${publicSiteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${publicSiteUrl}/#store</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${publicSiteUrl}/#about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${publicSiteUrl}/#privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`;
await writeFile(path.join(deployDir, 'sitemap.xml'), sitemapXml, 'utf8');

const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

Sitemap: ${publicSiteUrl}/sitemap.xml
`;
await writeFile(path.join(deployDir, 'robots.txt'), robotsTxt, 'utf8');

await cp(outDir, path.join(deployDir, 'assets'), { recursive: true });
console.log('Build completed successfully.');
