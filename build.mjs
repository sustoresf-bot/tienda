import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'assets');
await mkdir(outDir, { recursive: true });

console.log('Building with esbuild...');
await build({
  entryPoints: {
    app: path.join(__dirname, 'script.js')
  },
  outdir: outDir,
  bundle: true,
  splitting: true,
  minify: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  charset: 'utf8',
  external: [
    'react',
    'react-dom/client',
    'lucide-react',
    'firebase/app',
    'firebase/auth',
    'firebase/firestore'
  ],
  loader: {
    '.js': 'jsx',
  },
});

// Post-build: Create 'public' directory and copy static files for Vercel
import { copyFile, cp, rm } from 'fs/promises';

const deployDir = path.join(__dirname, 'public');

console.log('Preparing public directory for deployment...');
try {
  await rm(deployDir, { recursive: true, force: true });
} catch (e) { }
await mkdir(deployDir, { recursive: true });

const filesToCopy = [
  'index.html',
  'manifest.json',
  'sw.js',
  'robots.txt',
  'sitemap.xml',
  'icon-192.png',
  'icon-192.svg',
  'noise.svg',
  'styles.css',
  'sustia-ai-v2.jpg',
  'sustia-ai.jpg',
  'sustia-ai.png',
  'reset-password.html'
];

for (const file of filesToCopy) {
  try {
    await copyFile(path.join(__dirname, file), path.join(deployDir, file));
  } catch (e) {
    console.warn(`Warning: Could not copy ${file}: ${e.message}`);
  }
}

// Copy the generated assets folder into public
try {
  await cp(outDir, path.join(deployDir, 'assets'), { recursive: true });
  console.log('Successfully prepared public directory.');
} catch (e) {
  console.error(`Error copying assets to public: ${e.message}`);
}
