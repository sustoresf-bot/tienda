// === HOOKS PERSONALIZADOS ===
// Lógica reutilizable para SUSTORE
// Expuestos en window.SustoreHooks

import { useState, useEffect, useCallback, useRef } from 'react';

// Esperar a que Firebase esté disponible
const waitForFirebase = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.SustoreFirebase) {
                resolve(window.SustoreFirebase);
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
};

// --- useToast: Gestión de notificaciones ---
const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((msg, type = 'info') => {
        const id = Date.now();
        setToasts(prev => {
            const filtered = prev.filter(t => Date.now() - t.id < 3000);
            return [...filtered, { id, message: msg, type }];
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(p => p.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
};

// --- usePaginatedProducts: Productos con paginación ---
const usePaginatedProducts = (systemUser, pageSize = 20) => {
    const [products, setProducts] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const unsubscribeRef = useRef(null);

    // Carga inicial con listener en tiempo real
    useEffect(() => {
        if (!systemUser) return;

        const init = async () => {
            const fb = await waitForFirebase();
            const { db, appId, collection, query, orderBy, limit, onSnapshot, getDocs, startAfter } = fb;

            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'products'),
                orderBy('name'),
                limit(pageSize)
            );

            unsubscribeRef.current = onSnapshot(q, (snapshot) => {
                const productsData = snapshot.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, stock: Number(data.stock) || 0, _doc: d };
                });

                setProducts(productsData);

                if (snapshot.docs.length > 0) {
                    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                }
                setHasMore(snapshot.docs.length >= pageSize);
                setInitialLoading(false);
            }, (error) => {
                console.error("Error fetching products:", error);
                setInitialLoading(false);
            });
        };

        init();

        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
        };
    }, [systemUser, pageSize]);

    // Cargar más productos
    const loadMore = useCallback(async () => {
        if (!lastDoc || !hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const fb = await waitForFirebase();
            const { db, appId, collection, query, orderBy, limit, getDocs, startAfter } = fb;

            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'products'),
                orderBy('name'),
                startAfter(lastDoc),
                limit(pageSize)
            );

            const snapshot = await getDocs(q);
            const newProducts = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, stock: Number(data.stock) || 0, _doc: d };
            });

            if (snapshot.docs.length > 0) {
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

            setHasMore(snapshot.docs.length >= pageSize);
        } catch (error) {
            console.error("Error loading more products:", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [lastDoc, hasMore, isLoadingMore, pageSize]);

    return {
        products,
        setProducts,
        loadMore,
        hasMore,
        isLoadingMore,
        initialLoading
    };
};

// --- EXPONER EN WINDOW ---
window.SustoreHooks = {
    useToast,
    usePaginatedProducts,
    waitForFirebase
};

console.log('[Hooks] ✅ Módulo cargado correctamente');
