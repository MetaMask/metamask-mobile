import Adapter from 'enzyme-adapter-react-16';
import Enzyme from 'enzyme';
import Engine from '../core/Engine';

import NotificationManager from '../core/NotificationManager';
import { NativeModules } from 'react-native';
import mockAsyncStorage from '../../node_modules/@react-native-community/async-storage/jest/async-storage-mock';
import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';
import { decode, encode } from 'base-64';

Enzyme.configure({ adapter: new Adapter() });

jest.useFakeTimers();

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
		new Promise((resolve) => {
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
	writeFile: jest.fn(),
}));

Date.now = jest.fn(() => 123);

jest.mock('../core/NotificationManager', () => ({
	init: () => NotificationManager.init({}),
	getTransactionToView: () => null,
	setTransactionToView: (id) => NotificationManager.setTransactionToView(id),
	gotIncomingTransaction: () => null,
}));

jest.mock('../core/Engine', () => ({
	init: () => Engine.init({}),
	context: {
		KeyringController: {
			keyring: {
				keyrings: [
					{
						mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
					},
				],
			},
		},
	},
	refreshTransactionHistory: () => {
		Promise.resolve();
	},
}));

// jest.mock('react-native-keychain', () => ({ getSupportedBiometryType: () => Promise.resolve('FaceId') }));
jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-branch', () => ({
	BranchSubscriber: () => {
		() => 'RNBranch';
	},
}));
jest.mock('react-native-sensors', () => 'RNSensors');
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
	Directions: {},
};

NativeModules.RNCNetInfo = {
	getCurrentConnectivity: jest.fn(),
	isConnectionMetered: jest.fn(),
	addListener: jest.fn(),
	removeListeners: jest.fn(),
	getCurrentState: jest.fn(() => Promise.resolve()),
};

NativeModules.RCTAnalytics = {
	optIn: jest.fn(),
	trackEvent: jest.fn(),
	getRemoteVariables: jest.fn(),
};

NativeModules.PlatformConstants = {
	forceTouchAvailable: false,
};

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => 'TouchableOpacity');
jest.mock('react-native/Libraries/Components/Touchable/TouchableHighlight', () => 'TouchableHighlight');
jest.mock('react-native/Libraries/Components/TextInput/TextInput', () => 'TextInput');

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
	runAfterInteractions: jest.fn(),
	createInteractionHandle: jest.fn(),
	clearInteractionHandle: jest.fn(),
	setDeadline: jest.fn(),
}));

jest.mock('../images/static-logos.js', () => ({}));
jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);

// crypto.getRandomValues
if (!window.crypto) {
	window.crypto = {};
}
if (!window.crypto.getRandomValues) {
	window.crypto.getRandomValues = require('polyfill-crypto.getrandomvalues');
}

// btoa
if (!global.btoa) {
	global.btoa = encode;
}

if (!global.atob) {
	global.atob = decode;
}

const mockAes = {
	encrypt: jest.fn(() => Promise.resolve()),
	decrypt: jest.fn(),
	pbkdf2: jest.fn(() => '0'),
	hmac256: jest.fn(),
	hmac512: jest.fn(),
	sha1: jest.fn(),
	sha256: jest.fn(),
	sha512: jest.fn(),
	randomUuid: jest.fn(),
	randomKey: jest.fn(),
};

// Aes https://github.com/tectiv3/react-native-aes
NativeModules.Aes = {
	...mockAes,
};

const mockAesForked = {
	encrypt: jest.fn(() => Promise.resolve()),
	decrypt: jest.fn(),
	pbkdf2: jest.fn(() => '0'),
	hmac256: jest.fn(),
	sha1: jest.fn(),
	sha256: jest.fn(),
	sha512: jest.fn(),
};

// AesForked: https://github.com/MetaMask/react-native-aes-crypto-forked
NativeModules.AesForked = {
	...mockAesForked,
};
