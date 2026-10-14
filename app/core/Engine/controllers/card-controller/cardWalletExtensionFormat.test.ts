/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports --
 * Jest's quick-crypto mock is not PBKDF2. This file decrypts a committed Swift vault with Node crypto.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Encryptor } from '../../../Encryptor';
import { LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor/constants';

jest.mock('react-native-quick-crypto', () => {
  const crypto = require('node:crypto') as typeof import('node:crypto');

  const subtle = {
    importKey: async (_format: string, keyData: ArrayBuffer) => ({ keyData }),
    deriveBits: async (
      algorithm: { salt: string; iterations: number },
      baseKey: { keyData: ArrayBuffer },
      length: number,
    ) =>
      crypto.pbkdf2Sync(
        Buffer.from(baseKey.keyData),
        Buffer.from(algorithm.salt, 'utf8'),
        algorithm.iterations,
        length / 8,
        'sha512',
      ),
    encrypt: async (
      algorithm: { iv: ArrayBuffer },
      key: { keyData: ArrayBuffer },
      data: ArrayBuffer,
    ) => {
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(key.keyData),
        Buffer.from(algorithm.iv),
      );
      return Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    },
    decrypt: async (
      algorithm: { iv: ArrayBuffer },
      key: { keyData: ArrayBuffer },
      data: ArrayBuffer,
    ) => {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key.keyData),
        Buffer.from(algorithm.iv),
      );
      return Buffer.concat([
        decipher.update(Buffer.from(data)),
        decipher.final(),
      ]);
    },
    exportKey: async (_format: string, key: { keyData: ArrayBuffer }) =>
      key.keyData,
  };

  return {
    __esModule: true,
    default: {
      randomBytes: (size: number) => crypto.randomBytes(size),
      getRandomValues: (array: Uint8Array) => {
        const bytes = crypto.randomBytes(array.length);
        array.set(bytes);
        return array;
      },
      subtle,
    },
  };
});

const fixturesDir = path.resolve(
  __dirname,
  '../../../../../ios/WalletExtensionShared/Tests/Fixtures',
);

function readFixture(name: string): {
  password: string;
  plaintext: string;
  payload: string;
} {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8')) as {
    password: string;
    plaintext: string;
    payload: string;
  };
}

describe('card wallet extension encryptor fixtures', () => {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  it('decrypts a vault written by Swift', async () => {
    const fixture = readFixture('swift-item.json');

    const decrypted = await encryptor.decrypt(
      fixture.password,
      fixture.payload,
    );

    expect(decrypted).toStrictEqual(JSON.parse(fixture.plaintext));
    const wrapped = decrypted as { password: string };
    expect(JSON.parse(wrapped.password)).toMatchObject({
      accessToken: 'from-swift',
    });
  });

  if (process.env.WRITE_JS_FIXTURE === '1') {
    it('writes the JavaScript fixture', async () => {
      const token = {
        accessToken: 'from-js',
        accessTokenExpiresAt: 1,
        futureField: 'dropped-on-rewrite',
        location: 'us',
      };
      const plaintext = JSON.stringify({ password: JSON.stringify(token) });
      const payload = await encryptor.encrypt('fixture-fox-code', {
        password: JSON.stringify(token),
      });
      writeFileSync(
        path.join(fixturesDir, 'js-item.json'),
        `${JSON.stringify(
          { password: 'fixture-fox-code', plaintext, payload },
          null,
          2,
        )}\n`,
      );
    });
  }
});
