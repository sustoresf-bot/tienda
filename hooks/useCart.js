import { useState, useEffect } from 'react';

export const useCart = () => {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('nexus_cart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === (product.productId || product.id));
            if (existing) {
                return prev.map(i => i.productId === (product.productId || product.id)
                    ? { ...i, quantity: i.quantity + quantity }
                    : i
                );
            }
            return [...prev, {
                productId: product.id || product.productId,
                name: product.name || product.title,
                price: product.basePrice || product.unit_price || product.price,
                image: product.image,
                quantity: quantity
            }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(i => i.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    return { cart, addToCart, removeFromCart, clearCart, cartTotal };
};
