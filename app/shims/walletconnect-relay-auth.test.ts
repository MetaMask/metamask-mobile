// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  decodeJWT,
  encodeIss,
  generateKeyPair as jsGenerateKeyPair,
  signJWT as jsSignJWT,
  verifyJWT,
} from '@walletconnect/relay-auth';
import {
  Ed,
  createPrivateKey,
  createPublicKey,
} from 'react-native-quick-crypto';
import {
  generateKeyPair,
  isNativeEd25519ActiveForTests,
  resetNativeEd25519ForTests,
  signJWT,
} from './walletconnect-relay-auth';

// Back quick-crypto with Node's OpenSSL ed25519, so the shim's encoding and key
// handling are checked against the pure-JS relay-auth for real.
jest.mock('react-native-quick-crypto', () => {
  const nodeCrypto = jest.requireActual('crypto');
  // PKCS#8 wrapper for a raw 32-byte ed25519 seed (RFC 8410).
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const nodePrivateKey = (seed: Uint8Array) =>
    nodeCrypto.createPrivateKey({
      key: Buffer.concat([pkcs8Prefix, Buffer.from(seed)]),
      format: 'der',
      type: 'pkcs8',
    });
  return {
    __esModule: true,
    createPrivateKey: jest.fn(
      (input: {
        key: Uint8Array;
        format: string;
        asymmetricKeyType: string;
      }) => {
        if (
          input.format !== 'raw-private' ||
          input.asymmetricKeyType !== 'ed25519'
        ) {
          throw new Error('unexpected key input');
        }
        return { nodeKey: nodePrivateKey(input.key) };
      },
    ),
    createPublicKey: jest.fn((privateKey: { nodeKey: unknown }) => ({
      export: (options: { format: string }) => {
        if (options.format !== 'raw-public')
          throw new Error('unexpected format');
        // SPKI DER ends with the 32-byte raw public key.
        return nodeCrypto
          .createPublicKey(privateKey.nodeKey)
          .export({ format: 'der', type: 'spki' })
          .subarray(-32);
      },
    })),
    Ed: jest.fn().mockImplementation((curve: string) => ({
      signSync: (message: Uint8Array, seed: Uint8Array) => {
        if (curve !== 'ed25519') throw new Error('unexpected curve');
        return nodeCrypto.sign(
          null,
          Buffer.from(message),
          nodePrivateKey(seed),
        );
      },
    })),
    getRandomValues: jest.fn((array: Uint8Array) =>
      nodeCrypto.getRandomValues(array),
    ),
  };
});

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
      expect(createPrivateKey).toHaveBeenCalled();
      expect(isNativeEd25519ActiveForTests()).toBe(true);
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

  it('falls back to the JS implementation for the session when the native call throws', async () => {
    (createPrivateKey as jest.Mock).mockImplementationOnce(() => {
      throw new Error('native module missing');
    });
    const keyPair = generateKeyPair(seeds[2]);
    expect(Array.from(keyPair.publicKey)).toEqual(
      Array.from(jsGenerateKeyPair(seeds[2]).publicKey),
    );

    const jwt = await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(jwt).toBe(await jsSignJWT(SUB, AUD, TTL, keyPair, IAT));
    // The native path stays off after the first failure.
    expect(Ed).not.toHaveBeenCalled();
    expect(isNativeEd25519ActiveForTests()).toBe(false);
    expect(createPrivateKey).toHaveBeenCalledTimes(1);
  });

  it('falls back when the native signature is malformed', async () => {
    (Ed as unknown as jest.Mock).mockImplementationOnce(() => ({
      signSync: () => new Uint8Array(10),
    }));
    const keyPair = jsGenerateKeyPair(seeds[1]);
    const jwt = await signJWT(SUB, AUD, TTL, keyPair, IAT);
    expect(jwt).toBe(await jsSignJWT(SUB, AUD, TTL, keyPair, IAT));
  });

  it('falls back when the native public key is malformed', () => {
    (createPublicKey as jest.Mock).mockImplementationOnce(() => ({
      export: () => new Uint8Array(31),
    }));
    const keyPair = generateKeyPair(seeds[1]);
    expect(Array.from(keyPair.publicKey)).toEqual(
      Array.from(jsGenerateKeyPair(seeds[1]).publicKey),
    );
  });

  it('re-exports the rest of relay-auth unchanged', async () => {
    const shim = await import('./walletconnect-relay-auth');
    expect(shim.verifyJWT).toBe(verifyJWT);
    expect(shim.decodeJWT).toBe(decodeJWT);
    expect(shim.encodeIss).toBe(encodeIss);
  });
});
