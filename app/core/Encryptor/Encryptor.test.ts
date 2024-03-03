import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import { ENCRYPTION_LIBRARY } from './constants';

const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor();
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
        const encryptedString = {
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
          JSON.stringify(encryptedString),
        );

        expect(decryptedObject).toEqual(expect.any(Object));
        expect(decryptSpy).toHaveBeenCalledWith(
          encryptedString.cipher,
          expectedKey,
          encryptedString.iv,
        );

        decryptSpy.mockRestore();
      },
    );
  });
});
