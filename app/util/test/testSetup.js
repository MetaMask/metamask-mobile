import Adapter from 'enzyme-adapter-react-16';
import Enzyme from 'enzyme';
import { NativeModules } from 'react-native';
import mockRNAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';
import Engine from '../../core/Engine';
import NotificationManager from '../../core/NotificationManager';
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
