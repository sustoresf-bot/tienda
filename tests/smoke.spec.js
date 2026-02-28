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

test('auth modal: abre login y alterna a registro sin romper UI', async ({ page }) => {
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

    await page.locator('.store-nav-login-btn').first().click();
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();

    await page.getByRole('button', { name: /regístrate gratis/i }).click();
    await expect(page.locator('#auth-name')).toBeVisible();
    await expect(page.locator('#auth-username')).toBeVisible();
    await expect(page.locator('#auth-dni')).toBeVisible();
    await expect(page.locator('#auth-phone')).toBeVisible();

    await page.getByRole('button', { name: /inicia sesi[oó]n/i }).click();
    await expect(page.locator('#auth-name')).toHaveCount(0);
    await expect(page.locator('#auth-email')).toBeVisible();

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

test('checkout endpoint: same-origin fallback acepta POST sin origin/referer', async ({ request }) => {
    const res = await request.post('/api/checkout', {
        headers: { 'sec-fetch-site': 'same-origin' },
        data: { action: 'invalid_action_for_test' },
    });

    // No debe bloquear por origen en requests same-origin sin Origin/Referer.
    expect(res.status()).toBe(400);
});

test('checkout endpoint: bloquea origen cruzado', async ({ request }) => {
    const res = await request.post('/api/checkout', {
        headers: { origin: 'https://example.com' },
        data: { action: 'invalid_action_for_test' },
    });

    expect(res.status()).toBe(403);
});
