import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AAD = Buffer.from('sustore-mercadopago-oauth-v1', 'utf8');

let cachedKey = undefined;

function resolveEncryptionKey() {
    if (cachedKey !== undefined) return cachedKey;

    const rawKey = String(process.env.MP_TOKEN_ENCRYPTION_KEY || '').trim();
    if (!rawKey) {
        cachedKey = null;
        return cachedKey;
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        cachedKey = Buffer.from(rawKey, 'hex');
        return cachedKey;
    }

    try {
        const decoded = Buffer.from(rawKey, 'base64');
        if (decoded.length === 32) {
            cachedKey = decoded;
            return cachedKey;
        }
    } catch (_) {
        // ignore and fallback to hash-derivation
    }

    cachedKey = crypto.createHash('sha256').update(rawKey, 'utf8').digest();
    return cachedKey;
}

function requireEncryptionKey() {
    const key = resolveEncryptionKey();
    if (!key) {
        const error = new Error('MP_TOKEN_ENCRYPTION_KEY is not configured');
        error.code = 'missing_encryption_key';
        error.status = 500;
        throw error;
    }
    return key;
}

function normalizePayload(value) {
    if (!value) return null;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }
    if (typeof value === 'object') return value;
    return null;
}

export function isTokenEncryptionConfigured() {
    return !!resolveEncryptionKey();
}

export function encryptSecret(value) {
    const plainText = String(value ?? '');
    const key = requireEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    cipher.setAAD(AAD);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        v: 1,
        alg: ENCRYPTION_ALGORITHM,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        content: encrypted.toString('base64'),
    };
}

export function decryptSecret(payload) {
    const parsed = normalizePayload(payload);
    if (!parsed || !parsed.iv || !parsed.tag || !parsed.content) {
        const error = new Error('Invalid encrypted payload');
        error.code = 'invalid_encrypted_payload';
        error.status = 500;
        throw error;
    }

    const key = requireEncryptionKey();
    const iv = Buffer.from(String(parsed.iv), 'base64');
    const tag = Buffer.from(String(parsed.tag), 'base64');
    const encrypted = Buffer.from(String(parsed.content), 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
}
