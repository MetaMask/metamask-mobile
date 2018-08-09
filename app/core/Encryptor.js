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
		const b64encoded = btoa(String.fromCharCode.apply(null, view));
		return b64encoded;
	}

	_generateKey = (password, salt) => Aes.pbkdf2(password, salt);

	_keyFromPassword = password => {
		if (!this.salt) {
			this.salt = this._generateSalt(16);
		}
		return this._generateKey(password, this.salt);
	};
	_encryptWithKey = (text, keyBase64) => {
		const ivBase64 = this._generateSalt(32);
		return Aes.encrypt(text, keyBase64, ivBase64).then(cipher => ({ cipher, iv: ivBase64 }));
	};

	_decryptWithKey = (encryptedData, key) => Aes.decrypt(encryptedData.cipher, key, encryptedData.iv);

	/**
	 * Encrypts a JS object using a password (and AES encryption with native libraries)
	 */
	encrypt = async (password, object) => {
		const key = await this._keyFromPassword(password);
		const result = await this._encryptWithKey(JSON.stringify(object), key);
		return JSON.stringify(result);
	};

	/**
	 * Decrypts an encrypted JS object (encryptedString)
	 * using a password (and AES deccryption with native libraries)
	 */
	decrypt = async (password, encryptedString) => {
		const encryptedData = JSON.parse(encryptedString);
		const key = await this._keyFromPassword(password);
		const data = await this._decryptWithKey(encryptedData, key);

		return JSON.parse(data);
	};
}
