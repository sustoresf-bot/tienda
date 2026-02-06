import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'assets');
await mkdir(outDir, { recursive: true });

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
