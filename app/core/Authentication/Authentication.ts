import SecureKeychain from '../SecureKeychain';
import Engine from '../Engine';
import { recreateVaultWithSamePassword } from '../Vault';
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
} from '../../constants/storage';
import Logger from '../../util/Logger';
import { logIn, logOut } from '../../actions/user';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import { Store } from 'redux';
import AuthenticationError from './AuthenticationError';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import LockManager from '../LockManager';

/**
 * Holds auth data used to determine auth configuration
 */
export interface AuthData {
	type: AUTHENTICATION_TYPE; //Enum used to show type for authentication
	biometryType?: BIOMETRY_TYPE;
}
class AuthenticationService {
	private authData: AuthData = { type: AUTHENTICATION_TYPE.UNKNOWN };
	private store: Store | undefined = undefined;
	private static isInitialized = false;
	private lockManagerInstance?: LockManager;

	/**
	 * This method creates the instance of the authentication class
	 * @param {Store} store - A redux function that will dispatch global state actions
	 */
	init(store: Store) {
		if (AuthenticationService.isInitialized === false) {
			AuthenticationService.isInitialized = true;
			this.store = store;
		} else {
			Logger.log('Attempted to call init on AuthenticationService but an instance has already been initialized');
		}
	}

	private dispatchLogin(): void {
		if (this.store) {
			this.store.dispatch(logIn());
		} else Logger.log('Attempted to dispatch logIn action but dispatch was not initialized');
	}

	private dispatchLogout(): void {
		if (this.store) {
			this.store.dispatch(logOut());
		} else Logger.log('Attempted to dispatch logOut action but dispatch was not initialized');
	}

	/**
	 * This method recreates the vault upon login if user is new and is not using the latest encryption lib
	 * @param password - password entered on login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	private loginVaultCreation = async (password: string, selectedAddress: string): Promise<void> => {
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
				throw new AuthenticationError(e, 'Unable to recreate vault', this.authData);
			}
		}
	};

	/**
	 * This method creates a new vault and restores with seed phrase and existing user data
	 * @param password - password provided by user, biometric, pincode
	 * @param parsedSeed - provided seed
	 * @param clearEngine - clear the engine state before restoring vault
	 */
	private newWalletVaultAndRestore = async (
		password: string,
		parsedSeed: string,
		clearEngine: boolean
	): Promise<void> => {
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
	private createWalletVaultAndKeychain = async (password: string): Promise<void> => {
		const { KeyringController }: any = Engine.context;
		await Engine.resetState();
		await KeyringController.createNewVaultAndKeychain(password);
	};

	/**
	 * Reset vault will empty password used to clear/reset vault upon errors during login/creation
	 */
	resetVault = async (): Promise<void> => {
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
	storePassword = async (password: string, authType: AUTHENTICATION_TYPE): Promise<void> => {
		if (authType === AUTHENTICATION_TYPE.BIOMETRIC) {
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
		} else if (authType === AUTHENTICATION_TYPE.PASSCODE) {
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.PASSCODE);
		} else if (authType === AUTHENTICATION_TYPE.REMEMBER_ME) {
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
	checkAuthenticationMethod = async (credentials: any): Promise<AuthData> => {
		const biometryType: any = await SecureKeychain.getSupportedBiometryType();
		const biometryPreviouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
		const passcodePreviouslyDisabled = await AsyncStorage.getItem(PASSCODE_DISABLED);

		if (biometryType && !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)) {
			return { type: AUTHENTICATION_TYPE.BIOMETRIC, biometryType };
		} else if (biometryType && !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)) {
			return { type: AUTHENTICATION_TYPE.PASSCODE, biometryType };
		} else if (credentials) {
			return { type: AUTHENTICATION_TYPE.REMEMBER_ME, biometryType };
		}
		return { type: AUTHENTICATION_TYPE.PASSWORD, biometryType };
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
			return { type: AUTHENTICATION_TYPE.BIOMETRIC, biometryType };
		} else if (rememberMe) {
			return { type: AUTHENTICATION_TYPE.REMEMBER_ME, biometryType };
		} else if (
			biometryType &&
			biometryChoice &&
			!(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
		) {
			return { type: AUTHENTICATION_TYPE.PASSCODE, biometryType };
		}
		return { type: AUTHENTICATION_TYPE.PASSWORD, biometryType };
	};

	/**
	 * Setting up a new wallet for new users
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 */
	newWalletAndKeyChain = async (password: string, authData: AuthData): Promise<void> => {
		console.log('newWallet');
		try {
			await this.createWalletVaultAndKeychain(password);
			await this.storePassword(password, authData?.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.lockManagerInstance = new LockManager(this.store?.getState().settings.lockTime);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
		}
	};

	/**
	 * Generate a brand new wallet from a SRP
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 * @param parsedSeed - parsed SRP
	 * @param clearEngine - boolean to clear the state of the engine
	 */
	newWalletAndRestore = async (
		password: string,
		authData: AuthData,
		parsedSeed: string,
		clearEngine: boolean
	): Promise<void> => {
		try {
			await this.newWalletVaultAndRestore(password, parsedSeed, clearEngine);
			await this.storePassword(password, authData.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.lockManagerInstance = new LockManager(this.store?.getState().settings.lockTime);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
		}
	};

	/**
	 * Manual user password entry for login
	 * @param selectedAddress - current address pulled from persisted state
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 */
	userEntryAuth = async (password: string, authData: AuthData, selectedAddress: string): Promise<void> => {
		try {
			await this.loginVaultCreation(password, selectedAddress);
			await this.storePassword(password, authData.type);
			this.lockManagerInstance = new LockManager(this.store?.getState().settings.lockTime);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			throw new AuthenticationError(e, 'Failed to login', this.authData);
		}
	};

	/**
	 * Attempts to use biometric/pin code/remember me to login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	appTriggeredAuth = async (selectedAddress: string): Promise<void> => {
		const credentials: any = await SecureKeychain.getGenericPassword();
		try {
			const password = credentials?.password;
			await this.loginVaultCreation(password, selectedAddress);
			if (!credentials) await this.storePassword(password, this.authData.type);
			this.lockManagerInstance = new LockManager(this.store?.getState().settings.lockTime);
			this.dispatchLogin();
		} catch (e: any) {
			this.logout();
			throw new AuthenticationError(e, 'appTriggeredAuth failed to login', this.authData);
		}
	};

	/**
	 * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
	 */
	logout = async (): Promise<void> => {
		const { KeyringController }: any = Engine.context;
		await SecureKeychain.resetGenericPassword();
		if (KeyringController.isUnlocked()) {
			await KeyringController.setLocked();
		}
		this.authData = { type: AUTHENTICATION_TYPE.UNKNOWN };
		this.dispatchLogout();
		this.lockManagerInstance?.stopListening();
	};

	/**
	 * Set the lock time
	 */
	setLockTime = (lockTime: number): void => {
		if (lockTime) this.lockManagerInstance?.updateLockTime(lockTime);
	};

	/**
	 * Set the navigate to lock screen callback
	 */
	setNavigateToLockScreen = (navigateToLockScreen: any): void => {
		if (navigateToLockScreen) this.lockManagerInstance?.setNavigateToLockScreen(navigateToLockScreen);
	};

	getType = async (): Promise<AuthData> => await this.checkAuthenticationMethod(undefined);
}
// eslint-disable-next-line import/prefer-default-export
export const Authentication = new AuthenticationService();