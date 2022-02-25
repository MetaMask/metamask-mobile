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
	NEXT_MAKER_REMINDER,
	SEED_PHRASE_HINTS,
	BIOMETRY_CHOICE,
	PASSCODE_CHOICE,
} from '../constants/storage';
import Logger from '../util/Logger';
import { logIn, logOut } from '../actions/user';
import { strings } from '../../locales/i18n';

export enum AuthenticationType {
	BIOMETRIC = 'biometrics',
	PASSCODE = 'device_passcode',
	PASSWORD = 'password',
	REMEMBER_ME = 'rememberMe',
	UNKNOWN = 'UNKNOWN',
}

interface AuthData {
	type: AuthenticationType;
	biometryType: string;
}

class AuthenticationService {
	authData: AuthData = { type: AuthenticationType.UNKNOWN, biometryType: '' };
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
	_newWalletVaultAndRestore = async (password: string, parsedSeed: string, clearEngine: boolean) => {
		// Restore vault with user entered password
		const { KeyringController }: any = Engine.context;
		if (clearEngine) await Engine.resetState();
		await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
		await KeyringController.createNewVaultAndRestore(password, parsedSeed);
	};

	_createWalletVaultAndKeychain = async (password: string) => {
		const { KeyringController }: any = Engine.context;
		await Engine.resetState();
		await KeyringController.createNewVaultAndKeychain(password);
	};

	/**
	 *
	 */
	resetVault = async () => {
		const { KeyringController }: any = Engine.context;
		// Restore vault with empty password
		await KeyringController.submitPassword('');
		await SecureKeychain.resetGenericPassword();
	};

	/**
	 *
	 * @param password
	 * @param type
	 */
	storePassword = async (password: string, authType: AuthenticationType) => {
		if (authType === AuthenticationType.BIOMETRIC) {
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
		} else if (authType === AuthenticationType.PASSCODE) {
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.PASSCODE);
		} else if (authType === AuthenticationType.REMEMBER_ME) {
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.REMEMBER_ME);
		} else {
			await SecureKeychain.resetGenericPassword();
		}
	};

	/**
	 *
	 * @param password
	 * @param type
	 */
	getPassword = async () => await SecureKeychain.getGenericPassword();

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
		const biometry = await AsyncStorage.getItem(BIOMETRY_CHOICE);
		const passcode = await AsyncStorage.getItem(PASSCODE_CHOICE);

		if (biometryType && !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE) && biometry) {
			return { type: AuthenticationType.BIOMETRIC, biometryType };
		} else if (biometryType && !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE) && passcode) {
			return { type: AuthenticationType.PASSCODE, biometryType };
		} else if (credentials) {
			return { type: AuthenticationType.REMEMBER_ME, biometryType };
		}
		return { type: AuthenticationType.PASSWORD, biometryType };
	};

	/**
	 *
	 * @param biometryType
	 * @param credentials
	 * @returns
	 */
	componentAuthenticationType = async (biometryChoice: boolean, rememberMe: boolean) => {
		const biometryType: any = await SecureKeychain.getSupportedBiometryType();
		const biometryPreviouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
		const passcodePreviouslyDisabled = await AsyncStorage.getItem(PASSCODE_DISABLED);

		if (biometryType && biometryChoice && !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)) {
			return { type: AuthenticationType.BIOMETRIC, biometryType };
		} else if (rememberMe) {
			return { type: AuthenticationType.REMEMBER_ME, biometryType };
		} else if (
			biometryType &&
			biometryChoice &&
			!(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
		) {
			return { type: AuthenticationType.PASSCODE, biometryType };
		}
		return { type: AuthenticationType.PASSWORD, biometryType };
	};

	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	newWalletAndKeyChain = async (password: string, authData: AuthData) => {
		try {
			await this._createWalletVaultAndKeychain(password);
			await this.storePassword(password, authData?.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.store?.dispatch(logIn());
			this.authData = authData;
			return;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw e;
		}
	};

	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	newWalletAndRestore = async (password: string, authData: AuthData, parsedSeed: string, clearEngine: boolean) => {
		try {
			await this._newWalletVaultAndRestore(password, parsedSeed, clearEngine);
			await this.storePassword(password, authData.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.store?.dispatch(logIn());
			this.authData = authData;
			return;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw e;
		}
	};

	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	manualAuth = async (password: string, authData: AuthData, selectedAddress: string) => {
		try {
			await this._loginVaultCreation(password, selectedAddress);
			await this.storePassword(password, authData.type);
			this.store?.dispatch(logIn());
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
		const credentials: any = await SecureKeychain.getGenericPassword();
		if (!credentials) throw new Error(strings('Biometric/Pincode/Remember Me Not Set'));
		this.authData = await this.checkAuthenticationMethod(credentials);
		try {
			const password = credentials?.password;
			await this._loginVaultCreation(password, selectedAddress);
			if (!credentials) await this.storePassword(password, this.authData.type);
			this.store?.dispatch(logIn());
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	};

	/**
	 *
	 */
	logout = async () => {
		const { KeyringController }: any = Engine.context;
		await SecureKeychain.resetGenericPassword();
		if (KeyringController.isUnlocked()) {
			await KeyringController.setLocked();
		}
		this.store?.dispatch(logOut());
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
	manualAuth: async (password: string, authType: AuthData, selectedAddress: string) =>
		await instance?.manualAuth(password, authType, selectedAddress),
	autoAuth: async (selectedAddress: string) => instance?.autoAuth(selectedAddress),
	newWalletAndKeyChain: async (password: string, type: AuthData) => {
		await instance?.newWalletAndKeyChain(password, type);
	},
	newWalletAndRestore: async (password: string, type: AuthData, parsedSeed: string, clearEngine: boolean) => {
		await instance?.newWalletAndRestore(password, type, parsedSeed, clearEngine);
	},
	logout: async () => instance?.logout(),
	resetVault: async () => instance?.resetVault(),
	getType: async () => instance.checkAuthenticationMethod(undefined),
	storePassword: async (password: string, authType: AuthenticationType) => {
		await instance?.storePassword(password, authType);
	},
	getPassword: async () => await instance?.getPassword(),
	componentAuthenticationType: async (biometryChoice: boolean, rememberMe: boolean) =>
		await instance?.componentAuthenticationType(biometryChoice, rememberMe),
};
