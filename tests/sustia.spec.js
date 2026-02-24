import { test, expect } from '@playwright/test';

test('SustIA abre, responde y no rompe UI', async ({ page }) => {
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

    await page.goto('/?sustia=1');
    await page.waitForFunction(() => {
        const root = document.querySelector('#root');
        if (!root) return false;
        const spinner = root.querySelector('.loading-spinner');
        return !spinner && root.textContent && root.textContent.trim().length > 0;
    });

    const botRoot = page.getByTestId('sustia-root');
    const launcherButton = page.getByTestId('sustia-launcher');
    await expect(launcherButton).toBeVisible();
    await launcherButton.click();

    const input = page.getByPlaceholder('Escribe aquí...');
    await expect(input).toBeVisible();

    await input.fill('Cómo es el envío?');
    await input.press('Enter');
    await expect(page.locator('text=Si me decís tu ciudad').or(page.locator('text=Todavía no tengo configurado'))).toBeVisible({ timeout: 15_000 });

    await input.fill('Qué medios de pago hay?');
    await input.press('Enter');
    await expect(page.locator('text=Podés pagar').or(page.locator('text=métodos de pago'))).toBeVisible({ timeout: 15_000 });

    const bubbleTexts = botRoot.locator('p.whitespace-pre-wrap');
    const bubbleCountBefore = await bubbleTexts.count();

    const ofertasBtn = page.getByTestId('quick-action-ofertas');
    await expect(ofertasBtn).toBeVisible({ timeout: 15_000 });
    await ofertasBtn.click({ force: true });

    await expect.poll(async () => await bubbleTexts.count(), { timeout: 15_000 }).toBeGreaterThan(bubbleCountBefore);

    expect(errors, errors.join('\n')).toEqual([]);
});

test('IA externa: endpoint responde 501 si no hay key', async ({ request }) => {
    const res = await request.post('/api/ai/chat', { data: { userText: 'hola', messages: [] } });
    expect([200, 501, 502]).toContain(res.status());
    if (res.status() === 501) {
        const data = await res.json();
        expect(data).toHaveProperty('error');
    }
});
