import { NativeModules } from 'react-native';
const Aes = NativeModules.Aes;

/**
 * Class that exposes two public methods: Encrypt and Decrypt
 * This is used by the KeyringController to encrypt / decrypt the state
 * which contains sensitive seed words and addresses
 */
export default class Encryptor {
	key = null;

	_generateSalt(byteCount = 32) {
		const view = new Uint8Array(byteCount);
		global.crypto.getRandomValues(view);
		// eslint-disable-next-line no-undef
		const b64encoded = btoa(String.fromCharCode.apply(null, view));
		return b64encoded;
	}

	_generateKey = (password, salt) => Aes.pbkdf2(password, salt, 5000, 256);

	_keyFromPassword = (password, salt) => this._generateKey(password, salt);

	_encryptWithKey = async (text, keyBase64) => {
		const iv = await Aes.randomKey(16);
		return Aes.encrypt(text, keyBase64, iv).then(cipher => ({ cipher, iv }));
	};

	_decryptWithKey = (encryptedData, key) => Aes.decrypt(encryptedData.cipher, key, encryptedData.iv);

	/**
	 * Encrypts a JS object using a password (and AES encryption with native libraries)
	 *
	 * @param {string} password - Password used for encryption
	 * @param {object} object - Data object to encrypt
	 * @returns - Promise resolving to stringified data
	 */
	encrypt = async (password, object) => {
		const salt = this._generateSalt(16);
		const key = await this._keyFromPassword(password, salt);
		const result = await this._encryptWithKey(JSON.stringify(object), key);
		result.salt = salt;
		return JSON.stringify(result);
	};

	/**
	 * Decrypts an encrypted JS object (encryptedString)
	 * using a password (and AES deccryption with native libraries)
	 *
	 * @param {string} password - Password used for decryption
	 * @param {string} encryptedString - String to decrypt
	 * @returns - Promise resolving to decrypted data object
	 */
	decrypt = async (password, encryptedString) => {
		const encryptedData = JSON.parse(encryptedString);
		const key = await this._keyFromPassword(password, encryptedData.salt);
		const data = await this._decryptWithKey(encryptedData, key);

		return JSON.parse(data);
	};
}
