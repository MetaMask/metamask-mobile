// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  decodeJWT,
  encodeIss,
  generateKeyPair as jsGenerateKeyPair,
  signJWT as jsSignJWT,
  verifyJWT,
} from '@walletconnect/relay-auth';
import { getPublicKeyEd25519 } from '@metamask/native-utils';
import { Ed } from 'react-native-quick-crypto';
import Logger from '../util/Logger';
import {
  generateKeyPair,
  isNativeEd25519ActiveForTests,
  resetNativeEd25519ForTests,
  signJWT,
} from './walletconnect-relay-auth';

// Back both native libraries with Node's OpenSSL ed25519, an implementation
// independent of relay-auth's bundled JS, so the shim's encoding and key
// handling are checked against the pure-JS relay-auth for real.
const mockNodeEd25519 = () => {
  const nodeCrypto = jest.requireActual('crypto');
  // PKCS#8 wrapper for a raw 32-byte ed25519 seed (RFC 8410).
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const privateKey = (seed: Uint8Array) =>
    nodeCrypto.createPrivateKey({
      key: Buffer.concat([pkcs8Prefix, Buffer.from(seed)]),
      format: 'der',
      type: 'pkcs8',
    });
  return {
    nodeCrypto,
    privateKey,
    // SPKI DER ends with the 32-byte raw public key.
    publicKey: (seed: Uint8Array) =>
      new Uint8Array(
        nodeCrypto
          .createPublicKey(privateKey(seed))
          .export({ format: 'der', type: 'spki' })
          .subarray(-32),
      ),
  };
};

jest.mock('@metamask/native-utils', () => ({
  __esModule: true,
  getPublicKeyEd25519: jest.fn((seed: Uint8Array) => {
    if (!(seed instanceof Uint8Array) || seed.length !== 32) {
      throw new Error('unexpected private key');
    }
    return mockNodeEd25519().publicKey(seed);
  }),
}));

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  Ed: jest.fn().mockImplementation((curve: string) => ({
    signSync: (message: Uint8Array, seed: Uint8Array) => {
      if (curve !== 'ed25519') throw new Error('unexpected curve');
      const { nodeCrypto, privateKey } = mockNodeEd25519();
      return nodeCrypto.sign(null, Buffer.from(message), privateKey(seed));
    },
  })),
  getRandomValues: jest.fn((array: Uint8Array) =>
    jest.requireActual('crypto').getRandomValues(array),
  ),
}));

jest.mock('../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const settle = (promise: Promise<string>) =>
  promise.then(
    (value) => ({ value }),
    (error: Error) => ({ error: error.message }),
  );

const seeds = [
  new Uint8Array(32),
  Uint8Array.from({ length: 32 }, (_, i) => i + 1),
  Uint8Array.from({ length: 32 }, (_, i) => (i * 37 + 11) % 256),
];
const AUD = 'wss://relay.walletconnect.org';
const SUB = 'b6a1c3f0d9e24a7f8c5b0e1d2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a';
const TTL = 86400;
const IAT = 1793781361;

describe('walletconnect-relay-auth shim', () => {
  beforeEach(() => {
    resetNativeEd25519ForTests();
    jest.clearAllMocks();
  });

  it.each(seeds.map((seed, i) => [i, seed]))(
    'generateKeyPair matches the JS implementation (seed %i)',
    (_, seed) => {
      const native = generateKeyPair(seed);
      const js = jsGenerateKeyPair(seed);
      expect(Array.from(native.publicKey)).toEqual(Array.from(js.publicKey));
      expect(Array.from(native.secretKey)).toEqual(Array.from(js.secretKey));
      expect(getPublicKeyEd25519).toHaveBeenCalledWith(seed);
      expect(isNativeEd25519ActiveForTests()).toBe(true);
      expect(Logger.error).not.toHaveBeenCalled();
    },
  );

  it.each(seeds.map((seed, i) => [i, seed]))(
    'signJWT produces the same JWT as the JS implementation (seed %i)',
    async (_, seed) => {
      const keyPair = jsGenerateKeyPair(seed);
      const native = await signJWT(SUB, AUD, TTL, keyPair, IAT);
      const js = await jsSignJWT(SUB, AUD, TTL, keyPair, IAT);
      expect(native).toBe(js);
      expect(Ed).toHaveBeenCalledWith('ed25519', {});
      expect(isNativeEd25519ActiveForTests()).toBe(true);
      expect(Logger.error).not.toHaveBeenCalled();
      await expect(verifyJWT(native)).resolves.toBe(true);
    },
  );

  it('uses the current time for iat by default, like the JS implementation', async () => {
    const keyPair = generateKeyPair(seeds[1]);
    const jwt = await signJWT(SUB, AUD, TTL, keyPair);
    const { payload } = decodeJWT(jwt);
    expect(Math.abs(payload.iat - Date.now() / 1000)).toBeLessThan(5);
    expect(payload.exp).toBe(payload.iat + TTL);
    expect(payload.iss).toBe(encodeIss(keyPair.publicKey));
  });

  it('generates a random seed when none is given', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.publicKey).toHaveLength(32);
    expect(keyPair.secretKey).toHaveLength(64);
    const js = jsGenerateKeyPair(keyPair.secretKey.slice(0, 32));
    expect(Array.from(keyPair.publicKey)).toEqual(Array.from(js.publicKey));
  });

  it('falls back to JS key derivation for the session when native-utils throws, and keeps native signing', async () => {
    (getPublicKeyEd25519 as jest.Mock).mockImplementationOnce(() => {
      throw new Error('native module missing');
    });
    const keyPair = generateKeyPair(seeds[2]);
    expect(Array.from(keyPair.publicKey)).toEqual(
      Array.from(jsGenerateKeyPair(seeds[2]).publicKey),
    );
    // Key derivation stays on JS after the first failure.
    generateKeyPair(seeds[1]);
    expect(getPublicKeyEd25519).toHaveBeenCalledTimes(1);
    expect(isNativeEd25519ActiveForTests()).toBe(false);
    // Reported once, without key material.
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('native module missing'),
      expect.objectContaining({
        context: {
          name: 'walletconnect_relay_auth',
          data: { call: 'publicKey', fallback: 'js' },
        },
      }),
    );

    // Signing is a separate native call and is unaffected.
    const jwt = await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(jwt).toBe(await jsSignJWT(SUB, AUD, TTL, keyPair, IAT));
    expect(Ed).toHaveBeenCalledWith('ed25519', {});
  });

  it('falls back to JS signing for the session when quick-crypto throws, and keeps native key derivation', async () => {
    (Ed as unknown as jest.Mock).mockImplementationOnce(() => ({
      signSync: () => {
        throw new Error('native module missing');
      },
    }));
    const keyPair = jsGenerateKeyPair(seeds[0]);
    const jwt = await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(jwt).toBe(await jsSignJWT(SUB, AUD, TTL, keyPair, IAT));
    await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(Ed).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect((Logger.error as jest.Mock).mock.calls[0][1].context.data).toEqual({
      call: 'sign',
      fallback: 'js',
    });

    generateKeyPair(seeds[1]);
    expect(getPublicKeyEd25519).toHaveBeenCalledWith(seeds[1]);
  });

  it('falls back when the native signature is malformed', async () => {
    (Ed as unknown as jest.Mock).mockImplementationOnce(() => ({
      signSync: () => new Uint8Array(10),
    }));
    const keyPair = jsGenerateKeyPair(seeds[1]);
    const jwt = await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(jwt).toBe(await jsSignJWT(SUB, AUD, TTL, keyPair, IAT));
    expect(Logger.error).toHaveBeenCalledWith(
      new Error('native sign returned a malformed result'),
      expect.anything(),
    );
  });

  it('falls back when the native public key is malformed', () => {
    (getPublicKeyEd25519 as jest.Mock).mockImplementationOnce(
      () => new Uint8Array(31),
    );
    const keyPair = generateKeyPair(seeds[1]);
    expect(Array.from(keyPair.publicKey)).toEqual(
      Array.from(jsGenerateKeyPair(seeds[1]).publicKey),
    );
  });

  it('signs a key of the wrong length with JS and keeps native signing on', async () => {
    const keyPair = jsGenerateKeyPair(seeds[1]);
    const shortKey = {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey.slice(0, 32),
    };
    expect(await settle(signJWT(SUB, AUD, TTL, shortKey, IAT))).toEqual(
      await settle(jsSignJWT(SUB, AUD, TTL, shortKey, IAT)),
    );
    expect(Ed).not.toHaveBeenCalled();
    expect(isNativeEd25519ActiveForTests()).toBe(true);
    expect(Logger.error).not.toHaveBeenCalled();

    // A well-formed key afterwards still signs natively.
    await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(Ed).toHaveBeenCalledWith('ed25519', {});
  });

  it('resolves the single relay-auth copy that @walletconnect/core uses', () => {
    // The shim imports the hoisted relay-auth. If the lockfile ever holds a
    // second version, core could get a different copy than the shim wraps.
    const { readFileSync } = jest.requireActual('fs');
    const { resolve } = jest.requireActual('path');
    const lockfile: string = readFileSync(
      resolve(__dirname, '../../yarn.lock'),
      'utf8',
    );
    const entries = lockfile.match(/^"@walletconnect\/relay-auth@[^"]*":$/gm);
    expect(entries).toHaveLength(1);
  });

  it('re-exports the rest of relay-auth unchanged', async () => {
    const shim = await import('./walletconnect-relay-auth');
    expect(shim.verifyJWT).toBe(verifyJWT);
    expect(shim.decodeJWT).toBe(decodeJWT);
    expect(shim.encodeIss).toBe(encodeIss);
  });
});
