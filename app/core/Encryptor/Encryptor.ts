import { NativeModules } from 'react-native';
const Aes = NativeModules.Aes;
const AesForked = NativeModules.AesForked;

/**
 * Class that exposes two public methods: Encrypt and Decrypt
 * This is used by the KeyringController to encrypt / decrypt the state
 * which contains sensitive seed words and addresses
 */
class Encryptor {
  key = null;

  _generateSalt(byteCount = 32) {
    const view = new Uint8Array(byteCount);
    global.crypto.getRandomValues(view);
    const b64encoded = btoa(String.fromCharCode.apply(null, Array.from(view)));
    return b64encoded;
  }

  _generateKey = ({
    password,
    salt,
    lib,
  }: {
    password: string;
    salt: string;
    lib: string;
  }) =>
    lib === 'original'
      ? Aes.pbkdf2(password, salt, 5000, 256)
      : AesForked.pbkdf2(password, salt);

  _keyFromPassword = ({
    password,
    salt,
    lib,
  }: {
    password: string;
    salt: string;
    lib: string;
  }) => this._generateKey({ password, salt, lib });

  _encryptWithKey = async ({
    text,
    keyBase64,
  }: {
    text: string;
    keyBase64: string;
  }) => {
    const iv = await Aes.randomKey(16);
    return Aes.encrypt(text, keyBase64, iv).then((cipher: string) => ({
      cipher,
      iv,
    }));
  };

  _decryptWithKey = ({
    encryptedData,
    key,
    lib,
  }: {
    encryptedData: { cipher: string; iv: string };
    key: string;
    lib: string;
  }) =>
    lib === 'original'
      ? Aes.decrypt(encryptedData.cipher, key, encryptedData.iv)
      : AesForked.decrypt(encryptedData.cipher, key, encryptedData.iv);

  /**
   * Asynchronously encrypts a given object using AES encryption.
   * The encryption process involves generating a salt, deriving a key from the provided password and salt,
   * and then using the key to encrypt the object. The result includes the encrypted data, the salt used,
   * and the library version ('original' in this case).
   *
   * @param params.password - The password used for generating the encryption key.
   * @param params.object - The data object to encrypt. It can be of any type, as it will be stringified during the encryption process.
   * @returns A promise that resolves to a string. The string is a JSON representation of an object containing the encrypted data, the salt used for encryption, and the library version.
   */
  encrypt = async ({
    password,
    object,
  }: {
    password: string;
    object: unknown;
  }): Promise<string> => {
    const salt = this._generateSalt(16);
    const key = await this._keyFromPassword({
      password,
      salt,
      lib: 'original',
    });
    const result = await this._encryptWithKey({
      text: JSON.stringify(object),
      keyBase64: key,
    });
    result.salt = salt;
    result.lib = 'original';
    return JSON.stringify(result);
  };

  /**
   * Decrypts an encrypted JS object (encryptedString)
   * using a password (and AES decryption with native libraries)
   *
   * @param {string} password - Password used for decryption
   * @param {string} encryptedString - String to decrypt
   * @returns - Promise resolving to decrypted data object
   */
  decrypt = async ({
    password,
    encryptedString,
  }: {
    password: string;
    encryptedString: string;
  }) => {
    const encryptedData = JSON.parse(encryptedString);
    const key = await this._keyFromPassword({
      password,
      salt: encryptedData.salt,
      lib: encryptedData.lib,
    });
    const data = await this._decryptWithKey({
      encryptedData,
      key,
      lib: encryptedData.lib,
    });
    return JSON.parse(data);
  };
}

// eslint-disable-next-line import/prefer-default-export
export { Encryptor };
