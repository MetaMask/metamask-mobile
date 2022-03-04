import AuthenticationService, { AuthenticationType } from './AuthenticationService';
import Engine from '../core/Engine';
import AsyncStorage from '@react-native-community/async-storage';
import {
	BIOMETRY_CHOICE_DISABLED,
	TRUE,
	PASSCODE_DISABLED,
	BIOMETRY_CHOICE,
	PASSCODE_CHOICE,
} from '../constants/storage';

describe('AuthenticationService', () => {
	const mockStore = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		dispatch: () => {},
	};
	const keyRingControllerMock = {
		submitPassword: () => true,
	};

	beforeEach(() => {
		AsyncStorage.clear();
		Engine.init({ KeyringController: keyRingControllerMock });
		AuthenticationService.init(mockStore);
	});

	it('should return a type password', async () => {
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

	it('should successfully complete manualAuth', async () => {
		//TODO AsyncStorage is failing
		// jest.spyOn(KeyringController, 'submitPassword').getMockImplementation(() => {});
		// await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		// await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
		// await AuthenticationService.manualAuth(
		// 	'test',
		// 	{ type: AuthenticationType.PASSWORD, biometryType: undefined },
		// 	'0x000'
		// );
	});
});
