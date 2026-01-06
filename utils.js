import { SUPER_ADMIN_EMAIL } from '@constants';

export const isAdmin = (email, settings) => {
    if (!email) return false;
    if (email === SUPER_ADMIN_EMAIL) return true;
    return settings?.team?.some(m => m.email === email && m.role === 'admin');
};

export const hasAccess = (email, settings) => {
    if (!email) return false;
    if (email === SUPER_ADMIN_EMAIL) return true;
    return settings?.team?.some(m => m.email === email);
};

export const calculateItemPrice = (basePrice, discount = 0) => {
    const price = Number(basePrice) || 0;
    const disc = Number(discount) || 0;
    return price - (price * (disc / 100));
};

export const formatMoney = (amount) => `$${Number(amount).toLocaleString('es-AR')}`;
