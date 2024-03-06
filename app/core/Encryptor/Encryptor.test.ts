import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import { ENCRYPTION_LIBRARY, DEFAULT_DERIVATION_PARAMS } from './constants';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor();
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
    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each([
      {
        lib: ENCRYPTION_LIBRARY.original,
        expectedDecryptFunction: 'decrypt',
        expectedKey: 'mockedKey',
        description: 'with original library',
      },
      {
        lib: 'random-lib', // Assuming not using "original" should lead to AesForked
        expectedDecryptFunction: 'decrypt',
        expectedKey: 'mockedKeyForked',
        description: 'with library different to "original"',
      },
    ])(
      'decrypts a string correctly $description',
      async ({ lib, expectedDecryptFunction, expectedKey }) => {
        const password = 'testPassword';
        const mockVault = {
          cipher: 'mockedCipher',
          iv: 'mockedIV',
          salt: 'mockedSalt',
          lib,
        };

        // Determine which AES module to spy on based on the lib value
        const aesModuleToSpyOn =
          lib === ENCRYPTION_LIBRARY.original ? Aes : AesForked;
        const decryptSpy = jest.spyOn(
          aesModuleToSpyOn,
          expectedDecryptFunction,
        );

        const decryptedObject = await encryptor.decrypt(
          password,
          JSON.stringify(mockVault),
        );

        expect(decryptedObject).toEqual(expect.any(Object));
        expect(decryptSpy).toHaveBeenCalledWith(
          mockVault.cipher,
          expectedKey,
          mockVault.iv,
        );

        decryptSpy.mockRestore();
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
            keyMetadata: {
              algorithm: 'PBKDF2',
              params: {
                iterations: 900000,
              },
            },
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
      expect(vault.keyMetadata).toHaveProperty('algorithm');
      expect(vault.keyMetadata).toHaveProperty('params');
      expect(vault.keyMetadata.params).toHaveProperty('iterations');
      expect(vault.keyMetadata.params.iterations).toBe(
        DEFAULT_DERIVATION_PARAMS.params.iterations,
      );
      expect(vault.keyMetadata.algorithm).toBe(
        DEFAULT_DERIVATION_PARAMS.algorithm,
      );
    });

    it('does not update a vault if algorithm is PBKDF2 the number of iterations is 900000', async () => {
      const mockVault = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
        keyMetadata: {
          algorithm: 'PBKDF2',
          params: {
            iterations: 900000,
          },
        },
      };

      const updatedVault = await encryptor.updateVault(
        JSON.stringify(mockVault),
        'mockPassword',
      );

      const vault = JSON.parse(updatedVault);

      expect(encryptSpy).toBeCalledTimes(0);
      expect(decryptSpy).toBeCalledTimes(0);
      expect(vault).toHaveProperty('keyMetadata');
      expect(vault.keyMetadata).toHaveProperty('algorithm');
      expect(vault.keyMetadata).toHaveProperty('params');
      expect(vault.keyMetadata.params).toHaveProperty('iterations');
      expect(vault.keyMetadata.params.iterations).toBe(
        DEFAULT_DERIVATION_PARAMS.params.iterations,
      );
      expect(vault.keyMetadata.algorithm).toBe(
        DEFAULT_DERIVATION_PARAMS.algorithm,
      );
    });
  });
});
