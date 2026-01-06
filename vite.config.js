// 2. vite.config.js (Copia todo esto en la raíz)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@config': '/firebase/config.js',
            '@services': '/firebase/services.js',
            '@hooks': '/hooks',
            '@components': '/components',
            '@pages': '/pages',
            '@utils': '/utils.js',
            '@constants': '/constants.js'
        }
    },
    esbuild: { loader: 'jsx', include: /.*\.js$/, exclude: [] },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    build: { outDir: 'dist' }
});
