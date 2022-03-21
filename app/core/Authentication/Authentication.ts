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
import { AnyAction, Dispatch } from 'redux';
import AuthenticationError from './AuthenticationError';

/**
 * Holds auth data used to determine auth configuration
 */
export interface AuthData {
	type: AUTHENTICATION_TYPE; //Enum used to show type for authentication
	biometryType: string; //Type of biometry used to store user password provide by SecureKeychain
}

class AuthenticationService {
	private authData: AuthData = { type: AUTHENTICATION_TYPE.UNKNOWN, biometryType: '' };
	private dispatch: Dispatch<AnyAction> | undefined;

	/**
	 * This method creates the instance of the authentication class
	 * @param {Dispatch<AnyAction>} dispatch - A redux function that will dispatch global state actions
	 */
	init(dispatch: Dispatch<AnyAction>) {
		this.dispatch = dispatch;
	}

	private dispatchLogin(): void {
		if (this.dispatch) {
			this.dispatch(logIn());
		} else Logger.log('Attempted to dispatch login action but dispatch was not initialized');
	}

	private dispatchLogout(): void {
		if (this.dispatch) {
			this.dispatch(logOut());
		} else Logger.log('Attempted to dispatch logout action but dispatch was not initialized');
	}

	/**
	 * This method recreates the vault upon login if user is new and is not using the latest encryption lib
	 * @param password - password entered on login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	private loginVaultCreation = async (password: string, selectedAddress: string) => {
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
	private newWalletVaultAndRestore = async (password: string, parsedSeed: string, clearEngine: boolean) => {
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
	private createWalletVaultAndKeychain = async (password: string) => {
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
	storePassword = async (password: string, authType: AUTHENTICATION_TYPE) => {
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
	checkAuthenticationMethod = async (credentials: any) => {
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
		const authType = await this.checkAuthenticationMethod(undefined);
		if (rememberMe && !biometryChoice)
			return { type: AUTHENTICATION_TYPE.REMEMBER_ME, biometryType: authType.biometryType };
		return authType;
	};

	/**
	 * Setting up a new wallet for new users
	 * @param password - password provided by user
	 * @param authData - type of authentication required to fetch password from keychain
	 */
	newWalletAndKeyChain = async (password: string, authData: AuthData) => {
		try {
			await this.createWalletVaultAndKeychain(password);
			await this.storePassword(password, authData?.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
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
			await this.newWalletVaultAndRestore(password, parsedSeed, clearEngine);
			await this.storePassword(password, authData.type);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed wallet creation');
			throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
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
			await this.loginVaultCreation(password, selectedAddress);
			await this.storePassword(password, authData.type);
			this.dispatchLogin();
			this.authData = authData;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw new AuthenticationError(e, 'Failed to login', this.authData);
		}
	};

	/**
	 * Attempts to use biometric/pin code/remember me to login
	 * @param selectedAddress - current address pulled from persisted state
	 */
	appTriggeredAuth = async (selectedAddress: string) => {
		const credentials: any = await SecureKeychain.getGenericPassword();
		try {
			const password = credentials?.password;
			await this.loginVaultCreation(password, selectedAddress);
			if (!credentials) await this.storePassword(password, this.authData.type);
			this.dispatchLogin();
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'appTriggeredAuth failed to login');
			throw new AuthenticationError(e, 'appTriggeredAuth failed to login', this.authData);
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
		this.authData = { type: AUTHENTICATION_TYPE.UNKNOWN, biometryType: '' };
		this.dispatchLogout();
	};

	getType = async () => await this.checkAuthenticationMethod(undefined);
}
// eslint-disable-next-line import/prefer-default-export
export const Authentication = new AuthenticationService();
