import AsyncStorage from '@react-native-community/async-storage';
import { BIOMETRY_CHOICE_DISABLED, TRUE, PASSCODE_DISABLED } from '../constants/storage';
import configureMockStore from 'redux-mock-store';
import AuthenticationService from './AuthenticationService';
import AUTHENTICATION_TYPE from '../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import Engine from './Engine';

describe('AuthenticationService', () => {
	const mockStore = configureMockStore();
	const initialState = {
		privacy: { approvedHosts: {}, privacyMode: true },
		browser: { history: [] },
		settings: { lockTime: 1000 },
		user: { passwordSet: true },
		engine: {
			context: {},
			backgroundState: {
				PreferencesController: { selectedAddress: '0x', identities: { '0x': { name: 'Account 1' } } },
				AccountTrackerController: { accounts: {} },
				KeyringController: {
					keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
				},
				NetworkController: {
					provider: {
						type: 'mainnet',
					},
				},
			},
		},
	};
	const store = mockStore(initialState);

	beforeEach(() => {
		Engine.init(initialState.engine.backgroundState);
		AuthenticationService.init(store);
	});

	afterEach(() => {
		AsyncStorage.clear();
	});

	it('should return a type password', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceID');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.PASSWORD);
	});

	it('should return a type biometric', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceID');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
	});

	it('should return a type passcode', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.PASSCODE);
	});

	it('should return a type password with biometric & pincode disabled', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.PASSWORD);
	});

	it('should return a auth type for components AUTHENTICATION_TYPE.REMEMBER_ME', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		const result = await AuthenticationService.componentAUTHENTICATION_TYPE(false, true);
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
	});

	it('should return a auth type for components AUTHENTICATION_TYPE.PASSWORD', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		const result = await AuthenticationService.componentAUTHENTICATION_TYPE(false, false);
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.PASSWORD);
	});

	it('should return a auth type for components AUTHENTICATION_TYPE.PASSCODE', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		const result = await AuthenticationService.componentAUTHENTICATION_TYPE(true, false);
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.PASSCODE);
	});

	it('should return a auth type for components AUTHENTICATION_TYPE.BIOMETRIC', async () => {
		Keychain.getSupportedBiometryType = jest.fn().mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
		const result = await AuthenticationService.componentAUTHENTICATION_TYPE(true, false);
		expect(result.biometryType).toEqual('Fingerprint');
		expect(result.type).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
	});

	it('should return set a password using PASSWORD', async () => {
		let methodCalled = false;
		Keychain.resetGenericPassword = jest.fn().mockReturnValue((methodCalled = true));
		await AuthenticationService.storePassword('1234', AUTHENTICATION_TYPE.UNKNOWN);
		expect(methodCalled).toBeTruthy();
	});

	// it('should reset a password', async () => {
	// 	let methodCalled = false;
	// 	Keychain.resetGenericPassword = jest.fn().mockReturnValue((methodCalled = true));
	// 	await AuthenticationService.resetVault();
	// 	expect(methodCalled).toBeTruthy();
	// 	expect(await AsyncStorage.getItem(BIOMETRY_CHOICE)).toBeNull();
	// 	expect(await AsyncStorage.getItem(PASSCODE_CHOICE)).toBeNull();
	// });

	// it('should successfully complete userEntryAuth', async () => {
	// 	// //Create new wallet
	// 	await AuthenticationService.newWalletAndKeyChain('test1234', {
	// 		type: AUTHENTICATION_TYPE.PASSWORD,
	// 		biometryType: undefined,
	// 	});
	// 	await AuthenticationService.userEntryAuth(
	// 		'test',
	// 		{ type: AUTHENTICATION_TYPE.PASSWORD, biometryType: undefined },
	// 		'0x000'
	// 	);
	// });
});
