import SecureKeychain from './SecureKeychain';
import Engine from './Engine';
import { recreateVaultWithSamePassword } from '../core/Vault';
import AsyncStorage from '@react-native-community/async-storage';
import { ENCRYPTION_LIB, ORIGINAL, EXISTING_USER, BIOMETRY_CHOICE_DISABLED, TRUE } from '../constants/storage';
import Logger from '../util/Logger';
import { logIn, logOut } from '../actions/user';
import { passwordRequirementsMet } from '../util/password';
import { strings } from '../../locales/i18n';

export enum AuthenticationType {
	BIOMETRIC = 'Biometric',
	PIN_CODE = 'PinCode',
	PASSWORD = 'Password',
	REMEMBER_ME = 'RememberMe',
}

const AuthenticationService = {
	/**
	 *
	 * @param biometryType
	 * @param credentials
	 * @returns
	 */
	async checkAuthenticationMethod(credentials: any) {
		const biometryType: any = await SecureKeychain.getSupportedBiometryType();
		const previouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);

		if (biometryType && !(previouslyDisabled && previouslyDisabled === TRUE) && credentials) {
			return AuthenticationType.BIOMETRIC;
		} else if (credentials) {
			return AuthenticationType.REMEMBER_ME;
		}
		return AuthenticationType.PASSWORD;
	},
	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	async autoAuth() {
		console.log('Authservice autoAuth');
		const credentials: any = await SecureKeychain.getGenericPassword();

		const type = await this.checkAuthenticationMethod(credentials);

		const password = credentials?.password;

		const locked = !passwordRequirementsMet(password);

		if (locked) throw new Error(strings('login.invalid_password'));

		try {
			await this.recreateVault(password);

			await this.storePassword(String(password), type);

			logIn();
			return;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	},
	/**
	 *
	 * @param selectedAddress
	 * @returns
	 */
	async manualAuth(password: string, type: AuthenticationType) {
		console.log('Authservice manualAuth');
		const locked = !passwordRequirementsMet(password);

		if (locked) throw new Error(strings('login.invalid_password'));

		try {
			await this.recreateVault(password);

			await this.storePassword(password, type);

			logIn();

			return;
		} catch (e: any) {
			this.logout();
			Logger.error(e.toString(), 'Failed to login');
			throw e;
		}
	},
	/**
	 *
	 * @param password
	 * @param type
	 */
	async recreateVault(password: string) {
		// Restore vault with user entered password
		const { KeyringController }: any = Engine.context;
		const { PreferencesController }: any = Engine.context;
		await KeyringController.submitPassword(password);
		const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);
		if (encryptionLib !== ORIGINAL && existingUser) {
			await recreateVaultWithSamePassword(String(password), PreferencesController.selectedAddress);
			await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
		}
	},
	/**
	 *
	 * @param password
	 * @param type
	 */
	async storePassword(password: string, type: AuthenticationType) {
		if (type === AuthenticationType.BIOMETRIC) {
			console.log('BIOMETRIC');
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.BIOMETRICS);
		} else if (type === AuthenticationType.REMEMBER_ME) {
			console.log('REMEMBER_ME_SET');
			await SecureKeychain.setGenericPassword(password, SecureKeychain.TYPES.REMEMBER_ME);
		} else {
			console.log('RESET_GENERIC');
			await SecureKeychain.resetGenericPassword();
		}
	},
	/**
	 *
	 */
	async logout() {
		const { KeyringController }: any = Engine.context;
		if (KeyringController.isUnlocked()) {
			await KeyringController.setLocked();
		}
		logOut();
	},
};

export default AuthenticationService;
