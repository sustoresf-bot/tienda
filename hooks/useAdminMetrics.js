import { useMemo } from 'react';

export const useAdminMetrics = (products, orders, expenses, purchases, settings) => {
    return useMemo(() => {
        const validOrders = orders.filter(o => o.status === 'Realizado');

        // Revenue
        const revenue = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

        // Expenses
        const expensesTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

        // Purchases
        const purchasesTotal = purchases.reduce((acc, p) => acc + (Number(p.cost) || 0), 0);

        // Net Income
        const netIncome = revenue - expensesTotal - purchasesTotal;

        // Trending Products
        const productStats = {};
        validOrders.forEach(o => {
            o.items?.forEach(i => {
                const pid = i.productId;
                if (!productStats[pid]) productStats[pid] = { sales: 0, revenue: 0 };
                productStats[pid].sales += i.quantity;
                productStats[pid].revenue += i.quantity * i.unit_price;
            });
        });

        const trendingProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                const p = products.find(prod => prod.id === id);
                if (!p) return null;
                return { id, name: p.name, image: p.image, stock: p.stock, stats };
            })
            .filter(Boolean)
            .sort((a, b) => b.stats.sales - a.stats.sales)
            .slice(0, 5);

        return {
            revenue,
            expensesTotal,
            purchasesTotal,
            netIncome,
            trendingProducts,
            lowStockThreshold: settings?.lowStockThreshold || 5
        };
    }, [products, orders, expenses, purchases, settings]);
};
