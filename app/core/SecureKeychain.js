import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Encryptor from './Encryptor';
import { strings } from '../../locales/i18n';

const privates = new WeakMap();
const encryptor = new Encryptor();
const defaultOptions = {
	service: 'com.metamask',
	authenticationPromptTitle: strings('authentication.auth_prompt_title'),
	authenticationPrompt: { title: strings('authentication.auth_prompt_desc') },
	authenticationPromptDesc: strings('authentication.auth_prompt_desc'),
	fingerprintPromptTitle: strings('authentication.fingerprint_prompt_title'),
	fingerprintPromptDesc: strings('authentication.fingerprint_prompt_desc'),
	fingerprintPromptCancel: strings('authentication.fingerprint_prompt_cancel')
};

/**
 * Class that wraps Keychain from react-native-keychain
 * abstracting metamask specific functionality and settings
 * and also adding an extra layer of encryption before writing into
 * the phone's keychain
 */
class SecureKeychain {
	isAuthenticating = false;

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
		const options = { service: defaultOptions.service };
		return Keychain.resetGenericPassword(options);
	},

	async getGenericPassword() {
		if (instance) {
			instance.isAuthenticating = true;
			const keychainObject = await Keychain.getGenericPassword(defaultOptions);
			if (keychainObject.password) {
				const encryptedPassword = keychainObject.password;
				const decrypted = await instance.decryptPassword(encryptedPassword);
				keychainObject.password = decrypted.password;
				instance.isAuthenticating = false;
				return keychainObject;
			}
			instance.isAuthenticating = false;
		}
		return null;
	},

	async setGenericPassword(key, password, authOptions) {
		const encryptedPassword = await instance.encryptPassword(password);
		return Keychain.setGenericPassword(key, encryptedPassword, { ...defaultOptions, ...authOptions });
	},
	ACCESS_CONTROL: Keychain.ACCESS_CONTROL,
	ACCESSIBLE: Keychain.ACCESSIBLE,
	AUTHENTICATION_TYPE: Keychain.AUTHENTICATION_TYPE
};
