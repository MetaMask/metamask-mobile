import '../../__mocks__/react-native';
import { NativeModules } from 'react-native';
import mockRNAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';
/* eslint-disable import/no-namespace */
import { mockTheme } from '../theme';

global.window = {
  navigator: {
    userAgent: 'node.js',
  },
  location: {
    href: '',
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getComputedStyle: jest.fn(),
  document: {
    createElement: () => {
      const element = {
        style: {},
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        ownerDocument: {
          defaultView: global.window,
        },
      };
      return element;
    },
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    defaultView: global.window,
  },
  HTMLElement: class {
    constructor() {
      this.style = {};
      this.appendChild = jest.fn();
      this.removeChild = jest.fn();
      this.innerHTML = '';
      this.outerHTML = '';
      this.click = jest.fn();
      this.focus = jest.fn();
    }
  },
  Event: class {
    constructor(name, params = {}) {
      this.name = name;
      this.params = params;
      this.target = params.target || null;
      this.currentTarget = params.currentTarget || null;
    }
  },
  CustomEvent: class extends Event {
    constructor(name, params) {
      super(name, params);
    }
  },
  getSelection: () => ({
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
  }),
  scrollTo: jest.fn(),
  scrollBy: jest.fn(),
  scroll: jest.fn(),
  innerWidth: 1024,
  innerHeight: 768,
  requestAnimationFrame: jest.fn().mockImplementation((callback) => setTimeout(callback, 0)),
  cancelAnimationFrame: jest.fn().mockImplementation((id) => clearTimeout(id)),
  defaultView: global.window,
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
};

global.document = global.window.document;

jest.mock('react-native-quick-crypto', () => ({}));
jest.mock('react-native-blob-jsi-helper', () => ({}));

jest.mock('react-native', () => {
  const originalModule = jest.requireActual('react-native');

  // Set the Platform.OS property to the desired value
  originalModule.Platform.OS = 'ios'; // or 'android', depending on what you want to test

  return {
    ...originalModule,
    DeviceEventEmitter: {
      ...originalModule.DeviceEventEmitter,
      addListener: jest.fn(),
      removeListener: jest.fn((event, callback) => {
        // Simulate the behavior of removeListener
        if (typeof callback === 'function') {
          callback();
        }
      }),
    },
  };
});

jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  getConstants: () => ({
    settings: {},
  }),
  setValues: jest.fn(),
  deleteValues: jest.fn(),
}));

/*
 * NOTE: react-native-webview requires a jest mock starting on v12.
 * More info on https://github.com/react-native-webview/react-native-webview/issues/2934
 */
jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  const WebView = (props) => <View {...props} />;

  return {
    WebView,
  };
});

jest.mock('../../lib/snaps/preinstalled-snaps');

const mockFs = {
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
  exists: () =>
    new Promise((resolve) => {
      resolve('console.log()');
    }),
  existsAssets: jest.fn(),
  getAllExternalFilesDirs: jest.fn(),
  getFSInfo: jest.fn(),
  hash: jest.fn(),
  isResumable: jest.fn(),
  ls: jest.fn(),
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
};

jest.mock('react-native-fs', () => mockFs);

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DocumentDir: 'docs',
    },
    ...mockFs,
  },
  ios: {
    excludeFromBackupKey: jest.fn(),
  },
}));

Date.now = jest.fn(() => 123);

jest.mock('../../core/NotificationManager', () => ({
  init: jest.fn(),
  watchSubmittedTransaction: jest.fn(),
  getTransactionToView: jest.fn(),
  setTransactionToView: jest.fn(),
  gotIncomingTransaction: jest.fn(),
  requestPushNotificationsPermission: jest.fn(),
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

jest.mock('../../core/NotificationManager');

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock(
  'react-native/Libraries/Utilities/NativePlatformConstantsIOS',
  () => ({
    ...jest.requireActual(
      'react-native/Libraries/Utilities/NativePlatformConstantsIOS',
    ),
    getConstants: () => ({
      forceTouchAvailable: false,
      interfaceIdiom: 'en',
      isTesting: false,
      osVersion: 'ios',
      reactNativeVersion: { major: 60, minor: 1, patch: 0 },
      systemName: 'ios',
    }),
  }),
);

jest.mock('react-native-keychain', () => ({
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
  setInternetCredentials: jest
    .fn(('server', 'username', 'password'))
    .mockResolvedValue({ service: 'metamask', storage: 'storage' }),
  getInternetCredentials: jest
    .fn()
    .mockResolvedValue({ password: 'mock-credentials-password' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    ALWAYS: 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
      'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:
      'AccessibleAfterFirstUnlockThisDeviceOnly',
    ALWAYS_THIS_DEVICE_ONLY: 'AccessibleAlwaysThisDeviceOnly',
  },
}));

jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-branch', () => ({
  BranchSubscriber: () => {
    () => 'RNBranch';
  },
}));
jest.mock('react-native-sensors', () => 'RNSensors');
jest.mock('@metamask/react-native-search-api', () => 'SearchApi');
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('react-native-background-timer', () => 'RNBackgroundTimer');
jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockRNAsyncStorage,
);
jest.mock('@react-native-cookies/cookies', () => 'RNCookies');

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

NativeModules.NotifeeApiModule = {
  addListener: jest.fn(),
  eventsAddListener: jest.fn(),
  eventsNotifyReady: jest.fn(),
};

NativeModules.PlatformConstants = {
  forceTouchAvailable: false,
};

NativeModules.Aes = {
  sha256: jest.fn().mockImplementation((address) => {
    const uniqueAddressChar = address[2]; // Assuming 0x prefix is present, so actual third character is at index 2
    const hashBase = '012345678987654';
    return Promise.resolve(hashBase + uniqueAddressChar);
  }),
  pbkdf2: jest.fn().mockResolvedValue('mockedKey'),
  randomKey: jest.fn().mockResolvedValue('mockedIV'),
  encrypt: jest.fn().mockResolvedValue('mockedCipher'),
  decrypt: jest.fn().mockResolvedValue('{"mockData": "mockedPlainText"}'),
};

NativeModules.AesForked = {
  pbkdf2: jest.fn().mockResolvedValue('mockedKeyForked'),
  decrypt: jest.fn().mockResolvedValue('{"mockData": "mockedPlainTextForked"}'),
};

NativeModules.RNTar = {
  unTar: jest.fn().mockResolvedValue('/document-dir/archive'),
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

jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);

jest.mock('../theme', () => ({
  ...jest.requireActual('../theme'),
  useAppThemeFromContext: () => ({ ...mockTheme }),
}));

global.segmentMockClient = null;

const initializeMockClient = () => {
  global.segmentMockClient = {
    screen: jest.fn(),
    track: jest.fn(),
    identify: jest.fn(),
    flush: jest.fn(),
    group: jest.fn(),
    alias: jest.fn(),
    reset: jest.fn(),
  };
  return global.segmentMockClient;
};

jest.mock('@segment/analytics-react-native', () => ({
  createClient: jest.fn(() => initializeMockClient()),
}));

jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);

jest.mock('react-native/Libraries/Image/resolveAssetSource', () => ({
  __esModule: true,
  default: (source) => {
    return { uri: source.uri };
  },
}));

jest.mock('redux-persist', () => ({
  persistStore: jest.fn(),
  persistReducer: (_, reducer) => {
    return reducer || ((state) => state);
  },
  createTransform: jest.fn(),
  createMigrate: jest.fn(),
}));

jest.mock('react-native-default-preference', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

// eslint-disable-next-line import/no-commonjs
require('react-native-reanimated/lib/module/reanimated2/jestUtils').setUpTests();
global.__reanimatedWorkletInit = jest.fn();
global.__DEV__ = false;

jest.mock(
  '../../core/Engine',
  () => require('../../core/__mocks__/MockedEngine').default,
);

afterEach(() => {
  jest.restoreAllMocks();
  global.gc && global.gc(true);
});

global.crypto = {
  getRandomValues: (arr) => {
    const uint8Max = 255;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * (uint8Max + 1));
    }
    return arr;
  },
};

global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

console.log('window:', global.window);
console.log('document:', global.document);
console.log('window.defaultView:', global.window.defaultView);
console.log('document.defaultView:', global.document.defaultView);
