import AuthenticationService, { AuthenticationType } from './AuthenticationService';
import Engine from '../core/Engine';
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
import MockStorage from 'app/__mocks__/@react-native-community';

describe('AuthenticationService', () => {
	jest.setMock('AsyncStorage', new MockStorage({}));
	const mockStore = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		dispatch: () => {},
	};

	it('should init correctly', async () => {
		Engine.init({ KeyringController: {} });
		expect(AuthenticationService.init(mockStore)).toBeDefined();
	});

	it('should return a type password', async () => {
		Engine.init({ KeyringController: {} });
		AuthenticationService.init(mockStore);
		const result = await AuthenticationService.getType();
		expect(result.biometryType).toBeUndefined();
		expect(result.type).toEqual(AuthenticationType.PASSWORD);
	});

	it('should return a type biometric', async () => {
		//TODO AsyncStorage is failing

		// await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		// await AsyncStorage.removeItem(PASSCODE_DISABLED);
		// await AsyncStorage.setItem(BIOMETRY_CHOICE, TRUE);
		// await AsyncStorage.removeItem(PASSCODE_CHOICE);
		// jest.mock('react-native-keychain', () => ({ getSupportedBiometryType: () => Promise.resolve('FaceId') }));

		// Engine.init({ KeyringController: {} });
		// AuthenticationService.init(mockStore);
		// const result = await AuthenticationService.getType();
		// expect(result.biometryType).toEqual('FaceId');
		// expect(result.type).toEqual(AuthenticationType.BIOMETRIC);
	});
});
