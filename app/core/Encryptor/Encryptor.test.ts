import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import {
  ENCRYPTION_LIBRARY,
  DERIVATION_PARAMS,
  KeyDerivationIteration,
} from './constants';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor({ derivationParams: DERIVATION_PARAMS });
  });

  describe('constructor', () => {
    it('throws an error if the provided iterations do not meet the minimum required', () => {
      expect(
        () =>
          new Encryptor({
            derivationParams: {
              algorithm: 'PBKDF2',
              params: {
                iterations: 100,
              },
            },
          }),
      ).toThrowError(
        `Invalid key derivation iterations: 100. Recommended number of iterations is ${KeyDerivationIteration.Default}. Minimum required is ${KeyDerivationIteration.Minimum}.`,
      );
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
        expectedPBKDF2Args: ['testPassword', 'mockedSalt', 600000, 256],
        description:
          'with original library and default iterations number for key generation',
        keyMetadata: DERIVATION_PARAMS,
      },
      {
        lib: ENCRYPTION_LIBRARY.original,
        expectedKey: 'mockedAesKey',
        expectedPBKDF2Args: ['testPassword', 'mockedSalt', 5000, 256],
        description:
          'with original library and old iterations number for key generation',
      },
      {
        lib: 'random-lib', // Assuming not using "original" should lead to AesForked
        expectedKey: 'mockedAesForkedKey',
        expectedPBKDF2Args: ['testPassword', 'mockedSalt'],
        description:
          'with library different to "original" and default iterations number for key generation',
        keyMetadata: DERIVATION_PARAMS,
      },
      {
        lib: 'random-lib', // Assuming not using "original" should lead to AesForked
        expectedKey: 'mockedAesForkedKey',
        expectedPBKDF2Args: ['testPassword', 'mockedSalt'],
        description:
          'with library different to "original" and old iterations number for key generation',
      },
    ])(
      'decrypts a string correctly $description',
      async ({ lib, expectedKey, expectedPBKDF2Args, keyMetadata }) => {
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
            keyMetadata: DERIVATION_PARAMS,
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

  describe('updateVault', () => {
    let encryptSpy: jest.SpyInstance, decryptSpy: jest.SpyInstance;
    const expectedKeyMetadata = DERIVATION_PARAMS;

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

      expect(encryptSpy).toBeCalledTimes(1);
      expect(decryptSpy).toBeCalledTimes(1);
      expect(vault).toHaveProperty('keyMetadata');
      expect(vault.keyMetadata).toStrictEqual(expectedKeyMetadata);
    });

    it('does not update a vault if algorithm is PBKDF2 and the number of iterations is 900000', async () => {
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
        keyMetadata: DERIVATION_PARAMS,
      };

      const updatedVault = await encryptor.updateVault(
        JSON.stringify(mockVault),
        'mockPassword',
      );

      const vault = JSON.parse(updatedVault);

      expect(encryptSpy).toBeCalledTimes(0);
      expect(decryptSpy).toBeCalledTimes(0);
      expect(vault).toHaveProperty('keyMetadata');
      expect(vault.keyMetadata).toStrictEqual(expectedKeyMetadata);
    });
  });
});
