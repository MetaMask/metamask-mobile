import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import {
  SHA_ALGORITHM,
  CIPHER_ALGORITHM,
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
} from './constants';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor({
      keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
    });
  });

  describe('encrypt', () => {
    it('should encrypt an object correctly', async () => {
      const password = 'testPassword';
      const objectToEncrypt = { key: 'value' };

      const encryptedString = await encryptor.encrypt(
        password,
        objectToEncrypt,
      );
      const encryptedObject = JSON.parse(encryptedString);

      expect(encryptedObject).toHaveProperty('cipher');
      expect(encryptedObject).toHaveProperty('iv');
      expect(encryptedObject).toHaveProperty('salt');
      expect(encryptedObject).toHaveProperty('lib', 'original');
    });
  });

  describe('decrypt', () => {
    let decryptAesSpy: jest.SpyInstance,
      pbkdf2AesSpy: jest.SpyInstance,
      decryptAesForkedSpy: jest.SpyInstance,
      pbkdf2AesForkedSpy: jest.SpyInstance;

    beforeEach(() => {
      decryptAesSpy = jest.spyOn(Aes, 'decrypt');
      pbkdf2AesSpy = jest.spyOn(Aes, 'pbkdf2');
      decryptAesForkedSpy = jest.spyOn(AesForked, 'decrypt');
      pbkdf2AesForkedSpy = jest.spyOn(AesForked, 'pbkdf2');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each([
      [
        'with original library and legacy iterations number for key generation',
        {
          lib: ENCRYPTION_LIBRARY.original,
          expectedKeyValue: 'mockedKey',
          expectedPBKDF2Args: [
            'testPassword',
            'mockedSalt',
            5000,
            256,
            SHA_ALGORITHM.sha512,
          ],
        },
      ],
      [
        'with library different to "original" and legacy iterations number for key generation',
        {
          lib: 'random-lib', // Assuming not using "original" should lead to AesForked
          expectedKeyValue: 'mockedKeyForked',
          expectedPBKDF2Args: ['testPassword', 'mockedSalt'],
        },
      ],
    ])(
      'decrypts a string correctly %s',
      async (_, { lib, expectedKeyValue, expectedPBKDF2Args }) => {
        const password = 'testPassword';
        const mockVault = {
          cipher: 'mockedCipher',
          iv: 'mockedIV',
          salt: 'mockedSalt',
          lib,
        };

        const decryptedObject = await encryptor.decrypt(
          password,
          JSON.stringify(mockVault),
        );

        expect(decryptedObject).toEqual(expect.any(Object));

        const expectedDecryptionArgs =
          lib === ENCRYPTION_LIBRARY.original
            ? [
                mockVault.cipher,
                expectedKeyValue,
                mockVault.iv,
                CIPHER_ALGORITHM.cbc,
              ]
            : [mockVault.cipher, expectedKeyValue, mockVault.iv];
        expect(
          lib === ENCRYPTION_LIBRARY.original
            ? decryptAesSpy
            : decryptAesForkedSpy,
        ).toHaveBeenCalledWith(...expectedDecryptionArgs);
        expect(
          lib === ENCRYPTION_LIBRARY.original
            ? pbkdf2AesSpy
            : pbkdf2AesForkedSpy,
        ).toHaveBeenCalledWith(...expectedPBKDF2Args);
      },
    );
  });

  describe('isVaultUpdated', () => {
    it('returns true if a vault has the correct format', () => {
      expect(
        encryptor.isVaultUpdated(
          JSON.stringify({
            cipher: 'mockedCipher',
            iv: 'mockedIV',
            salt: 'mockedSalt',
            lib: 'original',
            keyMetadata: LEGACY_DERIVATION_OPTIONS,
          }),
        ),
      ).toBe(true);
    });

    it('returns false if a vault has the incorrect format', () => {
      expect(
        encryptor.isVaultUpdated(
          JSON.stringify({
            cipher: 'mockedCipher',
            iv: 'mockedIV',
            salt: 'mockedSalt',
            lib: 'original',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('keyFromPassword', () => {
    it.each([
      [
        'exportable with original lib',
        {
          lib: ENCRYPTION_LIBRARY.original,
          exportable: true,
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
      [
        'non-exportable with original lib',
        {
          lib: ENCRYPTION_LIBRARY.original,
          exportable: false,
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
      [
        'exportable with random lib',
        {
          lib: 'random-lib',
          exportable: true,
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
      [
        'non-exportable with random lib',
        {
          lib: 'random-lib',
          exportable: false,
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
    ])(
      'generates a key with the right attributes: %s',
      async (_, { lib, exportable, keyMetadata }) => {
        const key = await encryptor.keyFromPassword(
          'mockPassword',
          encryptor.generateSalt(),
          exportable,
          keyMetadata,
          lib,
        );

        expect(key.key).not.toBe(undefined);
        expect(key.lib).toBe(lib);
        expect(key.exportable).toBe(exportable);
        expect(key.keyMetadata).toBe(keyMetadata);
      },
    );
  });

  describe('exportKey', () => {
    it('exports a key', async () => {
      const key = await encryptor.keyFromPassword(
        'mockPassword',
        encryptor.generateSalt(),
        true,
      );

      const exportedKey = await encryptor.exportKey(key);
      expect(exportedKey).not.toBe(undefined);
    });

    it('does not export a key if not exportable', async () => {
      const key = await encryptor.keyFromPassword(
        'mockPassword',
        encryptor.generateSalt(),
        false,
      );

      expect(async () => await encryptor.exportKey(key)).rejects.toThrow(
        'Key is not exportable',
      );
    });
  });

  describe('importKey', () => {
    const serializeKey = (data: object) =>
      Buffer.from(JSON.stringify(data)).toString('base64');

    it('imports a key', async () => {
      const testKey = await encryptor.keyFromPassword(
        'mockPassword',
        encryptor.generateSalt(),
        true,
      );
      const exportedKey = await encryptor.exportKey(testKey);

      const key = await encryptor.importKey(exportedKey);
      expect(key).toStrictEqual(testKey);
    });

    it.each([
      '',
      '{}',
      Buffer.from('').toString('base64'),
      Buffer.from('{ not: json }').toString('base64'),
    ])('does not import a bad serialized key: %s', async (badFormattedKey) => {
      expect(
        async () => await encryptor.importKey(badFormattedKey),
      ).rejects.toThrow('Invalid exported key serialization format');
    });

    it.each([
      [
        'missing lib',
        {
          exportable: true,
          key: 'a-key',
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
      [
        'missing key',
        {
          lib: ENCRYPTION_LIBRARY.original,
          exportable: true,
          keyMetadata: LEGACY_DERIVATION_OPTIONS,
        },
      ],
      [
        'missing keyMetadata',
        {
          lib: ENCRYPTION_LIBRARY.original,
          exportable: true,
          key: 'a-key',
        },
      ],
      [
        'invalid keyMetadata',
        {
          lib: ENCRYPTION_LIBRARY.original,
          exportable: true,
          key: 'a-key',
          keyMatadata: {},
        },
      ],
    ])(
      'does not import a bad structured key: %s',
      async (_, badStructuredKey) => {
        expect(
          async () => await encryptor.importKey(serializeKey(badStructuredKey)),
        ).rejects.toThrow('Invalid exported key structure');
      },
    );
  });
});
