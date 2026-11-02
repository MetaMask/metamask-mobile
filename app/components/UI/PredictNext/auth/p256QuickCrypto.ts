import QuickCrypto, { type CryptoKey } from 'react-native-quick-crypto';

/**
 * P-256 primitives on native QuickCrypto, so hashing and curve math stay off
 * the JS thread. Byte formats match the `device-p256-salt-v1` contract: a raw
 * 32-byte private scalar, a 65-byte uncompressed public key, and a 64-byte
 * low-S `r || s` signature.
 */

const ECDSA_P256 = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

const P256_SCALAR_LENGTH = 32;

/** P-256 group order n. */
const P256_ORDER = BigInt(
  '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
);
const P256_HALF_ORDER = P256_ORDER >> 1n;

/**
 * PKCS#8 prefix for a P-256 ECPrivateKey that holds only the scalar. OpenSSL
 * derives the public point on import.
 */
const P256_PKCS8_PREFIX = Uint8Array.from(
  Buffer.from(
    '308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420',
    'hex',
  ),
);

export interface P256KeyMaterial {
  privateKey: CryptoKey;
  /** Raw 32-byte private scalar. */
  secretKey: Uint8Array;
  /** Uncompressed SEC1 point: 0x04 || X || Y. */
  publicRaw: Uint8Array;
}

export async function generateP256Key(): Promise<P256KeyMaterial> {
  const pair = (await QuickCrypto.subtle.generateKey(ECDSA_P256, true, [
    'sign',
  ])) as { privateKey: CryptoKey; publicKey: CryptoKey };

  const publicRaw = new Uint8Array(
    (await QuickCrypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer,
  );
  const { d } = (await QuickCrypto.subtle.exportKey(
    'jwk',
    pair.privateKey,
  )) as { d?: string };
  if (!d) {
    throw new Error('P-256 private key export did not include d');
  }

  const secretKey = fromBase64Url(d);
  return {
    // Re-import so the held key is not extractable.
    privateKey: await importPkcs8(secretKey, false),
    secretKey,
    publicRaw,
  };
}

/**
 * Imports a stored raw scalar and derives its public key. Rejects a scalar
 * outside [1, n - 1].
 */
export async function importP256SecretKey(
  secretKey: Uint8Array,
): Promise<P256KeyMaterial> {
  if (!isValidP256SecretKey(secretKey)) {
    throw new Error('invalid P-256 private key');
  }

  const extractable = await importPkcs8(secretKey, true);
  const { x, y } = (await QuickCrypto.subtle.exportKey('jwk', extractable)) as {
    x?: string;
    y?: string;
  };
  if (!x || !y) {
    throw new Error('P-256 private key export did not include x and y');
  }

  return {
    privateKey: await importPkcs8(secretKey, false),
    secretKey: new Uint8Array(secretKey),
    publicRaw: concatBytes(
      Uint8Array.of(0x04),
      leftPad(fromBase64Url(x)),
      leftPad(fromBase64Url(y)),
    ),
  };
}

/**
 * ECDSA P-256 over SHA-256 of `data`, as 64-byte `r || s` with s normalized
 * to the lower half of the order.
 */
export async function signP256(
  privateKey: CryptoKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const signature = new Uint8Array(
    await QuickCrypto.subtle.sign(ECDSA_SHA256, privateKey, data),
  );
  if (signature.length !== P256_SCALAR_LENGTH * 2) {
    throw new Error('expected a 64-byte P-256 signature');
  }
  return normalizeLowS(signature);
}

export function sha256(...parts: Uint8Array[]): Uint8Array {
  const hash = QuickCrypto.createHash('sha256');
  for (const part of parts) {
    hash.update(part);
  }
  return new Uint8Array(hash.digest());
}

export function randomBytes(length: number): Uint8Array {
  return new Uint8Array(QuickCrypto.randomBytes(length));
}

/** Overwrites each buffer with zeroes. */
export function clean(...buffers: Uint8Array[]): void {
  for (const buffer of buffers) {
    buffer.fill(0);
  }
}

/** Replaces s with n - s when s is above n / 2. */
export function normalizeLowS(signature: Uint8Array): Uint8Array {
  const r = signature.subarray(0, P256_SCALAR_LENGTH);
  const s = bytesToBigInt(signature.subarray(P256_SCALAR_LENGTH));
  if (s <= P256_HALF_ORDER) {
    return signature;
  }
  return concatBytes(r, bigIntToBytes(P256_ORDER - s));
}

function isValidP256SecretKey(secretKey: Uint8Array): boolean {
  if (secretKey.length !== P256_SCALAR_LENGTH) {
    return false;
  }
  const scalar = bytesToBigInt(secretKey);
  return scalar > 0n && scalar < P256_ORDER;
}

function importPkcs8(
  secretKey: Uint8Array,
  extractable: boolean,
): Promise<CryptoKey> {
  const der = concatBytes(P256_PKCS8_PREFIX, secretKey);
  return QuickCrypto.subtle
    .importKey('pkcs8', der, ECDSA_P256, extractable, ['sign'])
    .finally(() => clean(der));
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function leftPad(bytes: Uint8Array): Uint8Array {
  if (bytes.length > P256_SCALAR_LENGTH) {
    throw new Error('P-256 coordinate is too long');
  }
  const out = new Uint8Array(P256_SCALAR_LENGTH);
  out.set(bytes, P256_SCALAR_LENGTH - bytes.length);
  return out;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${Buffer.from(bytes).toString('hex') || '0'}`);
}

function bigIntToBytes(value: bigint): Uint8Array {
  return Uint8Array.from(
    Buffer.from(
      value.toString(16).padStart(P256_SCALAR_LENGTH * 2, '0'),
      'hex',
    ),
  );
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return new Uint8Array(
    Buffer.from(padded.replaceAll('-', '+').replaceAll('_', '/'), 'base64'),
  );
}
