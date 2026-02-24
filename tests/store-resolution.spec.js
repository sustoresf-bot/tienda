import { test, expect } from '@playwright/test';

test('en localhost no aparece el bloqueo de tienda no configurada', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForFunction(() => {
        const root = document.querySelector('#root');
        if (!root) return false;
        const spinner = root.querySelector('.loading-spinner');
        return !spinner && root.textContent && root.textContent.trim().length > 0;
    });

    await expect(page.getByText('Tienda no configurada')).toHaveCount(0);
});

test('en subdominio .localhost no depende del host y no bloquea', async ({ page }) => {
    await page.goto('http://demo.localhost:3000/');
    await page.waitForFunction(() => {
        const root = document.querySelector('#root');
        if (!root) return false;
        const spinner = root.querySelector('.loading-spinner');
        return !spinner && root.textContent && root.textContent.trim().length > 0;
    });
    await expect(page.getByText('Tienda no configurada')).toHaveCount(0);
});
