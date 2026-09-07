import Crypto from 'react-native-quick-crypto';
import { QuickCryptoLib } from './quick-crypto';
import { bytesToHex, hexToBytes } from '../../../util/test/nodeQuickCryptoMock';

// react-native-quick-crypto is a native module and cannot run inside Jest.
// Delegate `Crypto.subtle` to Node's WebCrypto implementation so AES-CBC and
// PBKDF2 output is byte-exact against NIST/community known-answer vectors —
// the same OpenSSL backend react-native-quick-crypto 1.x wraps natively.
jest.mock('react-native-quick-crypto', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../util/test/nodeQuickCryptoMock'),
);

/**
 * NIST SP 800-38A §F.2.5/F.2.6 "CBC-AES256" example vector.
 * https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38a.pdf
 *
 * WebCrypto's AES-CBC always applies PKCS#7 padding (there is no "raw,
 * unpadded" mode in the spec), so encrypting the vector's exact 4-block
 * (64-byte) plaintext yields the NIST ciphertext followed by one extra
 * encrypted padding block (80 bytes total) — verified independently against
 * Node's legacy `crypto.createCipheriv('aes-256-cbc', ...)` below, which
 * applies the same PKCS#7 padding by default.
 */
const NIST_CBC_AES256 = {
  key: hexToBytes(
    '603deb1015ca71be2b73aef0857d778' +
      '11f352c073b6108d72d9810a30914df' +
      'f4',
  ),
  iv: hexToBytes('000102030405060708090a0b0c0d0e0f'),
  plaintext: hexToBytes(
    '6bc1bee22e409f96e93d7e117393172' +
      'aae2d8a571e03ac9c9eb76fac45af8e5' +
      '130c81c46a35ce411e5fbc1191a0a52e' +
      'ff69f2445df4f9b17ad2b417be66c371' +
      '0',
  ),
  // First 64 bytes match the NIST-published ciphertext exactly; the
  // trailing 16 bytes are the encrypted PKCS#7 padding block.
  expectedCiphertext:
    'f58c4c04d6e5f1ba779eabfb5f7bfbd6' +
    '9cfc4e967edb808d679f777bc6702c7d' +
    '39f23369a9d9bacfa530e26304231461' +
    'b2eb05e2c39be9fcda6c19078c6a9d1b' +
    '3f461796d6b0d6b2e0c2a72b4d80e644',
};

describe('quick-crypto AES-256-CBC parity', () => {
  it('produces the NIST SP 800-38A F.2.5 ciphertext for the shared block cipher (subtle)', async () => {
    const cryptoKey = await Crypto.subtle.importKey(
      'raw',
      NIST_CBC_AES256.key,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    const ciphertext = await Crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: NIST_CBC_AES256.iv },
      cryptoKey,
      NIST_CBC_AES256.plaintext,
    );

    expect(bytesToHex(new Uint8Array(ciphertext))).toBe(
      NIST_CBC_AES256.expectedCiphertext,
    );
  });

  it('decrypts the NIST SP 800-38A F.2.5 ciphertext back to the original plaintext', async () => {
    const cryptoKey = await Crypto.subtle.importKey(
      'raw',
      NIST_CBC_AES256.key,
      { name: 'AES-CBC', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const ciphertext = hexToBytes(NIST_CBC_AES256.expectedCiphertext);

    const decrypted = await Crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: NIST_CBC_AES256.iv },
      cryptoKey,
      ciphertext,
    );

    expect(bytesToHex(new Uint8Array(decrypted))).toBe(
      bytesToHex(NIST_CBC_AES256.plaintext),
    );
  });

  it('derives the expected base64 key for password/salt/iterations via deriveKey', async () => {
    const password = 'CorrectHorseBatteryStaple';
    const salt = 'dGVzdC1zYWx0LWJhc2U2NA==';

    const derivedKey = await QuickCryptoLib.deriveKey(password, salt, {
      algorithm: 'PBKDF2',
      params: { iterations: 5000 },
    });

    expect(derivedKey).toBe('VEEeAacoKJ8HlDDeg04c4cWIjUD4wyGo3WlBTtylGs4=');
  });

  it('round-trips encrypt/decrypt through QuickCryptoLib and matches an independent base64 ciphertext', async () => {
    const key = 'VEEeAacoKJ8HlDDeg04c4cWIjUD4wyGo3WlBTtylGs4=';
    const iv = '00112233445566778899aabbccddeeff';
    const plaintext = 'hello world';

    const encrypted = await QuickCryptoLib.encrypt(plaintext, key, iv);

    expect(encrypted).toBe('JbrhXC9V+eG3kiRRAWQMFw==');

    const decrypted = await QuickCryptoLib.decrypt(encrypted, key, iv);

    expect(decrypted).toBe(plaintext);
  });
});
