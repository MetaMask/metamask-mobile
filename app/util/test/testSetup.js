import Adapter from 'enzyme-adapter-react-16';
import Enzyme from 'enzyme';
import { NativeModules } from 'react-native';
import mockRNAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';
import Engine from '../../core/Engine';
import NotificationManager from '../../core/NotificationManager';
import { decode, encode } from 'base-64';
/* eslint-disable import/no-namespace */
import * as themeUtils from '../theme';

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

jest.mock('../../core/NotificationManager', () => ({
  init: () => NotificationManager.init({}),
  getTransactionToView: () => null,
  setTransactionToView: (id) => NotificationManager.setTransactionToView(id),
  gotIncomingTransaction: () => null,
}));

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('../../core/Engine', () => ({
  init: () => Engine.init({}),
  context: {
    KeyringController: {
      keyring: {
        keyrings: [
          {
            mnemonic:
              'one two three four five six seven eight nine ten eleven twelve',
          },
        ],
      },
    },
  },
  refreshTransactionHistory: () => {
    Promise.resolve();
  },
}));

const keychainMock = {
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
  SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },
  getSupportedBiometryType: jest.fn().mockReturnValue('FaceID'),
};

jest.mock('react-native-keychain', () => keychainMock);
jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-branch', () => ({
  BranchSubscriber: () => {
    () => 'RNBranch';
  },
}));
jest.mock('react-native-sensors', () => 'RNSensors');
jest.mock('react-native-search-api', () => 'SearchApi');
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('react-native-background-timer', () => 'RNBackgroundTimer');
jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockRNAsyncStorage,
);
jest.mock('@react-native-cookies/cookies', () => 'RNCookies');

const mockReactNativeWebRTC = {
  RTCPeerConnection: () => null,
  RTCIceCandidate: () => null,
  RTCSessionDescription: () => null,
  RTCView: () => null,
  MediaStream: () => null,
  MediaStreamTrack: () => null,
  mediaDevices: () => null,
  registerGlobals: () => null,
};

jest.mock('react-native-webrtc', () => mockReactNativeWebRTC);

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

jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableOpacity',
  () => 'TouchableOpacity',
);
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableHighlight',
  () => 'TouchableHighlight',
);
jest.mock(
  'react-native/Libraries/Components/TextInput/TextInput',
  () => 'TextInput',
);

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn(),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
}));

jest.mock('../../images/static-logos.js', () => ({}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux-test'),
}));

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

jest.mock('../../util/theme', () => ({
  ...themeUtils,
  useAppThemeFromContext: () => themeUtils.mockTheme,
}));

jest.mock('@segment/analytics-react-native', () => ({
  ...jest.requireActual('@segment/analytics-react-native'),
  createClient: () => ({
    identify: jest.fn(),
    track: jest.fn(),
    group: jest.fn(),
  }),
}));

// eslint-disable-next-line import/no-commonjs
require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();
global.__reanimatedWorkletInit = jest.fn();
