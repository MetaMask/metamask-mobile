import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import {
  ShaAlgorithm,
  CipherAlgorithm,
  KeyDerivationIteration,
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
  DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  DERIVATION_OPTIONS_DEFAULT_OWASP2023,
} from './constants';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor({
      keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
    });
  });

  describe('constructor', () => {
    it('throws an error if the provided iterations do not meet the minimum required', () => {
      const iterations = 100;
      expect(
        () =>
          new Encryptor({
            keyDerivationOptions: {
              algorithm: 'PBKDF2',
              params: {
                iterations,
              },
            },
          }),
      ).toThrow(
        `Invalid key derivation iterations: ${iterations}. Recommended number of iterations is ${KeyDerivationIteration.OWASP2023Default}. Minimum required is ${KeyDerivationIteration.OWASP2023Minimum}.`,
      );
    });
  });

  describe('encrypt', () => {
    it('encrypts an object correctly', async () => {
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
      pbkdf2AesSpy = jest.spyOn(Aes, 'pbkdf2').mockResolvedValue('mockedAesKey');
      decryptAesForkedSpy = jest.spyOn(AesForked, 'decrypt');
      pbkdf2AesForkedSpy = jest.spyOn(AesForked, 'pbkdf2').mockResolvedValue('mockedForkedAesKey');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each([
      [
        'with original library and default iterations number for key generation',
        {
          lib: ENCRYPTION_LIBRARY.original,
          expectedKeyValue: 'mockedAesKey',
          expectedPBKDF2Args: [
            'testPassword',
            'mockedSalt',
            900000,
            256,
            ShaAlgorithm.Sha512,
          ],
          keyMetadata: DERIVATION_OPTIONS_DEFAULT_OWASP2023,
        },
      ],
      [
        'with original library and legacy iterations number for key generation',
        {
          lib: ENCRYPTION_LIBRARY.original,
          expectedKeyValue: 'mockedAesKey',
          expectedPBKDF2Args: [
            'testPassword',
            'mockedSalt',
            5000,
            256,
            ShaAlgorithm.Sha512,
          ],
          keyMetadata: undefined,
        },
      ],
      [
        'with library different to "original" and legacy iterations number for key generation',
        {
          lib: 'random-lib', // Assuming not using "original" should lead to AesForked
          expectedKeyValue: 'mockedForkedAesKey',
          expectedPBKDF2Args: ['testPassword', 'mockedSalt'],
          keyMetadata: undefined,
        },
      ],
    ])(
      'decrypts a string correctly %s',
      async (_, { lib, expectedKeyValue, expectedPBKDF2Args, keyMetadata }) => {
        const password = 'testPassword';
        const mockVault = {
          cipher: 'mockedCipher',
          iv: 'mockedIV',
          salt: 'mockedSalt',
          lib,
        };

        const decryptedObject = await encryptor.decrypt(
          password,
          JSON.stringify(
            keyMetadata !== undefined
              ? { ...mockVault, keyMetadata }
              : mockVault,
          ),
        );

        expect(decryptedObject).toEqual(expect.any(Object));

        const expectedDecryptionArgs =
          lib === ENCRYPTION_LIBRARY.original
            ? [
                mockVault.cipher,
                expectedKeyValue,
                mockVault.iv,
                CipherAlgorithm.cbc,
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
            keyMetadata: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
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

      await expect(async () => await encryptor.exportKey(key)).rejects.toThrow(
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
      await expect(
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
        await expect(
          async () => await encryptor.importKey(serializeKey(badStructuredKey)),
        ).rejects.toThrow('Invalid exported key structure');
      },
    );
  });

  describe('encryptWithDetail', () => {
    it('encrypts data and return vault with exported key string', async () => {
      const password = 'testPassword';
      const dataToEncrypt = { test: 'data' };
      const mockSalt = 'mockSalt';

      const result = await encryptor.encryptWithDetail(
        password,
        dataToEncrypt,
        mockSalt,
        LEGACY_DERIVATION_OPTIONS,
      );

      // Check structure of result
      expect(result).toHaveProperty('vault');
      expect(result).toHaveProperty('exportedKeyString');

      // Parse vault to verify contents
      const vaultObj = JSON.parse(result.vault);
      expect(vaultObj).toHaveProperty('cipher');
      expect(vaultObj).toHaveProperty('iv');
      expect(vaultObj).toHaveProperty('salt', mockSalt);
      expect(vaultObj).toHaveProperty('lib', 'original');
      expect(vaultObj).toHaveProperty('keyMetadata', LEGACY_DERIVATION_OPTIONS);

      // Verify we can import the exported key
      const importedKey = await encryptor.importKey(result.exportedKeyString);
      expect(importedKey).toHaveProperty('exportable', true);
      expect(importedKey).toHaveProperty('lib', 'original');
      expect(importedKey).toHaveProperty(
        'keyMetadata',
        LEGACY_DERIVATION_OPTIONS,
      );
    });
  });

  describe('decryptWithDetail', () => {
    beforeEach(() => {
      // Mock the decrypt function to return our test data
      const mockDecrypt = jest
        .fn()
        .mockResolvedValue(JSON.stringify({ test: 'data' }));
      jest.spyOn(Aes, 'decrypt').mockImplementation(mockDecrypt);
      jest.spyOn(AesForked, 'decrypt').mockImplementation(mockDecrypt);

      // Mock the key derivation function
      jest.spyOn(Aes, 'pbkdf2').mockResolvedValue('mockedKey');
      jest.spyOn(AesForked, 'pbkdf2').mockResolvedValue('mockedKeyForked');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('decrypts vault and return data with key details', async () => {
      // First encrypt some data to get a valid vault
      const password = 'testPassword';
      const originalData = { test: 'data' };
      const { vault } = await encryptor.encryptWithDetail(
        password,
        originalData,
      );

      // Now test decryption
      const result = await encryptor.decryptWithDetail(password, vault);

      expect(result).toHaveProperty('exportedKeyString');
      expect(result).toHaveProperty('vault');
      expect(result).toHaveProperty('salt');

      // Verify the decrypted data matches original
      expect(result.vault).toEqual(originalData);

      // Verify we can import the exported key
      const importedKey = await encryptor.importKey(result.exportedKeyString);
      expect(importedKey).toHaveProperty('exportable', true);
      expect(importedKey).toHaveProperty('lib', 'original');
      expect(importedKey).toHaveProperty('keyMetadata');
    });

    it('handles legacy vaults without keyMetadata', async () => {
      const password = 'testPassword';
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
      };

      const result = await encryptor.decryptWithDetail(
        password,
        JSON.stringify(mockVault),
      );

      expect(result).toHaveProperty('exportedKeyString');
      expect(result).toHaveProperty('vault');
      expect(result).toHaveProperty('salt', 'mockedSalt');

      // Verify the exported key uses legacy derivation options
      const importedKey = await encryptor.importKey(result.exportedKeyString);
      expect(importedKey.keyMetadata).toEqual(LEGACY_DERIVATION_OPTIONS);
    });
  });

  describe('updateVault', () => {
    let encryptSpy: jest.SpyInstance, decryptSpy: jest.SpyInstance;
    const expectedKeyMetadata = DERIVATION_OPTIONS_MINIMUM_OWASP2023;

    beforeEach(() => {
      encryptSpy = jest
        .spyOn(Aes, 'encrypt')
        .mockResolvedValue(() => Promise.resolve('mockedCipher'));
      decryptSpy = jest
        .spyOn(Aes, 'decrypt')
        .mockResolvedValue('{"mockData": "mockedPlainText"}');
    });

    afterEach(() => {
      encryptSpy.mockRestore();
      decryptSpy.mockRestore();
    });

    it('updates a vault correctly if keyMetadata is not present', async () => {
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
      };

      const updatedVault = await encryptor.updateVault(
        JSON.stringify(mockVault),
        'mockPassword',
      );

      const vault = JSON.parse(updatedVault);

      expect(encryptSpy).toHaveBeenCalledTimes(1);
      expect(decryptSpy).toHaveBeenCalledTimes(1);
      expect(vault).toHaveProperty('keyMetadata');
      expect(vault.keyMetadata).toStrictEqual(expectedKeyMetadata);
    });

    it('does not update a vault if algorithm is PBKDF2 and the number of iterations is 600000', async () => {
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
        keyMetadata: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
      };

      const updatedVault = await encryptor.updateVault(
        JSON.stringify(mockVault),
        'mockPassword',
      );

      const vault = JSON.parse(updatedVault);

      expect(encryptSpy).toHaveBeenCalledTimes(0);
      expect(decryptSpy).toHaveBeenCalledTimes(0);
      expect(vault).toHaveProperty('keyMetadata');
      expect(vault.keyMetadata).toStrictEqual(expectedKeyMetadata);
    });
  });
});
