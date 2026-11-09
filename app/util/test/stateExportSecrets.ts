/**
 * Shared rules for spotting secret values in exported test state. Used by the
 * test-only raw state export and by fixture diff reports, so both hide the
 * same values.
 */

export const REDACTED_VALUE = '[redacted]';

/** Lower-cased state keys whose values are always secret. */
const SECRET_VALUE_KEYS = new Set([
  'accesstoken',
  'authtoken',
  'bearertoken',
  'encryptedkeyringencryptionkey',
  'encryptedseedlessencryptionkey',
  'encryptionkey',
  'encryptionsalt',
  'idtoken',
  'jwt',
  'metadataaccesstoken',
  'mnemonic',
  'otp',
  'pendingsecretimports',
  'privatekey',
  'refreshtoken',
  'revoketoken',
  'vault',
  'vaultencryptionkey',
  'vaultencryptionsalt',
]);

const JWT_SOURCE = 'eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]+';

/**
 * @param key - A state key, or a dot path whose last segment is the key.
 * @returns Whether values stored under this key are secret.
 */
export function isSecretStateKey(key: string): boolean {
  const lastSegment = key.slice(key.lastIndexOf('.') + 1);
  return SECRET_VALUE_KEYS.has(lastSegment.toLowerCase());
}

/**
 * @param value - Any string.
 * @returns The string with every JWT-shaped token replaced.
 */
export function redactJwts(value: string): string {
  return value.replace(new RegExp(JWT_SOURCE, 'g'), REDACTED_VALUE);
}

/**
 * Replaces secret values in a JSON-like value. Values under secret keys become
 * `null`; JWT-shaped tokens inside strings are replaced.
 *
 * @param value - The value to redact.
 * @returns A redacted copy.
 */
export function redactSecretValues(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactJwts(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecretValues(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = isSecretStateKey(key) ? null : redactSecretValues(entry);
  }
  return redacted;
}
