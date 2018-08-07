import { NativeModules } from 'react-native';
const Aes = NativeModules.Aes;

export default class Encryptor {
	key = null;
	_generateSalt(byteCount = 32) {
		const view = new Uint8Array(byteCount);
		global.crypto.getRandomValues(view);
		const b64encoded = btoa(String.fromCharCode.apply(null, view));
		return b64encoded;
	}

	_generateKey = (password, salt, cost, length) => Aes.pbkdf2(password, salt, cost, length);

	_keyFromPassword = password => {
		if (!this.salt) {
			this.salt = this._generateSalt(16);
		}
		return this._generateKey(password, this.salt, 10000, 512);
	};
	_encryptWithKey = (text, keyBase64) => {
		const ivBase64 = this._generateSalt(32);
		return Aes.encrypt(text, keyBase64, ivBase64).then(cipher => ({ cipher, iv: ivBase64 }));
	};

	_decryptWithKey = (encryptedData, key) => Aes.decrypt(encryptedData.cipher, key, encryptedData.iv);

	encrypt = async (password, object) => {
		const key = await this._keyFromPassword(password);
		const result = await this._encryptWithKey(JSON.stringify(object), key);
		return JSON.stringify(result);
	};

	decrypt = async (password, encryptedString) => {
		const encryptedData = JSON.parse(encryptedString);
		const key = await this._keyFromPassword(password);
		const data = await this._decryptWithKey(encryptedData, key);

		return JSON.parse(data);
	};
}
