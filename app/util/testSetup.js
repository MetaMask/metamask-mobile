import Adapter from 'enzyme-adapter-react-16';
import Enzyme from 'enzyme';
import Engine from '../core/Engine';
import NotificationManager from '../core/NotificationManager';
import { NativeModules } from 'react-native';
import mockAsyncStorage from '../../node_modules/@react-native-community/async-storage/jest/async-storage-mock';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('react-native-fs', () => ({
	CachesDirectoryPath: jest.fn(),
	DocumentDirectoryPath: jest.fn(),
	ExternalDirectoryPath: jest.fn(),
	ExternalStorageDirectoryPath: jest.fn(),
	LibraryDirectoryPath: jest.fn(),
	MainBundlePath: 'testPath',
	PicturesDirectoryPath: jest.fn(),
	TemporaryDirectoryPath: jest.fn(),
	appendFile: jest.fn(),
	completeHandlerIOS: jest.fn(),
	copyAssetsVideoIOS: jest.fn(),
	copyFile: jest.fn(),
	copyFileAssets: jest.fn(),
	copyFileAssetsIOS: jest.fn(),
	downloadFile: jest.fn(),
	exists: jest.fn(),
	existsAssets: jest.fn(),
	getAllExternalFilesDirs: jest.fn(),
	getFSInfo: jest.fn(),
	hash: jest.fn(),
	isResumable: jest.fn(),
	mkdir: jest.fn(),
	moveFile: jest.fn(),
	pathForBundle: jest.fn(),
	pathForGroup: jest.fn(),
	read: jest.fn(),
	readDir: jest.fn(),
	readDirAssets: jest.fn(),
	readFile: () =>
		new Promise(resolve => {
			resolve('console.log()');
		}),
	readFileAssets: jest.fn(),
	readdir: jest.fn(),
	resumeDownload: jest.fn(),
	setReadable: jest.fn(),
	stat: jest.fn(),
	stopDownload: jest.fn(),
	stopUpload: jest.fn(),
	touch: jest.fn(),
	unlink: jest.fn(),
	uploadFiles: jest.fn(),
	write: jest.fn(),
	writeFile: jest.fn()
}));

Date.now = jest.fn(() => 123);

jest.mock('../core/NotificationManager', () => ({
	init: () => NotificationManager.init({}),
	getTransactionToView: () => null,
	setTransactionToView: id => NotificationManager.setTransactionToView(id),
	gotIncomingTransaction: () => null
}));

jest.mock('../core/Engine', () => ({
	init: () => Engine.init({}),
	context: {
		KeyringController: {
			keyring: {
				keyrings: [
					{
						mnemonic: 'one two three four five six seven eight nine ten eleven twelve'
					}
				]
			}
		}
	},
	refreshTransactionHistory: () => {
		Promise.resolve();
	}
}));

jest.mock('react-native-keychain', () => ({ getSupportedBiometryType: () => Promise.resolve('FaceId') }));
jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-branch', () => ({ subscribe: () => 'RNBranch' }));
jest.mock('react-native-sensors', () => 'RNSensors');
jest.mock('react-native-device-info', () => 'DeviceInfo');
jest.mock('react-native-search-api', () => 'SearchApi');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-background-timer', () => 'RNBackgroundTimer');
jest.mock('@react-native-community/async-storage', () => mockAsyncStorage);
jest.mock('@react-native-community/cookies', () => 'RNCookies');

NativeModules.RNGestureHandlerModule = {
	attachGestureHandler: jest.fn(),
	createGestureHandler: jest.fn(),
	dropGestureHandler: jest.fn(),
	updateGestureHandler: jest.fn(),
	forceTouchAvailable: jest.fn(),
	State: {},
	Directions: {}
};

NativeModules.RNCNetInfo = {
	getCurrentConnectivity: jest.fn(),
	isConnectionMetered: jest.fn(),
	addListener: jest.fn(),
	removeListeners: jest.fn(),
	getCurrentState: jest.fn(() => Promise.resolve())
};

NativeModules.RCTAnalytics = {
	optIn: jest.fn(),
	trackEvent: jest.fn(),
	getRemoteVariables: jest.fn()
};

NativeModules.PlatformConstants = {
	forceTouchAvailable: false
};

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => 'TouchableOpacity');
jest.mock('react-native/Libraries/Components/Touchable/TouchableHighlight', () => 'TouchableHighlight');
jest.mock('react-native/Libraries/Components/TextInput/TextInput', () => 'TextInput');

jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
