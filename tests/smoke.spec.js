import { test, expect } from '@playwright/test';

test('carga la home sin errores de runtime', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => {
        const text = String(err);
        if (text.includes('[BABEL] Note: The code generator has deoptimised the styling')) return;
        errors.push(text);
    });
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (text.includes('[BABEL] Note: The code generator has deoptimised the styling')) return;
        errors.push(text);
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

    const resUpdate = await request.post('/api/admin/users', { data: { action: 'update', uid: 'x', email: 'test@example.com' } });
    expect([401, 403]).toContain(resUpdate.status());

    const resDelete = await request.post('/api/admin/users', { data: { action: 'delete', uid: 'x' } });
    expect([401, 403]).toContain(resDelete.status());
});
