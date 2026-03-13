import { defineConfig } from '@playwright/test';

const testPort = 34823;

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    webServer: {
        command: 'node dev-server.mjs',
        url: `http://localhost:${testPort}`,
        env: {
            PORT: String(testPort),
        },
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
        timeout: 120_000,
    },
    use: {
        baseURL: `http://localhost:${testPort}`,
        headless: true,
    },
});
