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

/**
 * Different sources of authentication user can provide
 */
export enum AuthenticationType {
	BIOMETRIC = 'biometrics',
	PASSCODE = 'device_passcode',
	PASSWORD = 'password',
	REMEMBER_ME = 'rememberMe',
	UNKNOWN = 'UNKNOWN',
}

/**
 * Holds auth data used to determine auth configuration
 */
interface AuthData {
	type: AuthenticationType; //Enum used to show type for authentication
	biometryType: string; //Type of biometry used to store user password provide by SecureKeychain
}

class AuthenticationService {
	authData: AuthData = { type: AuthenticationType.UNKNOWN, biometryType: '' };
	store: any;

	/**
	 * This method recreates the vault upon login if user is new and is not using the latest encryption lib
	 * @param password - password entered on login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	_loginVaultCreation = async (password: string, selectedAddress: string) => {
		// Restore vault with user entered password
		const { KeyringController }: any = Engine.context;
		await KeyringController.submitPassword(password);
		const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);
		if (encryptionLib !== ORIGINAL && existingUser) {
			try {
				await recreateVaultWithSamePassword(password, selectedAddress);
				await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
			} catch (e: any) {
				throw new Error('Unable to recreate vault');
			}
		}
	};

	/**
	 * This method creates a new vault and restores with seed phrase and existing user data
	 * @param password - password provided by user, biometric, pincode
	 * @param parsedSeed - provided seed
	 * @param clearEngine - clear the engine state before restoring vault
	 */
	_newWalletVaultAndRestore = async (password: string, parsedSeed: string, clearEngine: boolean) => {
		// Restore vault with user entered password
		const { KeyringController }: any = Engine.context;
		if (clearEngine) await Engine.resetState();
		await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
		await KeyringController.createNewVaultAndRestore(password, parsedSeed);
	};

	/**
	 * This method creates a new wallet with all new data
	 * @param password - password provided by user, biometric, pincode
	 */
	_createWalletVaultAndKeychain = async (password: string) => {
		const { KeyringController }: any = Engine.context;
		await Engine.resetState();
		await KeyringController.createNewVaultAndKeychain(password);
	};

	/**
	 * Reset vault will empty password used to clear/reset vault upon errors during login/creation
	 */
	resetVault = async () => {
		const { KeyringController }: any = Engine.context;
		// Restore vault with empty password
		await KeyringController.submitPassword('');
		await SecureKeychain.resetGenericPassword();
	};

	/**
	 * Stores a user password in the secure keychain with a specific auth type
	 * @param password - password provided by user
	 * @param authType - type of authentication required to fetch password from keychain
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
	 * Fetches the password from the keychain using the auth method it was origonally stored
	 */
	getPassword = async () => await SecureKeychain.getGenericPassword();

	/**
	 * Checks the authetincation type configured in the previous login
	 * @param credentials - credentials provided by the user
	 * @returns @AuthData
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
	 * Takes a component's input to determine what @enum {AuthData} should be provided when creating a new password, wallet, etc..
	 * @param biometryChoice - type of biometric choice selected
	 * @param rememberMe - remember me setting (//TODO: to be removed)
	 * @returns @AuthData
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
	 * Setting up a new wallet for new users
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 */
	newWalletAndKeyChain = async (password: string, authData: AuthData) => {
		try {
			await this._createWalletVaultAndKeychain(password);
			await this.storePassword(password, authData?.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.store?.dispatch(logIn());
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw e;
		}
	};

	/**
	 *
	 * @param password
	 * @param authData
	 * @param parsedSeed
	 * @param clearEngine
	 */
	newWalletAndRestore = async (password: string, authData: AuthData, parsedSeed: string, clearEngine: boolean) => {
		try {
			await this._newWalletVaultAndRestore(password, parsedSeed, clearEngine);
			await this.storePassword(password, authData.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.store?.dispatch(logIn());
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw e;
		}
	};

	/**
	 * Manual user password entry for login
	 * @param selectedAddress - current address pulled from persisted state
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 */
	userEntryAuth = async (password: string, authData: AuthData, selectedAddress: string) => {
		try {
			await this._loginVaultCreation(password, selectedAddress);
			await this.storePassword(password, authData.type);
			this.store?.dispatch(logIn());
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	};

	/**
	 * Attempts to use biometric/pin code/remember me to login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	appTriggeredAuth = async (selectedAddress: string) => {
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
	 * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
	 */
	logout = async () => {
		const { KeyringController }: any = Engine.context;
		await SecureKeychain.resetGenericPassword();
		if (KeyringController.isUnlocked()) {
			await KeyringController.setLocked();
		}
		this.authData = { type: AuthenticationType.PASSWORD, biometryType: '' };
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
	},
	userEntryAuth: async (password: string, authType: AuthData, selectedAddress: string) =>
		await instance?.userEntryAuth(password, authType, selectedAddress),
	appTriggeredAuth: async (selectedAddress: string) => await instance?.appTriggeredAuth(selectedAddress),
	logout: async () => await instance?.logout(),
	newWalletAndKeyChain: async (password: string, type: AuthData) => {
		await instance?.newWalletAndKeyChain(password, type);
	},
	newWalletAndRestore: async (password: string, type: AuthData, parsedSeed: string, clearEngine: boolean) => {
		await instance?.newWalletAndRestore(password, type, parsedSeed, clearEngine);
	},
	resetVault: async () => await instance?.resetVault(),
	getType: async () => await instance?.checkAuthenticationMethod(undefined),
	storePassword: async (password: string, authType: AuthenticationType) => {
		await instance?.storePassword(password, authType);
	},
	getPassword: async () => await instance?.getPassword(),
	componentAuthenticationType: async (biometryChoice: boolean, rememberMe: boolean) =>
		await instance?.componentAuthenticationType(biometryChoice, rememberMe),
};
