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

        await expect(cards.first()).toBeVisible({ timeout: 15_000 });

        const metrics = await page.evaluate(() => {
            const cardNodes = Array.from(document.querySelectorAll('.premium-product-card'));
            const quickAddButtons = Array.from(document.querySelectorAll('.quick-add-action'));
            const iconButtons = Array.from(document.querySelectorAll('.product-card-icon-btn'));
            const waButton = document.querySelector('[data-testid="store-wa-fab"]') || document.querySelector('button[title="Chatea con nosotros"]');
            const aiButton = document.querySelector('[data-testid="sustia-launcher"]');
            const logoEl = document.querySelector('[data-testid="store-nav-logo"]') || document.querySelector('.store-nav-logo');
            const gridEl = document.querySelector('.store-view .product-grid-responsive');

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
            const fabCollisionCards = visibleCardRects.filter((rect) => rect.bottom <= (window.innerHeight - 56));

            const cardHeights = cardNodes.map((card) => Math.round(card.getBoundingClientRect().height));
            const minHeight = cardHeights.length ? Math.min(...cardHeights) : 0;
            const maxHeight = cardHeights.length ? Math.max(...cardHeights) : 0;
            const firstRowCardCount = visibleCardRects.length
                ? visibleCardRects.filter((rect) => Math.abs(rect.top - visibleCardRects[0].top) < 2).length
                : 0;

            const gridColumnCount = (() => {
                if (!gridEl) return 0;
                const cols = getComputedStyle(gridEl).gridTemplateColumns.trim();
                if (!cols) return 0;
                return cols.split(/\s+/).length;
            })();

            const iconShapeIssues = iconButtons
                .map((el, idx) => {
                    const r = toRect(el);
                    if (!r || r.height === 0) return null;
                    const ratio = r.width / r.height;
                    if (Math.abs(1 - ratio) > 0.08) return { idx, width: r.width, height: r.height, ratio };
                    return null;
                })
                .filter(Boolean);

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
            const logoRect = toRect(logoEl);

            const fabOverlaps = visibleCardRects
                .map((cardRect, idx) => ({
                    idx,
                    wa: intersects(cardRect, waRect),
                    ai: intersects(cardRect, aiRect),
                }))
                .filter((entry) => entry.wa || entry.ai);
            const fabOverlapsOnMainContent = fabCollisionCards
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
                firstRowCardCount,
                gridColumnCount,
                iconShapeIssuesCount: iconShapeIssues.length,
                iconShapeIssuesSample: iconShapeIssues.slice(0, 5),
                quickAddOverflowCount: quickAddOverflow.length,
                quickAddOverflowSample: quickAddOverflow.slice(0, 5),
                fabOverlapCount: fabOverlaps.length,
                fabOverlapSample: fabOverlaps.slice(0, 5),
                fabOverlapMainCount: fabOverlapsOnMainContent.length,
                fabOverlapMainSample: fabOverlapsOnMainContent.slice(0, 5),
                hasWhatsappFab: !!waRect,
                hasAiFab: !!aiRect,
                hasLogo: !!logoRect,
                logoRatio: logoRect && logoRect.height ? logoRect.width / logoRect.height : null,
            };
        });

        expect(metrics.quickAddOverflowCount, `Quick add overflow: ${JSON.stringify(metrics.quickAddOverflowSample)}`).toBe(0);
        if (viewport.width <= 640) {
            expect(metrics.heightSpread, `Height spread on mobile: ${metrics.minHeight}-${metrics.maxHeight}`).toBeLessThanOrEqual(4);
            expect(metrics.fabOverlapMainCount, `FAB overlap on mobile main-content: ${JSON.stringify(metrics.fabOverlapMainSample)}`).toBe(0);
        } else {
            expect(metrics.heightSpread, `Height spread: ${metrics.minHeight}-${metrics.maxHeight}`).toBeLessThanOrEqual(1);
        }
        if (viewport.width <= 640) {
            expect(metrics.gridColumnCount, `Grid columns on mobile: ${metrics.gridColumnCount}`).toBe(2);
            if (metrics.cardCount >= 2) {
                expect(metrics.firstRowCardCount, `Cards in first row: ${metrics.firstRowCardCount}`).toBeGreaterThanOrEqual(2);
            }
            expect(metrics.iconShapeIssuesCount, `Icon shape issues: ${JSON.stringify(metrics.iconShapeIssuesSample)}`).toBe(0);
            if (metrics.hasLogo && metrics.logoRatio !== null) {
                expect(metrics.logoRatio, `Logo ratio too narrow: ${metrics.logoRatio}`).toBeGreaterThan(0.92);
                expect(metrics.logoRatio, `Logo ratio too wide: ${metrics.logoRatio}`).toBeLessThan(1.08);
            }
        }
    });
}
