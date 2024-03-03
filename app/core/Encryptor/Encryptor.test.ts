import { NativeModules } from 'react-native';
import { Encryptor } from './Encryptor';
import { ENCRYPTION_LIBRARY } from './constants';

const Aes = NativeModules.Aes;
// const AesForked = NativeModules.AesForked;

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
    it('decrypts a string correctly with original library', async () => {
      const password = 'testPassword';
      const encryptedString = {
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: ENCRYPTION_LIBRARY.original,
      };

      const decryptFromAES = jest.spyOn(Aes, 'decrypt');

      const decryptedObject = await encryptor.decrypt(
        password,
        JSON.stringify(encryptedString),
      );

      expect(decryptedObject).toEqual(expect.any(Object));
      expect(decryptFromAES).toHaveBeenCalledWith(
        encryptedString.cipher,
        'mockedKey',
        encryptedString.iv,
      );
    });
  });
});
