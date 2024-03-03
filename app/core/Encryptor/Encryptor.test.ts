import { Encryptor } from './Encryptor';

describe('Encryptor', () => {
  let encryptor: Encryptor;

  beforeEach(() => {
    encryptor = new Encryptor();
  });

  describe('encrypt', () => {
    it('should encrypt an object correctly', async () => {
      const password = 'testPassword';
      const objectToEncrypt = { key: 'value' };

      const encryptedString = await encryptor.encrypt({
        password,
        object: objectToEncrypt,
      });
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
      const encryptedString = JSON.stringify({
        cipher: 'mockedCipher',
        iv: 'mockedIV',
        salt: 'mockedSalt',
        lib: 'original',
      });

      const decryptedObject = await encryptor.decrypt({
        password,
        encryptedString,
      });

      expect(decryptedObject).toEqual(expect.any(Object));
    });
  });
});
