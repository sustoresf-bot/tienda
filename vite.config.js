import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'config': path.resolve(__dirname, './firebase/config.js'),
            'services': path.resolve(__dirname, './firebase/services.js'),
            'hooks': path.resolve(__dirname, './hooks'),
            'components': path.resolve(__dirname, './components'),
            'pages': path.resolve(__dirname, './pages'),
            'utils': path.resolve(__dirname, './utils.js'),
            'constants': path.resolve(__dirname, './constants.js')
        }
    },
    esbuild: {
        loader: 'jsx',
        include: /.*\.js$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    build: {
        outDir: 'dist',
    },
    server: {
        port: 3000
    }
});
