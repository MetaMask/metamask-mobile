import { Encryptor } from './Encryptor';
import { QuickCryptoLib } from './lib';
import {
  ENCRYPTION_LIBRARY,
  LEGACY_DERIVATION_OPTIONS,
} from './constants';

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
    it('should decrypt a string correctly', async () => {
      const password = 'testPassword';
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: ENCRYPTION_LIBRARY.original,
      };

      const decryptedObject = await encryptor.decrypt(
        password,
        JSON.stringify(mockVault),
      );

      expect(decryptedObject).toEqual({ test: 'data' });
    });
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
    it('should encrypt data and return vault with exported key string', async () => {
      const password = 'testPassword';
      const dataToEncrypt = { test: 'data' };
      const mockSalt = 'mockSalt';

      const result = await encryptor.encryptWithDetail(
        password,
        dataToEncrypt,
        mockSalt,
        LEGACY_DERIVATION_OPTIONS,
      );

      expect(result).toHaveProperty('vault');
      expect(result).toHaveProperty('exportedKeyString');

      const vaultObj = JSON.parse(result.vault);
      expect(vaultObj).toHaveProperty('cipher');
      expect(vaultObj).toHaveProperty('iv');
      expect(vaultObj).toHaveProperty('salt', mockSalt);
      expect(vaultObj).toHaveProperty('lib', 'original');
      expect(vaultObj).toHaveProperty('keyMetadata', LEGACY_DERIVATION_OPTIONS);

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
      const mockDecrypt = jest
        .fn()
        .mockResolvedValue(new Uint8Array([
          123,  34, 116, 101, 115,
          116,  34,  58,  34, 100,
           97, 116,  97,  34, 125
        ]));
      jest.spyOn(QuickCryptoLib, 'decrypt').mockImplementation(mockDecrypt);

      jest.spyOn(QuickCryptoLib, 'deriveKey').mockResolvedValue('mockedKey');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should decrypt vault and return data with key details', async () => {
      const password = 'testPassword';
      const originalData = { test: 'data' };
      const { vault } = await encryptor.encryptWithDetail(
        password,
        originalData,
      );

      const result = await encryptor.decryptWithDetail(password, vault);

      expect(result).toHaveProperty('exportedKeyString');
      expect(result).toHaveProperty('vault');
      expect(result).toHaveProperty('salt');

      expect(result.vault).toEqual(originalData);

      const importedKey = await encryptor.importKey(result.exportedKeyString);
      expect(importedKey).toHaveProperty('exportable', true);
      expect(importedKey).toHaveProperty('lib', 'original');
      expect(importedKey).toHaveProperty('keyMetadata');
    });

    it('should handle legacy vaults without keyMetadata', async () => {
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

      const importedKey = await encryptor.importKey(result.exportedKeyString);
      expect(importedKey.keyMetadata).toEqual(LEGACY_DERIVATION_OPTIONS);
    });
  });
});
