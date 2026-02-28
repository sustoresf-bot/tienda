import { test, expect } from '@playwright/test';

const VIEWPORTS = [
    { name: 'mobile-390x844', width: 390, height: 844 },
    { name: 'tablet-768x1024', width: 768, height: 1024 },
    { name: 'tablet-1024x768', width: 1024, height: 768 },
    { name: 'desktop-1280x800', width: 1280, height: 800 },
    { name: 'desktop-1920x1080', width: 1920, height: 1080 },
];

for (const viewport of VIEWPORTS) {
    test(`storefront layout estable en ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/?sustia=1');

        await page.waitForFunction(() => {
            const root = document.querySelector('#root');
            if (!root) return false;
            const spinner = root.querySelector('.loading-spinner');
            return !spinner && root.textContent && root.textContent.trim().length > 0;
        });

        let hasCards = true;
        try {
            await page.waitForFunction(() => document.querySelectorAll('.premium-product-card').length > 0, { timeout: 15_000 });
        } catch {
            hasCards = false;
        }
        test.skip(!hasCards, 'No hay productos en el entorno de test para validar layout de cards.');

        const cards = page.locator('.premium-product-card');
        const cardCount = await cards.count();

        await expect(cards.first()).toBeVisible({ timeout: 15_000 });

        const metrics = await page.evaluate(() => {
            const cardNodes = Array.from(document.querySelectorAll('.premium-product-card'));
            const quickAddButtons = Array.from(document.querySelectorAll('.quick-add-action'));
            const waButton = document.querySelector('button[title="Chatea con nosotros"]');
            const aiButton = document.querySelector('[data-testid="sustia-launcher"]');

            const toRect = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {
                    left: r.left,
                    top: r.top,
                    right: r.right,
                    bottom: r.bottom,
                    width: r.width,
                    height: r.height,
                };
            };

            const intersects = (a, b) => !!(
                a &&
                b &&
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top
            );

            const visibleCardRects = cardNodes
                .map(toRect)
                .filter(Boolean)
                .filter((rect) => rect.bottom > 0 && rect.top < window.innerHeight);

            const cardHeights = cardNodes.map((card) => Math.round(card.getBoundingClientRect().height));
            const minHeight = cardHeights.length ? Math.min(...cardHeights) : 0;
            const maxHeight = cardHeights.length ? Math.max(...cardHeights) : 0;

            const quickAddOverflow = quickAddButtons
                .map((btn, idx) => {
                    const btnRect = toRect(btn);
                    const card = btn.closest('.premium-product-card');
                    const cardRect = toRect(card);
                    if (!btnRect || !cardRect) return null;
                    const overRight = btnRect.right > cardRect.right + 1;
                    const overLeft = btnRect.left < cardRect.left - 1;
                    const overBottom = btnRect.bottom > cardRect.bottom + 1;
                    return overRight || overLeft || overBottom ? { idx, overRight, overLeft, overBottom } : null;
                })
                .filter(Boolean);

            const waRect = toRect(waButton);
            const aiRect = toRect(aiButton);

            const fabOverlaps = visibleCardRects
                .map((cardRect, idx) => ({
                    idx,
                    wa: intersects(cardRect, waRect),
                    ai: intersects(cardRect, aiRect),
                }))
                .filter((entry) => entry.wa || entry.ai);

            return {
                cardCount: cardNodes.length,
                minHeight,
                maxHeight,
                heightSpread: maxHeight - minHeight,
                quickAddOverflowCount: quickAddOverflow.length,
                quickAddOverflowSample: quickAddOverflow.slice(0, 5),
                fabOverlapCount: fabOverlaps.length,
                fabOverlapSample: fabOverlaps.slice(0, 5),
                hasWhatsappFab: !!waRect,
                hasAiFab: !!aiRect,
            };
        });

        expect(metrics.quickAddOverflowCount, `Quick add overflow: ${JSON.stringify(metrics.quickAddOverflowSample)}`).toBe(0);
        expect(metrics.heightSpread, `Height spread: ${metrics.minHeight}-${metrics.maxHeight}`).toBeLessThanOrEqual(1);
        expect(metrics.fabOverlapCount, `FAB overlap: ${JSON.stringify(metrics.fabOverlapSample)}`).toBe(0);
    });
}
