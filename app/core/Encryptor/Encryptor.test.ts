import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import {
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
    afterEach(() => {
      jest.clearAllMocks();
    });

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
      decryptAesSpy = jest
        .spyOn(Aes, 'decrypt')
        .mockResolvedValue('{"mockData": "mockedPlainText"}');
      pbkdf2AesSpy = jest
        .spyOn(Aes, 'pbkdf2')
        .mockResolvedValue('mockedAesKey');
      decryptAesForkedSpy = jest
        .spyOn(AesForked, 'decrypt')
        .mockResolvedValue('{"mockData": "mockedPlainText"}');
      pbkdf2AesForkedSpy = jest
        .spyOn(AesForked, 'pbkdf2')
        .mockResolvedValue('mockedAesForkedKey');
    });

    afterEach(() => {
      decryptAesSpy.mockRestore();
      pbkdf2AesSpy.mockRestore();
      decryptAesForkedSpy.mockRestore();
      pbkdf2AesForkedSpy.mockRestore();
    });

    it.each([
      {
        lib: ENCRYPTION_LIBRARY.original,
        expectedKey: 'mockedAesKey',
        expectedPBKDF2Args: ['testPassword', 'mockedSalt', 5000, 256],
        description:
          'with original library and legacy iterations number for key generation',
      },
      {
        lib: 'random-lib', // Assuming not using "original" should lead to AesForked
        expectedKey: 'mockedAesForkedKey',
        expectedPBKDF2Args: ['testPassword', 'mockedSalt'],
        description:
          'with library different to "original" and legacy iterations number for key generation',
      },
    ])(
      'decrypts a string correctly $description',
      async ({ lib, expectedKey, expectedPBKDF2Args }) => {
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
        expect(
          lib === ENCRYPTION_LIBRARY.original
            ? decryptAesSpy
            : decryptAesForkedSpy,
        ).toHaveBeenCalledWith(mockVault.cipher, expectedKey, mockVault.iv);
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
});
