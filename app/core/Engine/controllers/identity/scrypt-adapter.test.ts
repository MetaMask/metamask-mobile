import { scrypt } from './user-storage-controller-init';

// Override the global testSetup mock so QuickCrypto.scrypt delegates to
// Node's built-in crypto.scrypt.  This gives us RFC 7914 byte-for-byte
// correctness without any native module.
jest.mock('react-native-quick-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    scrypt: (
      passwd: Buffer,
      salt: Buffer,
      keylen: number,
      options: { N: number; r: number; p: number; maxmem: number },
      callback: (err: Error | null, derivedKey: Buffer) => void,
    ) => {
      nodeCrypto.scrypt(
        passwd,
        salt,
        keylen,
        { N: options.N, r: options.r, p: options.p, maxmem: options.maxmem },
        (err, derivedKey) => callback(err, derivedKey as Buffer),
      );
    },
  };
});

jest.mock('@craftzdog/react-native-buffer', () => ({
  Buffer,
}));

/**
 * Decode a hex string (with optional whitespace) to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Encode a Uint8Array to a lowercase hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Scrypt known-vector test cases.
 *
 * Vectors 1–3 are derived from RFC 7914 §12 inputs run through OpenSSL
 * (Node.js crypto.scrypt), which is the same OpenSSL implementation used by
 * react-native-quick-crypto 1.x.  Using the same underlying library ensures
 * byte-for-byte parity between the test mock and the real native module.
 *
 * Each vector is described as scrypt(P, S, N, r, p, dkLen).
 */
const RFC_7914_VECTORS = [
  {
    label: 'vector 1 — empty password/salt, N=16 r=1 p=1 dkLen=64',
    passwd: '',
    salt: '',
    N: 16,
    r: 1,
    p: 1,
    dkLen: 64,
    // Matches RFC 7914 §12 vector 1 exactly.
    expected:
      '77d6576238657b203b19ca42c18a0497' +
      'f16b4844e3074ae8dfdffa3fede21442' +
      'fcd0069ded0948f8326a753a0fc81f17' +
      'e8d3e0fb2e0d3628cf35e20c38d18906',
  },
  {
    label: 'vector 2 — password/NaCl, N=1024 r=8 p=16 dkLen=64',
    passwd: 'password',
    salt: 'NaCl',
    N: 1024,
    r: 8,
    p: 16,
    dkLen: 64,
    // OpenSSL output for RFC 7914 §12 vector 2 inputs.
    expected:
      'fdbabe1c9d3472007856e7190d01e9fe' +
      '7c6ad7cbc8237830e77376634b373162' +
      '2eaf30d92e22a3886ff109279d9830da' +
      'c727afb94a83ee6d8360cbdfa2cc0640',
  },
  {
    label: 'vector 3 — pleaseletmein/SodiumChloride, N=16384 r=8 p=1 dkLen=64',
    passwd: 'pleaseletmein',
    salt: 'SodiumChloride',
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
    // OpenSSL output for RFC 7914 §12 vector 3 inputs.
    expected:
      '7023bdcb3afd7348461c06cd81fd38eb' +
      'fda8fbba904f8e3ea9b543f6545da1f2' +
      'd5432955613f0fcf62d49705242a9af9' +
      'e61e85dc0d651e40dfcf017b45575887',
  },
] as const;

describe('scrypt adapter', () => {
  describe('RFC 7914 §12 known-vector correctness', () => {
    it.each(RFC_7914_VECTORS)(
      'produces the correct derived key for $label',
      async ({ passwd, salt, N, r, p, dkLen, expected }) => {
        const passwdBytes = new TextEncoder().encode(passwd);
        const saltBytes = new TextEncoder().encode(salt);

        const result = await scrypt(passwdBytes, saltBytes, N, r, p, dkLen);

        expect(bytesToHex(result)).toBe(expected);
      },
    );
  });

  describe('parameter passing', () => {
    it('passes N, r, p, size, and maxmem=256MiB to QuickCrypto.scrypt', async () => {
      const QuickCrypto = jest.requireMock<{ scrypt: jest.Mock }>(
        'react-native-quick-crypto',
      );
      const scryptSpy = jest.spyOn(QuickCrypto, 'scrypt');

      const passwd = new TextEncoder().encode('pw');
      const salt = new TextEncoder().encode('salt');

      await scrypt(passwd, salt, 8192, 8, 1, 32);

      expect(scryptSpy).toHaveBeenCalledTimes(1);
      const [, , keylen, options] = scryptSpy.mock.calls[0];
      expect(keylen).toBe(32);
      expect(options).toMatchObject({
        N: 8192,
        r: 8,
        p: 1,
        maxmem: 256 * 1024 * 1024,
      });
    });

    it('rejects when QuickCrypto.scrypt returns an error', async () => {
      const QuickCrypto = jest.requireMock<{ scrypt: jest.Mock }>(
        'react-native-quick-crypto',
      );
      jest
        .spyOn(QuickCrypto, 'scrypt')
        .mockImplementationOnce((_p, _s, _k, _o, callback) => {
          callback(new Error('native scrypt failed'), Buffer.alloc(0));
        });

      const passwd = new TextEncoder().encode('pw');
      const salt = new TextEncoder().encode('salt');

      await expect(scrypt(passwd, salt, 16, 1, 1, 32)).rejects.toThrow(
        'native scrypt failed',
      );
    });

    it('wraps the callback-style API in a Promise that resolves with Uint8Array', async () => {
      const passwd = new TextEncoder().encode('');
      const salt = new TextEncoder().encode('');

      const result = await scrypt(passwd, salt, 16, 1, 1, 64);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(64);
    });
  });
});
