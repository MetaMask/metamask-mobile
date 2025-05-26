import { NativeModules } from 'react-native';
import { AesLib, HashAlgorithmAesCrypto, CipherAlgorithmAesCrypto } from './aes-native';
import { KDF_ALGORITHM, SHA256_DIGEST_LENGTH, ENCRYPTION_LIBRARY } from './../constants';
import { KeyDerivationOptions } from './../types';

// Mock NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    Aes: {
      pbkdf2: () => Promise.resolve('derived-key'),
      randomKey: () => Promise.resolve('random-string'),
      encrypt: () => Promise.resolve('encrypted-data'),
      decrypt: () => Promise.resolve('decrypted-data'),
    },
    AesForked: {
      encrypt: () => Promise.resolve('encrypted-data'),
      decrypt: () => Promise.resolve('decrypted-data'),
    },
  }
}));

describe('AesEncryptionLibrary', () => {
  const password = 'test-password';
  const salt = 'test-salt';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct type', () => {
    expect(AesLib.type).toBe(ENCRYPTION_LIBRARY.original);
  });

  it('calls pbkdf2 with the correct params when executing deriveKey', async () => {
    const opts: KeyDerivationOptions = {
      algorithm: KDF_ALGORITHM,
      params: { iterations: 1000 },
    };

    await AesLib.deriveKey(password, salt, opts);

    expect(NativeModules.Aes.pbkdf2).toHaveBeenCalledWith(
      password,
      salt,
      opts.params.iterations,
      SHA256_DIGEST_LENGTH,
      HashAlgorithmAesCrypto.Sha512,
    );
  });

  it('calls randomKey with the correct params when executing generateIv', async () => {
    await AesLib.generateIv(16);
    expect(NativeModules.Aes.randomKey).toHaveBeenCalledWith(16);
  });

  it('calls Aes.encrypt with the correct params when executing encrypt', async () => {
    await AesLib.encrypt('data', 'key', 'iv');
    expect(NativeModules.Aes.encrypt).toHaveBeenCalledWith(
      'data',
      'key',
      'iv',
      CipherAlgorithmAesCrypto.Cbc,
    );
  });

  it('calls Aes.decrypt with the correct params when executing decrypt', async () => {
    await AesLib.decrypt('data', 'key', 'iv');
    expect(NativeModules.Aes.decrypt).toHaveBeenCalledWith(
      'data',
      'key',
      'iv',
      'aes-cbc-pkcs7padding',
    );
  });
});
