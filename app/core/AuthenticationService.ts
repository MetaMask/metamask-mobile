import SecureKeychain from './SecureKeychain';
import Engine from './Engine';
import { recreateVaultWithSamePassword } from '../core/Vault';
import AsyncStorage from '@react-native-community/async-storage';
import {
	ENCRYPTION_LIB,
	ORIGINAL,
	EXISTING_USER,
	BIOMETRY_CHOICE_DISABLED,
	TRUE,
	PASSCODE_DISABLED,
} from '../constants/storage';
import Logger from '../util/Logger';
import { logIn, logOut } from '../actions/user';
import { passwordRequirementsMet } from '../util/password';
import { strings } from '../../locales/i18n';

export enum AuthenticationType {
	BIOMETRIC = 'biometrics',
	PASSCODE = 'device_passcode',
	PASSWORD = 'password',
	REMEMBER_ME = 'rememberMe',
	UNKNOWN = 'UNKNOWN',
}

class AuthenticationService {
	type = AuthenticationType.UNKNOWN;
	store: any;

	/**
	 *
	 * @param password
	 * @param type
	 */
	_loginVaultCreation = async (password: string, selectedAddress: string) => {
		// Restore vault with user entered password
		const { KeyringController }: any = Engine.context;
		await KeyringController.submitPassword(password);
		const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);
		if (encryptionLib !== ORIGINAL && existingUser) {
			await recreateVaultWithSamePassword(password, selectedAddress);
			await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
		}
	};

	/**
	 *
	 * @param password
	 * @param type
	 */
	storePassword = async (password: string, authType: AuthenticationType) => {
		if (authType === AuthenticationType.BIOMETRIC) {
			console.log('BIOMETRIC SET');
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
		} else if (authType === AuthenticationType.PASSCODE) {
			console.log('PASSCODE SET');
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.PASSCODE);
		} else if (authType === AuthenticationType.REMEMBER_ME) {
			console.log('REMEMBER_ME_SET');
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.REMEMBER_ME);
		} else {
			console.log('PASSWORD SET');
			await SecureKeychain.resetGenericPassword();
		}
	};
	/**
	 *
	 */
	logout = async () => {
		const { KeyringController }: any = Engine.context;
		console.log('Auth LOGOUT KEYRING STATE PRIOR IS LOCKED', KeyringController.isUnlocked());
		if (KeyringController.isUnlocked()) {
			await KeyringController.setLocked();
		}
		console.log('Auth LOGOUT KEYRING STATE POST IS LOCKED', KeyringController.isUnlocked());
		this.store?.dispatch(logOut());
	};

	/**
	 *
	 * @param biometryType
	 * @param credentials
	 * @returns
	 */
	checkAuthenticationMethod = async (credentials: any) => {
		const biometryType: any = await SecureKeychain.getSupportedBiometryType();
		const biometryPreviouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
		const passcodePreviouslyDisabled = await AsyncStorage.getItem(PASSCODE_DISABLED);

		console.log('CHECK AUTH', biometryType, biometryPreviouslyDisabled, passcodePreviouslyDisabled);

		if (biometryType && !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)) {
			return AuthenticationType.BIOMETRIC;
		} else if (biometryType && !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)) {
			return AuthenticationType.PASSCODE;
		} else if (credentials) {
			return AuthenticationType.REMEMBER_ME;
		}
		return AuthenticationType.PASSWORD;
	};

	/**
	 *
	 * @param biometryType
	 * @param credentials
	 * @returns
	 */
	componentAuthenticationType = async (biometryChoice: boolean, rememberMe: boolean) => {
		const biometryType: any = await SecureKeychain.getSupportedBiometryType();

		console.log('componentAuthenticationType', biometryType, biometryChoice, rememberMe);

		if (biometryType && biometryChoice) {
			return AuthenticationType.BIOMETRIC;
		} else if (biometryType) {
			return AuthenticationType.PASSCODE;
		} else if (rememberMe) {
			return AuthenticationType.REMEMBER_ME;
		}
		return AuthenticationType.PASSWORD;
	};

	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	manualAuth = async (password: string, authType: AuthenticationType, selectedAddress: string) => {
		console.log('Authservice manualAuth');
		if (!password) throw new Error('Password not found');
		const locked = !passwordRequirementsMet(password);
		if (locked) throw new Error(strings('login.invalid_password'));

		try {
			await this._loginVaultCreation(password, selectedAddress);
			await this.storePassword(password, authType);
			this.store?.dispatch(logIn());
			this.type = authType;
			return;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	};

	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	autoAuth = async (selectedAddress: string) => {
		console.log('Authservice autoAuth');
		const credentials: any = await SecureKeychain.getGenericPassword();
		console.log('Authservice autoAuth cred', credentials);
		this.type = await this.checkAuthenticationMethod(credentials);

		console.log('Authservice autoAuth type', this.type);

		const password = credentials?.password;

		const locked = !passwordRequirementsMet(password);

		if (locked) throw new Error(strings('login.invalid_password'));

		try {
			await this._loginVaultCreation(password, selectedAddress);
			if (!credentials) await this.storePassword(password, this.type);
			await this.store?.dispatch(logIn());
		} catch (e: any) {
			console.log('Authservice autoAuth', e);
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	};
}

let instance: AuthenticationService;

export default {
	init: (store: any) => {
		if (!instance) {
			instance = new AuthenticationService();
			instance.store = store;
			instance.store.dispatch(logOut());
		}
		return instance;
	},
	manualAuth: async (password: string, authType: AuthenticationType, selectedAddress: string) =>
		instance?.manualAuth(password, authType, selectedAddress),
	autoAuth: async (selectedAddress: string) => instance?.autoAuth(selectedAddress),
	logout: async () => instance?.logout(),
	getType: async () => instance.checkAuthenticationMethod(undefined),
	storePassword: async (password: string, authType: AuthenticationType) => {
		await instance?.storePassword(password, authType);
	},
	componentAuthenticationType: async (biometryChoice: boolean, rememberMe: boolean) => {
		await instance?.componentAuthenticationType(biometryChoice, rememberMe);
	},
};
