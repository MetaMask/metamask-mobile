/* eslint-disable import-x/no-nodejs-modules */
/**
 * Node-backed mock for `react-native-quick-crypto`.
 *
 * `react-native-quick-crypto` is a native module and cannot execute inside
 * Jest. Every operation this app calls (`scrypt`, `subtle.*`, `createHash`,
 * `createHmac`, `getRandomValues`, `randomBytes`, `randomUUID`) is delegated
 * here to Node's built-in `crypto` module, which is backed by the same
 * OpenSSL implementation that `react-native-quick-crypto` 1.x wraps natively.
 *
 * This lets output-parity tests assert byte-exact results against published
 * RFC/NIST known-answer vectors — proving the *algorithm contract* that
 * `react-native-quick-crypto` 0.7.15, 1.1.5, and the removed
 * `react-native-fast-crypto` all must satisfy — without ever loading a
 * native module.
 *
 * Usage (mirrors the pattern already used by scrypt-adapter.test.ts):
 * jest.mock('react-native-quick-crypto', () => require('../../../util/test/nodeQuickCryptoMock'));
 */
import crypto from 'crypto';

export interface ScryptOptions {
  N: number;
  r: number;
  p: number;
  maxmem: number;
}

export type ScryptCallback = (err: Error | null, derivedKey: Buffer) => void;

/**
 * Delegates to Node's `crypto.scrypt`, matching the callback-style signature
 * of `QuickCrypto.scrypt` used by the profile-sync scrypt adapter.
 */
export const scrypt = (
  passwd: Buffer | Uint8Array,
  salt: Buffer | Uint8Array,
  keylen: number,
  options: ScryptOptions,
  callback: ScryptCallback,
): void => {
  crypto.scrypt(
    Buffer.from(passwd),
    Buffer.from(salt),
    keylen,
    { N: options.N, r: options.r, p: options.p, maxmem: options.maxmem },
    (err, derivedKey) => callback(err, derivedKey as Buffer),
  );
};

const rawSubtle = crypto.webcrypto.subtle;

/**
 * Encode a string as UTF-8 bytes; passes through non-string `BinaryLike`
 * values unchanged.
 *
 * `react-native-quick-crypto`'s own PBKDF2 implementation normalizes any
 * `BinaryLike` input (including plain strings) via
 * `binaryLikeToArrayBuffer`, which UTF-8-encodes strings
 * (`node_modules/react-native-quick-crypto/src/Utils.ts`). Node's native
 * WebCrypto `subtle.deriveBits` has no such leniency and throws a
 * `TypeError` for a string `salt`. Wrapper code such as
 * `app/core/Encryptor/lib/quick-crypto.ts#deriveKey` passes a raw string
 * salt straight through, matching quick-crypto's real (lenient) behavior —
 * so this normalization is required for the mock to be a faithful stand-in.
 */
function normalizeBinaryLike(value: unknown): unknown {
  return typeof value === 'string' ? new TextEncoder().encode(value) : value;
}

function hasSaltProperty(
  value: unknown,
): value is { salt: unknown } & Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'salt' in value;
}

type DeriveBitsAlgorithm = Parameters<typeof rawSubtle.deriveBits>[0];
type DeriveBitsBaseKey = Parameters<typeof rawSubtle.deriveBits>[1];

const deriveBits = (
  algorithm: DeriveBitsAlgorithm,
  baseKey: DeriveBitsBaseKey,
  length: number,
): Promise<ArrayBuffer> => {
  const normalizedAlgorithm = hasSaltProperty(algorithm)
    ? { ...algorithm, salt: normalizeBinaryLike(algorithm.salt) }
    : algorithm;
  return rawSubtle.deriveBits(
    normalizedAlgorithm as DeriveBitsAlgorithm,
    baseKey,
    length,
  );
};

/**
 * Node's WebCrypto `subtle` implements the same W3C Web Crypto API surface
 * that `react-native-quick-crypto` exposes (`importKey`, `deriveBits`,
 * `encrypt`, `decrypt`, `exportKey`, `digest`, `sign`, `verify`), backed by
 * the same OpenSSL primitives used by quick-crypto's native module.
 * `deriveBits` is wrapped to additionally accept a string `salt` (see
 * `normalizeBinaryLike` above).
 */
export const subtle = {
  digest: rawSubtle.digest.bind(rawSubtle),
  importKey: rawSubtle.importKey.bind(rawSubtle),
  exportKey: rawSubtle.exportKey.bind(rawSubtle),
  encrypt: rawSubtle.encrypt.bind(rawSubtle),
  decrypt: rawSubtle.decrypt.bind(rawSubtle),
  sign: rawSubtle.sign.bind(rawSubtle),
  verify: rawSubtle.verify.bind(rawSubtle),
  generateKey: rawSubtle.generateKey.bind(rawSubtle),
  deriveKey: rawSubtle.deriveKey.bind(rawSubtle),
  wrapKey: rawSubtle.wrapKey.bind(rawSubtle),
  unwrapKey: rawSubtle.unwrapKey.bind(rawSubtle),
  deriveBits,
};

export const getRandomValues: typeof crypto.webcrypto.getRandomValues = (
  array,
) => crypto.webcrypto.getRandomValues(array);

export const randomBytes = (size: number): Buffer => crypto.randomBytes(size);

export const randomUUID = (): string => crypto.randomUUID();

export const createHash = (algorithm: string) => crypto.createHash(algorithm);

export const createHmac = (algorithm: string, key: crypto.BinaryLike) =>
  crypto.createHmac(algorithm, key);

/**
 * Encode a hex string (optionally containing whitespace) to a `Uint8Array`.
 * Shared across parity test files to avoid re-implementing per-file helpers.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Encode a `Uint8Array` (or Node `Buffer`) to a lowercase hex string. Shared
 * across parity test files to avoid re-implementing per-file helpers.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const nodeQuickCryptoMock = {
  scrypt,
  subtle,
  getRandomValues,
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
};

export default nodeQuickCryptoMock;
