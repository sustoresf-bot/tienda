import { useState, useEffect, useCallback } from 'react';
import { fetchProducts, subscribeToCollection } from 'services';
import { defaultSettings } from 'constants';

export const useStore = () => {
    const [products, setProducts] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [nexusHasMore, setNexusHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Other data
    const [promos, setPromos] = useState([]);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // Fetch products with pagination
    const loadMoreProducts = useCallback(async () => {
        if (isLoading || !nexusHasMore) return;

        setIsLoading(true);
        try {
            const { products: newProducts, lastDoc: newLastDoc } = await fetchProducts(20, lastDoc);
            setProducts(prev => [...prev, ...newProducts]);
            setLastDoc(newLastDoc);
            if (newProducts.length < 20) setNexusHasMore(false);
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setIsLoading(false);
        }
    }, [lastDoc, isLoading, hasMore]);

    // Initial load and subscriptions
    useEffect(() => {
        loadMoreProducts();

        const unsubs = [
            subscribeToCollection('promos', setPromos),
            subscribeToCollection('orders', setOrders),
            subscribeToCollection('users', setUsers),
            subscribeToCollection('settings', (data) => {
                const config = data.find(d => d.id === 'config');
                if (config) setSettings(prev => ({ ...prev, ...config }));
            })
        ];

        return () => unsubs.forEach(u => u());
    }, []);

    return {
        products, promos, orders, users, settings,
        loadMoreProducts, nexusHasMore, isLoading
    };
};
