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
 * `generateKeyPair` and `signJWT`, which produce byte-identical results natively
 * (ed25519 is deterministic). The public key comes from `@metamask/native-utils`
 * (`getPublicKeyEd25519`), the same synchronous native library `shimPerf.js` uses
 * for secp256k1. The signature comes from react-native-quick-crypto (OpenSSL),
 * because native-utils has no ed25519 signing.
 * If either native call throws or returns something malformed, that call is
 * turned off for the session and the original JS implementation is used.
 *
 * Why a Metro redirect and not a `shimPerf.js`-style mutation of `@noble/curves`:
 * relay-auth pins and bundles its own `@noble/curves` (1.8.0), so patching the
 * app's copy would never reach it (see docs/performance/native-crypto.md).
 *
 * The seed is WalletConnect's client identity key. It is only passed to the
 * native module in memory, the same way it is passed to the JS implementation,
 * and is never logged or stored by this file.
 */
// relay-auth is a dependency of @walletconnect/core, not of the app. This
// resolves the hoisted copy, which is core's as long as the lockfile has a
// single relay-auth (the test checks that).
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
import { getPublicKeyEd25519 } from '@metamask/native-utils';
import { Ed, getRandomValues } from 'react-native-quick-crypto';
import Logger from '../util/Logger';

// eslint-disable-next-line import-x/no-extraneous-dependencies
export * from '@walletconnect/relay-auth';

const SEED_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;
const SECRET_KEY_LENGTH = SEED_LENGTH + PUBLIC_KEY_LENGTH;
const SIGNATURE_LENGTH = 64;

type NativeCall = 'publicKey' | 'sign';

// Per call, so a failure in one native library doesn't turn off the other.
const nativeAvailable: Record<NativeCall, boolean> = {
  publicKey: true,
  sign: true,
};

function nativePublicKey(seed: Uint8Array): Uint8Array {
  return new Uint8Array(getPublicKeyEd25519(seed));
}

function nativeSign(data: Uint8Array, seed: Uint8Array): Uint8Array {
  return new Uint8Array(new Ed('ed25519', {}).signSync(data, seed));
}

/**
 * Runs a native call; on any failure turns that call off for the session and
 * reports it once, so a broken native library doesn't silently cost the
 * ~500 ms this shim saves. The report never includes key material.
 */
function tryNative<T>(
  call: NativeCall,
  run: () => T,
  isValid: (result: T) => boolean,
): T | null {
  if (!nativeAvailable[call]) return null;
  let error: Error;
  try {
    const result = run();
    if (isValid(result)) return result;
    error = new Error(`native ${call} returned a malformed result`);
  } catch (cause) {
    error = cause instanceof Error ? cause : new Error(String(cause));
  }
  nativeAvailable[call] = false;
  Logger.error(error, {
    tags: { feature: 'walletconnect', operation: 'relay_auth_native_ed25519' },
    context: {
      name: 'walletconnect_relay_auth',
      data: { call, fallback: 'js' },
    },
  });
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
          'publicKey',
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
  // A key of the wrong shape goes to JS without turning native signing off.
  const signature =
    keyPair.secretKey.length === SECRET_KEY_LENGTH
      ? tryNative(
          'sign',
          () => nativeSign(data, keyPair.secretKey.slice(0, SEED_LENGTH)),
          (sig) => sig.length === SIGNATURE_LENGTH,
        )
      : null;
  if (!signature) return jsSignJWT(sub, aud, ttl, keyPair, iat);
  return encodeJWT({ header, payload, signature });
}

/** Test-only: re-enables the native path after a fallback. */
export function resetNativeEd25519ForTests(): void {
  nativeAvailable.publicKey = true;
  nativeAvailable.sign = true;
}

/** Test-only: whether both calls still go to the native path. */
export function isNativeEd25519ActiveForTests(): boolean {
  return nativeAvailable.publicKey && nativeAvailable.sign;
}
