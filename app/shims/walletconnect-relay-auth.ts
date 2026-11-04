/**
 * `@walletconnect/relay-auth` with ed25519 done natively.
 *
 * WalletConnect signs a relay auth JWT every time its relayer connects
 * (`core.crypto.signJWT` in `createProvider`: unlock, foreground, network
 * changes) and derives the client's public key in `getClientId`. relay-auth does
 * both with a bundled pure-JS ed25519, which costs about 500 ms on the JS thread
 * for the first call in a process (precomputed tables plus two scalar
 * multiplications), measured with a Hermes profile right after unlock.
 *
 * Metro resolves `@walletconnect/relay-auth` to this file (see
 * `metro.config.js`). Everything is re-exported unchanged except
 * `generateKeyPair` and `signJWT`, which call react-native-quick-crypto
 * (OpenSSL) and produce byte-identical results: ed25519 is deterministic. If the
 * native path throws or returns something malformed, it is turned off for the
 * session and the original JS implementation is used.
 *
 * The seed is WalletConnect's client identity key. It is only passed to the
 * native module in memory, the same way it is passed to the JS implementation,
 * and is never logged or stored by this file.
 */
// relay-auth is a dependency of @walletconnect/core, not of the app; importing
// the same copy core resolves keeps this shim on core's version.
// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  JWT_IRIDIUM_ALG,
  JWT_IRIDIUM_TYP,
  encodeData,
  encodeIss,
  encodeJWT,
  generateKeyPair as jsGenerateKeyPair,
  signJWT as jsSignJWT,
  type Keypair,
} from '@walletconnect/relay-auth';
import {
  Ed,
  createPrivateKey,
  createPublicKey,
  getRandomValues,
} from 'react-native-quick-crypto';

// eslint-disable-next-line import-x/no-extraneous-dependencies
export * from '@walletconnect/relay-auth';

const SEED_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;
const SIGNATURE_LENGTH = 64;

let nativeAvailable = true;

function nativePublicKey(seed: Uint8Array): Uint8Array {
  const privateKey = createPrivateKey({
    key: seed,
    format: 'raw-private',
    asymmetricKeyType: 'ed25519',
  });
  return new Uint8Array(
    createPublicKey(privateKey).export({ format: 'raw-public' }),
  );
}

function nativeSign(data: Uint8Array, seed: Uint8Array): Uint8Array {
  return new Uint8Array(new Ed('ed25519', {}).signSync(data, seed));
}

/** Runs the native path; on any failure turns it off for the session. */
function tryNative<T>(run: () => T, isValid: (result: T) => boolean): T | null {
  if (!nativeAvailable) return null;
  try {
    const result = run();
    if (isValid(result)) return result;
  } catch {
    // Fall through to the JS implementation.
  }
  nativeAvailable = false;
  return null;
}

function randomSeed(): Uint8Array {
  const seed = new Uint8Array(SEED_LENGTH);
  getRandomValues(seed);
  return seed;
}

export function generateKeyPair(seed: Uint8Array = randomSeed()): Keypair {
  const publicKey =
    seed.length === SEED_LENGTH
      ? tryNative(
          () => nativePublicKey(seed),
          (key) => key.length === PUBLIC_KEY_LENGTH,
        )
      : null;
  if (!publicKey) return jsGenerateKeyPair(seed);
  const secretKey = new Uint8Array(SEED_LENGTH + PUBLIC_KEY_LENGTH);
  secretKey.set(seed, 0);
  secretKey.set(publicKey, SEED_LENGTH);
  return { secretKey, publicKey };
}

export async function signJWT(
  sub: string,
  aud: string,
  ttl: number,
  keyPair: Keypair,
  // Same as @walletconnect/time's fromMiliseconds(Date.now()).
  iat: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = {
    alg: JWT_IRIDIUM_ALG,
    typ: JWT_IRIDIUM_TYP,
  };
  const iss = encodeIss(keyPair.publicKey);
  const payload = { iss, sub, aud, iat, exp: iat + ttl };
  const data = encodeData({ header, payload });
  const seed = keyPair.secretKey.slice(0, SEED_LENGTH);
  const signature = tryNative(
    () => nativeSign(data, seed),
    (sig) => sig.length === SIGNATURE_LENGTH,
  );
  if (!signature) return jsSignJWT(sub, aud, ttl, keyPair, iat);
  return encodeJWT({ header, payload, signature });
}

/** Test-only: re-enables the native path after a fallback. */
export function resetNativeEd25519ForTests(): void {
  nativeAvailable = true;
}

/** Test-only: whether calls still go to the native path. */
export function isNativeEd25519ActiveForTests(): boolean {
  return nativeAvailable;
}
