export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsernameForKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 32);
}

export function isStrictUsername(value) {
    return USERNAME_PATTERN.test(String(value || '').trim().toLowerCase());
}

export function normalizeStrictUsername(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return isStrictUsername(normalized) ? normalized : null;
}

export function emailToDocKey(email) {
    return String(email || '')
        .trim()
        .toLowerCase()
        .replace(/[.#$/\[\]]/g, '_');
}
