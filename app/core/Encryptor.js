import { NativeModules } from 'react-native';
const Aes = NativeModules.Aes;

export default class Encryptor {
	static _generateSalt(byteCount = 32) {
		const view = new Uint8Array(byteCount);
		global.crypto.getRandomValues(view);
		const b64encoded = btoa(String.fromCharCode.apply(null, view));
		return b64encoded;
	}

	static _generateKey = (password, salt, cost, length) => Aes.pbkdf2(password, salt, cost, length);
	static _encrypt = (text, keyBase64) => {
		const ivBase64 = Encryptor._generateSalt(16);
		return Aes.encrypt(text, keyBase64, ivBase64).then(cipher => ({ cipher, iv: ivBase64 }));
	};

	static _decrypt = (encryptedData, key) => Aes.decrypt(encryptedData.cipher, key, encryptedData.iv);

	static encrypt = async (password, object) => {
		const salt = Encryptor._generateSalt();
		const key = await Encryptor._generateKey(password, salt, 10000, 512);
		const result = await Encryptor._encrypt(key, JSON.stringify(object));
		return JSON.stringify(result);
	};

	static decrypt = (password, encryptedString) => {
		const { cipher, iv } = JSON.parse(password);
		return Encryptor._decrypt({ cipher, iv }, encryptedString);
	};
}
