export function getEnv(name, options = {}) {
  const {
    required = true,
    defaultValue,
    allowEmpty = false,
    transform
  } = options;

  const raw = process.env[name];

  if (raw === undefined || raw === null) {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return defaultValue;
  }

  const value = String(raw);
  if (!allowEmpty && value.trim() === '') {
    if (required) {
      throw new Error(`Empty required environment variable: ${name}`);
    }
    return defaultValue;
  }

  return typeof transform === 'function' ? transform(value) : value;
}

export function getAllowedOrigins() {
  const value = getEnv('ALLOWED_ORIGINS', { required: false, defaultValue: '' });
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
