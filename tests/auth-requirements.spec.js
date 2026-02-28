import { test, expect } from '@playwright/test';
import { resolveIdentityRequirements, validateIdentityFields, buildMissingIdentityMessage } from '../lib/auth-requirements.js';

test('resolveIdentityRequirements usa defaults requeridos', () => {
    expect(resolveIdentityRequirements(null)).toEqual({ requireDni: true, requirePhone: true });
    expect(resolveIdentityRequirements({})).toEqual({ requireDni: true, requirePhone: true });
});

test('resolveIdentityRequirements respeta toggles de settings', () => {
    expect(resolveIdentityRequirements({ requireDNI: false, requirePhone: true })).toEqual({ requireDni: false, requirePhone: true });
    expect(resolveIdentityRequirements({ requireDNI: false, requirePhone: false })).toEqual({ requireDni: false, requirePhone: false });
});

test('validateIdentityFields: ambos requeridos', () => {
    expect(validateIdentityFields({ dni: '', phone: '', requireDni: true, requirePhone: true })).toMatchObject({
        ok: false,
        code: 'dni_required',
    });

    expect(validateIdentityFields({ dni: '12345678', phone: '', requireDni: true, requirePhone: true })).toMatchObject({
        ok: false,
        code: 'phone_required',
    });

    expect(validateIdentityFields({ dni: '12345678', phone: '11223344', requireDni: true, requirePhone: true })).toMatchObject({
        ok: true,
    });
});

test('validateIdentityFields: DNI opcional y telefono requerido', () => {
    expect(validateIdentityFields({ dni: '', phone: '11223344', requireDni: false, requirePhone: true })).toMatchObject({
        ok: true,
    });
});

test('validateIdentityFields: ambos opcionales', () => {
    expect(validateIdentityFields({ dni: '', phone: '', requireDni: false, requirePhone: false })).toMatchObject({
        ok: true,
    });
});

test('validateIdentityFields: invalida datos informados aunque no sean requeridos', () => {
    expect(validateIdentityFields({ dni: '123', phone: '', requireDni: false, requirePhone: false })).toMatchObject({
        ok: false,
        code: 'invalid_dni',
    });

    expect(validateIdentityFields({ dni: '', phone: '1234', requireDni: false, requirePhone: false })).toMatchObject({
        ok: false,
        code: 'invalid_phone',
    });
});

test('buildMissingIdentityMessage arma texto segun requisitos', () => {
    expect(buildMissingIdentityMessage({ requireDni: true, requirePhone: true })).toBe('Nombre, Telefono y DNI');
    expect(buildMissingIdentityMessage({ requireDni: false, requirePhone: true })).toBe('Nombre y Telefono');
    expect(buildMissingIdentityMessage({ requireDni: true, requirePhone: false })).toBe('Nombre y DNI');
    expect(buildMissingIdentityMessage({ requireDni: false, requirePhone: false })).toBe('Nombre');
});
