// === HOOKS PERSONALIZADOS ===
// Lógica reutilizable para SUSTORE

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    auth, db, appId, defaultSettings, SUPER_ADMIN_EMAIL,
    signInAnonymously, onAuthStateChanged, signInWithCustomToken,
    collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, setDoc, doc, getDoc
} from './firebase.js';

// --- useToast: Gestión de notificaciones ---
export const useToast = () => {
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

// --- useAuth: Estado de autenticación ---
export const useAuth = () => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('nexus_user_data');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });
    const [systemUser, setSystemUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Inicialización de Auth
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }

                // Refrescar datos de usuario desde DB
                if (currentUser && currentUser.id) {
                    try {
                        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const freshUserData = { ...userDocSnap.data(), id: userDocSnap.id };
                            if (JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
                                setCurrentUser(freshUserData);
                            }
                        }
                    } catch (err) {
                        console.warn("No se pudo refrescar usuario al inicio:", err);
                    }
                }
            } catch (e) {
                console.error("Error en inicialización Auth:", e);
            }
        };

        initializeAuth();

        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            setTimeout(() => setIsLoading(false), 1000);
        });
    }, []);

    // Persistencia
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('nexus_user_data');
        }
    }, [currentUser]);

    // Helpers de rol
    const getRole = useCallback((email, settings) => {
        if (!email || !settings) return 'user';
        const cleanEmail = email.trim().toLowerCase();

        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';

        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
        return member ? member.role : 'user';
    }, []);

    const isAdmin = useCallback((email, settings) => getRole(email, settings) === 'admin', [getRole]);

    const hasAccess = useCallback((email, settings) => {
        const role = getRole(email, settings);
        return role === 'admin' || role === 'employee';
    }, [getRole]);

    return {
        currentUser,
        setCurrentUser,
        systemUser,
        isLoading,
        setIsLoading,
        getRole,
        isAdmin,
        hasAccess
    };
};

// --- useCart: Gestión del carrito ---
export const useCart = (currentUser) => {
    const [cart, setCart] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('nexus_cart'));
            return Array.isArray(saved) ? saved : [];
        } catch (e) { return []; }
    });

    // Sincronizar carrito local y remoto
    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));

        if (currentUser && currentUser.id) {
            const syncCartToDB = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        items: cart.map(item => ({
                            productId: item.product.id,
                            quantity: item.quantity,
                            name: item.product.name,
                            price: item.product.basePrice
                        })),
                        lastUpdated: new Date().toISOString()
                    });
                } catch (e) {
                    console.error("Error syncing cart", e);
                }
            };
            const debounceTimer = setTimeout(syncCartToDB, 1500);
            return () => clearTimeout(debounceTimer);
        }
    }, [cart, currentUser]);

    const manageCart = useCallback((product, quantityDelta) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.product.id === product.id);

            if (existingIndex >= 0) {
                const newQuantity = prevCart[existingIndex].quantity + quantityDelta;
                if (newQuantity <= 0) {
                    return prevCart.filter((_, i) => i !== existingIndex);
                }
                return prevCart.map((item, i) =>
                    i === existingIndex ? { ...item, quantity: newQuantity } : item
                );
            } else if (quantityDelta > 0) {
                return [...prevCart, { product, quantity: quantityDelta }];
            }
            return prevCart;
        });
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    return { cart, setCart, manageCart, clearCart };
};

// --- usePaginatedProducts: Productos con paginación ---
export const usePaginatedProducts = (systemUser, pageSize = 20) => {
    const [products, setProducts] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const unsubscribeRef = useRef(null);

    // Carga inicial con listener en tiempo real
    useEffect(() => {
        if (!systemUser) return;

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

        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
        };
    }, [systemUser, pageSize]);

    // Cargar más productos
    const loadMore = useCallback(async () => {
        if (!lastDoc || !hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
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
                    // Evitar duplicados
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

    // Refrescar todos los productos (para cuando se actualiza uno)
    const refreshProducts = useCallback(async () => {
        if (!systemUser) return;

        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'products'),
            orderBy('name'),
            limit(products.length || pageSize)
        );

        const snapshot = await getDocs(q);
        const productsData = snapshot.docs.map(d => {
            const data = d.data();
            return { id: d.id, ...data, stock: Number(data.stock) || 0, _doc: d };
        });

        setProducts(productsData);
        if (snapshot.docs.length > 0) {
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }
    }, [systemUser, products.length, pageSize]);

    return {
        products,
        setProducts,
        loadMore,
        hasMore,
        isLoadingMore,
        initialLoading,
        refreshProducts
    };
};

// --- useFirebaseCollection: Suscripción genérica a colección ---
export const useFirebaseCollection = (collectionName, systemUser) => {
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!systemUser) return;

        const unsubscribe = onSnapshot(
            collection(db, 'artifacts', appId, 'public', 'data', collectionName),
            (snapshot) => {
                setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        );

        return () => unsubscribe();
    }, [collectionName, systemUser]);

    return [data, setData];
};

// --- useSettings: Configuración global ---
export const useSettings = (systemUser) => {
    const [settings, setSettings] = useState(defaultSettings);

    useEffect(() => {
        if (!systemUser) return;

        const unsubscribe = onSnapshot(
            collection(db, 'artifacts', appId, 'public', 'data', 'settings'),
            async (snapshot) => {
                const configDoc = snapshot.docs.find(d => d.id === 'config');
                const legacyDocs = snapshot.docs.filter(d => d.id !== 'config');

                // Migración automática de legacy
                if (legacyDocs.length > 0 && !configDoc) {
                    const oldData = legacyDocs[0].data();
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), oldData);
                }

                const effectiveDoc = configDoc || legacyDocs[0];

                if (effectiveDoc) {
                    const data = effectiveDoc.data();
                    const mergedSettings = {
                        ...defaultSettings,
                        ...data,
                        team: data.team || defaultSettings.team,
                        categories: data.categories || defaultSettings.categories
                    };

                    if (effectiveDoc.id !== 'config') {
                        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), mergedSettings);
                    }

                    setSettings(mergedSettings);
                } else {
                    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), defaultSettings);
                }
            }
        );

        return () => unsubscribe();
    }, [systemUser]);

    return [settings, setSettings];
};
