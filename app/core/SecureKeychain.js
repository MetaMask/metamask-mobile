import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Encryptor from './Encryptor';
/**
 * TO DO
 */

const privates = new WeakMap();
const encryptor = new Encryptor();

class SecureKeychain {
	constructor(code) {
		if (!SecureKeychain.instance) {
			privates.set(this, { code });
			SecureKeychain.instance = this;
		}
		return SecureKeychain.instance;
	}

	encryptPassword(password) {
		return encryptor.encrypt(privates.get(this).code, { password });
	}

	decryptPassword(str) {
		return encryptor.decrypt(privates.get(this).code, str);
	}
}
let instance;

export default {
	init(salt) {
		instance = new SecureKeychain(salt);
		Object.freeze(instance);
		return instance;
	},

	getInstance() {
		return instance;
	},

	getSupportedBiometryType() {
		return Keychain.getSupportedBiometryType();
	},

	resetGenericPassword() {
		return Keychain.resetGenericPassword();
	},

	async getGenericPassword() {
		const keychainObject = await Keychain.getGenericPassword();
		if (keychainObject.password) {
			const encryptedPassword = keychainObject.password;
			const decrypted = await instance.decryptPassword(encryptedPassword);
			keychainObject.password = decrypted.password;
			return keychainObject;
		}
		return null;
	},

	async setGenericPassword(key, password, authOptions) {
		const encryptedPassword = await instance.encryptPassword(password);
		return Keychain.setGenericPassword(key, encryptedPassword, authOptions);
	},

	ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
	ACCESSIBLE: Keychain.ACCESSIBLE,
	AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE
};
