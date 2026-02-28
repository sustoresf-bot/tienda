function resolveBooleanWithDefault(value, fallback = true) {
    if (value === undefined || value === null) return fallback;
    return value !== false;
}

export function resolveIdentityRequirements(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};
    const rawRequireDni = Object.prototype.hasOwnProperty.call(source, 'requireDNI')
        ? source.requireDNI
        : source.requireDni;
    const rawRequirePhone = Object.prototype.hasOwnProperty.call(source, 'requirePhone')
        ? source.requirePhone
        : source.require_phone;

    return {
        requireDni: resolveBooleanWithDefault(rawRequireDni, true),
        requirePhone: resolveBooleanWithDefault(rawRequirePhone, true),
    };
}

export function validateIdentityFields({
    dni,
    phone,
    requireDni = true,
    requirePhone = true,
} = {}) {
    const normalizedDni = String(dni || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const needsDni = requireDni !== false;
    const needsPhone = requirePhone !== false;

    if (needsDni && !normalizedDni) {
        return {
            ok: false,
            code: 'dni_required',
            message: 'Debes ingresar tu DNI (minimo 6 digitos).',
        };
    }
    if (normalizedDni && normalizedDni.length < 6) {
        return {
            ok: false,
            code: 'invalid_dni',
            message: 'DNI invalido (minimo 6 digitos).',
        };
    }

    if (needsPhone && !normalizedPhone) {
        return {
            ok: false,
            code: 'phone_required',
            message: 'Debes ingresar tu telefono (minimo 8 digitos).',
        };
    }
    if (normalizedPhone && normalizedPhone.length < 8) {
        return {
            ok: false,
            code: 'invalid_phone',
            message: 'Telefono invalido (minimo 8 digitos).',
        };
    }

    return { ok: true, code: null, message: null };
}

export function buildMissingIdentityMessage({ requireDni = true, requirePhone = true } = {}) {
    const required = ['Nombre'];
    if (requirePhone !== false) required.push('Telefono');
    if (requireDni !== false) required.push('DNI');

    if (required.length === 1) return required[0];
    if (required.length === 2) return `${required[0]} y ${required[1]}`;
    return `${required[0]}, ${required[1]} y ${required[2]}`;
}
