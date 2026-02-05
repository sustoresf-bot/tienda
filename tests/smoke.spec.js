import { test, expect } from '@playwright/test';

test('carga la home sin errores de runtime', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForFunction(() => {
        const root = document.querySelector('#root');
        if (!root) return false;
        const spinner = root.querySelector('.loading-spinner');
        return !spinner && root.textContent && root.textContent.trim().length > 0;
    });

    expect(errors, errors.join('\n')).toEqual([]);
});

test('endpoints críticos rechazan sin token', async ({ request }) => {
    const resOrders = await request.post('/api/orders/confirm', { data: {} });
    expect([401, 403]).toContain(resOrders.status());

    const resUpdate = await request.post('/api/admin/update-user', { data: { uid: 'x' } });
    expect([401, 403]).toContain(resUpdate.status());

    const resDelete = await request.post('/api/admin/delete-user', { data: { uid: 'x' } });
    expect([401, 403]).toContain(resDelete.status());
});

