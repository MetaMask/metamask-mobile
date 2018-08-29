import Adapter from 'enzyme-adapter-react-16';
import Enzyme from 'enzyme';
import Engine from '../core/Engine';
import { View } from 'react-native';
import I18nJs from 'i18n-js'; // eslint-disable-line import/no-extraneous-dependencies

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
	}
}));

jest.mock('react-native-keychain', () => ({ getSupportedBiometryType: () => Promise.resolve('FaceId') }));
jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-fabric', () => 'Fabric');
jest.mock('react-native-camera', () => ({
	RNCamera: View,
	Aspect: true
}));

I18nJs.locale = 'en';
jest.mock('react-native-i18n', () => ({
	...I18nJs,
	getLanguages: () => Promise.resolve(['en']),
	currentLocale: () => 'en'
}));
