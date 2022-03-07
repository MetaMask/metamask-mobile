import AuthenticationService, { AuthenticationType } from './AuthenticationService';
import AsyncStorage from '@react-native-community/async-storage';
import {
	BIOMETRY_CHOICE_DISABLED,
	TRUE,
	PASSCODE_DISABLED,
	BIOMETRY_CHOICE,
	PASSCODE_CHOICE,
} from '../constants/storage';
import Engine from './Engine';
import configureMockStore from 'redux-mock-store';

describe('AuthenticationService', () => {
	const mockStore = configureMockStore();
	const initialState = {
		privacy: { approvedHosts: {}, privacyMode: true },
		browser: { history: [] },
		settings: { lockTime: 1000 },
		user: { passwordSet: true },
		engine: {
			backgroundState: {
				PreferencesController: { selectedAddress: '0x', identities: { '0x': { name: 'Account 1' } } },
				AccountTrackerController: { accounts: {} },
				KeyringController: { keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }] },
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
		Engine.init(store.getState);
		AuthenticationService.init(store);
	});

	afterEach(() => {
		AsyncStorage.clear();
	});

	it('should return a type password', async () => {
		//CLI to run test case: cd '/Users/sethkfman/workspace/metamask-mobile' node '/Users/sethkfman/workspace/metamask-mobile/node_modules/.bin/jest' '/Users/sethkfman/workspace/metamask-mobile/app/core/AuthenticationService.test.ts' -t 'AuthenticationService should return a type password'
		// Test case is failing with this error: TypeError: Keychain.getSupportedBiometryType is not a function
		// The goal would be to mock the SecureKeychain inline to return the Promise.resolve('FaceId')
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceId');
		expect(result.type).toEqual(AuthenticationType.PASSWORD);
	});

	it('should return a type biometric', async () => {
		//TODO AsyncStorage is failing
		await AsyncStorage.setItem(BIOMETRY_CHOICE, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceId');
		expect(result.type).toEqual(AuthenticationType.BIOMETRIC);
	});

	it('should return a type passcode', async () => {
		//TODO AsyncStorage is failing
		await AsyncStorage.setItem(PASSCODE_CHOICE, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceId');
		expect(result.type).toEqual(AuthenticationType.PASSCODE);
	});

	it('should return a type password with biometric & pincode disabled', async () => {
		//TODO AsyncStorage is failing
		await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toEqual('FaceId');
		expect(result.type).toEqual(AuthenticationType.PASSWORD);
	});

	it('should successfully complete userEntryAuth', async () => {
		//Create new wallet
		await AuthenticationService.newWalletAndKeyChain('test1234', {
			type: AuthenticationType.PASSWORD,
			biometryType: undefined,
		});
		// await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		// await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		// await AuthenticationService.userEntryAuth(
		// 	'test',
		// 	{ type: AuthenticationType.PASSWORD, biometryType: undefined },
		// 	'0x000'
		// );
	});
});
