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

test('endpoints criticos rechazan sin token', async ({ request }) => {
    const resOrders = await request.post('/api/orders/confirm', { data: {} });
    expect([401, 403]).toContain(resOrders.status());

    const resUpdate = await request.post('/api/admin/users', { data: { action: 'update', uid: 'x', email: 'test@example.com' } });
    expect([401, 403]).toContain(resUpdate.status());

    const resDelete = await request.post('/api/admin/users', { data: { action: 'delete', uid: 'x' } });
    expect([401, 403]).toContain(resDelete.status());
});

test('auth hardening: username lookup deprecado y reset no enumera', async ({ request }) => {
    const lookup = await request.post('/api/auth/username-lookup', { data: { username: 'demo' } });
    expect(lookup.status()).toBe(410);

    const resetA = await request.post('/api/auth/reset-password', { data: { email: 'exists@example.com' } });
    const resetB = await request.post('/api/auth/reset-password', { data: { email: 'missing@example.com' } });

    expect(resetA.status()).toBe(resetB.status());

    const bodyA = await resetA.json().catch(() => ({}));
    const bodyB = await resetB.json().catch(() => ({}));
    expect(Object.keys(bodyA).sort()).toEqual(Object.keys(bodyB).sort());
});
