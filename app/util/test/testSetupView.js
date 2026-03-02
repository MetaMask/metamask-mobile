/**
 * COMPONENT-VIEW TEST SETUP
 * Isolated environment for View Tests.
 * Does NOT import the legacy testSetup.js to avoid pollution.
 */

/* eslint-disable import/no-commonjs */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */

const { NativeModules } = require('react-native');
// eslint-disable-next-line import/no-nodejs-modules
const nodeCrypto = require('crypto');

// Secure random helper to avoid duplication
const getRandomValuesCompat = (arr) =>
  nodeCrypto?.webcrypto?.getRandomValues
    ? nodeCrypto.webcrypto.getRandomValues(arr)
    : (nodeCrypto.randomFillSync(arr), arr);

// 1. Essential React Native Infrastructure Mocks
// ------------------------------------------------

// Mock unstable_batchedUpdates more reliably
const mockBatchedUpdates = jest.fn((fn) => {
  if (typeof fn === 'function') {
    return fn();
  }
  return fn;
});

jest.mock('react-native', () => {
  const originalModule = jest.requireActual('react-native');
  originalModule.unstable_batchedUpdates = mockBatchedUpdates;
  return originalModule;
});

// --------------------------------------------------------------------------------
// External Library Mocks & Test Environment Configuration
// --------------------------------------------------------------------------------
// We group non-React Native mocks here to ensure consistent behavior across tests.
// These mocks replace native modules and external libraries that either:
// 1. Depend on native code not available in the Jest environment (e.g., filesystem, crypto).
// 2. Perform async operations that cause "act()" warnings or flakiness (e.g., animations, analytics).
// 3. Are not the focus of view tests and add unnecessary complexity.
// --------------------------------------------------------------------------------

// Mock redux-devtools-expo-dev-plugin
// eslint-disable-next-line no-empty-function
jest.mock('redux-devtools-expo-dev-plugin', () => {});

// Mock expo/fetch
jest.mock('expo/fetch', () => ({
  fetch,
}));

// Reanimated setup is usually required for navigation/animations
try {
  require('react-native-reanimated').setUpTests();
  global.__reanimatedWorkletInit = jest.fn();
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn(
    '[testSetupView] react-native-reanimated test setup skipped:',
    e?.message ?? e,
  );
}

// Mock SettingsManager (prevents TurboModuleRegistry invariant violations)
if (!NativeModules.SettingsManager) {
  NativeModules.SettingsManager = {
    settings: {},
    getConstants: () => ({ settings: {} }),
  };
}

// Mock PlatformConstants if missing (common in RN Jest environment)
if (!NativeModules.PlatformConstants) {
  NativeModules.PlatformConstants = {
    forceTouchAvailable: false,
  };
}

// Mock Safe Area Context (required by React Navigation)
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Mock NativeEventEmitter to prevent crashes in Node environment
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock react-native-quick-crypto
jest.mock('react-native-quick-crypto', () => {
  // eslint-disable-next-line import/no-nodejs-modules
  const mockNodeCrypto = require('crypto');
  const getRandomValuesCompatLocal = (arr) =>
    mockNodeCrypto?.webcrypto?.getRandomValues
      ? mockNodeCrypto.webcrypto.getRandomValues(arr)
      : (mockNodeCrypto.randomFillSync(arr), arr);

  return {
    getRandomValues: jest.fn((array) => getRandomValuesCompatLocal(array)),
    subtle: {
      importKey: jest.fn((format, keyData, algorithm, extractable, keyUsages) =>
        Promise.resolve({
          format,
          keyData,
          algorithm,
          extractable,
          keyUsages,
        }),
      ),
      deriveBits: jest.fn((algorithm, baseKey, length) =>
        Promise.resolve(getRandomValuesCompatLocal(new Uint8Array(length))),
      ),
      exportKey: jest.fn((format, key) =>
        Promise.resolve(new Uint8Array([1, 2, 3, 4])),
      ),
      encrypt: jest.fn(() =>
        Promise.resolve(
          new Uint8Array([
            123, 34, 116, 101, 115, 116, 34, 58, 34, 100, 97, 116, 97, 34, 125,
            58,
          ]),
        ),
      ),
      decrypt: jest.fn(() =>
        Promise.resolve(
          new Uint8Array([
            123, 34, 116, 101, 115, 116, 34, 58, 34, 100, 97, 116, 97, 34, 125,
            58,
          ]),
        ),
      ),
    },
    randomUUID: jest.fn(() =>
      typeof mockNodeCrypto.randomUUID === 'function'
        ? mockNodeCrypto.randomUUID()
        : (() => {
            const b = mockNodeCrypto.randomBytes(16);
            b[6] = (b[6] & 0x0f) | 0x40;
            b[8] = (b[8] & 0x3f) | 0x80;
            const hex = b.toString('hex');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
              12,
              16,
            )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
          })(),
    ),
  };
});

// Mock global crypto
global.crypto = {
  getRandomValues: (arr) => getRandomValuesCompat(arr),
};

// Mock react-native-fs
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
  exists: () => Promise.resolve(true),
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
  readFile: () => Promise.resolve(''),
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

// Mock react-native-blob-util
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
  // Mock native module constants if accessed directly
  getConstants: () => ({
    DocumentDir: 'docs',
  }),
}));

// Mock Segment Analytics
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
    add: jest.fn(),
  };
  return global.segmentMockClient;
};

jest.mock('@segment/analytics-react-native', () => {
  class Plugin {
    type = 'utility';
    analytics = undefined;

    configure(analytics) {
      this.analytics = analytics;
    }
  }

  // Replace empty classes with simple constructor functions (Sonar S2094)
  function CountFlushPolicy(count) {
    return { count };
  }

  function TimerFlushPolicy(interval) {
    return { interval };
  }

  return {
    createClient: jest.fn(() => initializeMockClient()),
    PluginType: {
      enrichment: 'enrichment',
      utility: 'utility',
    },
    EventType: {
      TrackEvent: 'track',
      IdentifyEvent: 'identify',
    },
    Plugin,
    CountFlushPolicy,
    TimerFlushPolicy,
  };
});

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL: {
    ANY: 'ANY',
    SECURE_SOFTWARE: 'SOFTWARE',
    SECURE_HARDWARE: 'HARDWARE',
  },
  ACCESSIBLE: { WHEN_UNLOCKED: 'WHEN_UNLOCKED' },
  ACCESS_CONTROL: { USER_PRESENCE: 'USER_PRESENCE' },
  AUTHENTICATION_TYPE: { BIOMETRICS: 'BIOMETRICS' },
  BIOMETRY_TYPE: { FACE_ID: 'FaceID' },
  STORAGE_TYPE: { RSA: 'RSA' },
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null),
}));

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock other infrastructure modules
jest.mock('react-native-share', () => ({ open: jest.fn() }));
jest.mock('react-native-branch', () => ({ subscribe: jest.fn() }));
jest.mock('react-native-background-timer', () => ({
  runBackgroundTimer: jest.fn(),
  stopBackgroundTimer: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
}));
jest.mock('@react-native-cookies/cookies', () => ({
  get: jest.fn(),
  set: jest.fn(),
  clearAll: jest.fn(),
}));
jest.mock('@metamask/react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { WebView: (props) => <View {...props} /> };
});

// Mock @metamask/react-native-search-api
jest.mock('@metamask/react-native-search-api', () => 'SearchApi');

// Mock react-native-sensors
jest.mock('react-native-sensors', () => 'RNSensors');

// Mock NativeModules essentials
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

NativeModules.Aes = {
  sha256: jest.fn().mockImplementation((address) => {
    const uniqueAddressChar = address[2];
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

// Mock @notifee/react-native
jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureUserFeedback: jest.fn(),
  addBreadcrumb: jest.fn(),
  configureScope: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
  withScope: jest.fn(),
  setMeasurement: jest.fn(),
  startSpan: jest.fn(),
  startSpanManual: jest.fn(),
  startTransaction: jest.fn(),
  lastEventId: jest.fn(),
  getGlobalScope: jest.fn(() => ({
    setTag: jest.fn(),
  })),
}));

// Mock Firebase Messaging
jest.mock('@react-native-firebase/messaging', () => {
  const module = () => ({
    getToken: jest.fn(() => Promise.resolve('fcmToken')),
    deleteToken: jest.fn(() => Promise.resolve()),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    setBackgroundMessageHandler: jest.fn(() => Promise.resolve()),
    isDeviceRegisteredForRemoteMessages: jest.fn(() => Promise.resolve(false)),
    registerDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('registered'),
    ),
    unregisterDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('unregistered'),
    ),
    onMessage: jest.fn(),
    onTokenRefresh: jest.fn(),
  });
  module.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };
  return module;
});

// Mock Store (prevents circular dependencies and full store initialization)
let mockState = {};
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn().mockImplementation(() => mockState),
    dispatch: jest.fn(),
  },
  runSaga: jest
    .fn()
    .mockReturnValue({ toPromise: jest.fn().mockResolvedValue(undefined) }),
  _updateMockState: (state) => {
    mockState = state;
  },
}));

// Mock react-native-fade-in-image
jest.mock('react-native-fade-in-image', () => {
  const FadeIn = ({ children }) => children ?? null;
  return FadeIn;
});

// Mock react-native-clipboard
const MockRNCClipboard = {
  getString: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
  hasString: jest.fn(() => Promise.resolve(false)),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
jest.mock('@react-native-clipboard/clipboard', () => ({
  default: MockRNCClipboard,
  ...MockRNCClipboard,
}));

// Mock RNGestureHandlerModule for react-native-gesture-handler
const RNGestureHandlerModuleMock = {
  attachGestureHandler: jest.fn(),
  createGestureHandler: jest.fn(),
  dropGestureHandler: jest.fn(),
  updateGestureHandler: jest.fn(),
  forceTouchAvailable: jest.fn(),
  install: jest.fn(),
  flushOperations: jest.fn(),
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
  getConstants: () => ({
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
  }),
};

NativeModules.RNGestureHandlerModule = {
  ...RNGestureHandlerModuleMock,
  getConstants: jest.fn(RNGestureHandlerModuleMock.getConstants),
};

// Patch TurboModuleRegistry to support libraries requesting modules via TurboModules
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const originalModule = jest.requireActual(
    'react-native/Libraries/TurboModule/TurboModuleRegistry',
  );

  // Redefine mock inside factory to avoid ReferenceError due to hoisting
  const MockRNGH = {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    forceTouchAvailable: jest.fn(),
    install: jest.fn(),
    flushOperations: jest.fn(),
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
    getConstants: () => ({
      State: {
        UNDETERMINED: 0,
        FAILED: 1,
        BEGAN: 2,
        CANCELLED: 3,
        ACTIVE: 4,
        END: 5,
      },
      Directions: {
        RIGHT: 1,
        LEFT: 2,
        UP: 4,
        DOWN: 8,
      },
    }),
  };

  return {
    ...originalModule,
    getEnforcing: (name) => {
      if (name === 'RNGestureHandlerModule') {
        return MockRNGH;
      }
      if (name === 'SettingsManager') {
        return {
          getConstants: () => ({ settings: {} }),
          settings: {},
        };
      }
      if (name === 'RNCClipboard') {
        return {
          getString: jest.fn(() => Promise.resolve('')),
          setString: jest.fn(),
          hasString: jest.fn(() => Promise.resolve(false)),
          addListener: jest.fn(),
          removeListeners: jest.fn(),
        };
      }
      return originalModule.getEnforcing(name);
    },
    get: (name) => {
      if (name === 'RNGestureHandlerModule') {
        return MockRNGH;
      }
      if (name === 'RNCClipboard') {
        return {
          getString: jest.fn(() => Promise.resolve('')),
          setString: jest.fn(),
          hasString: jest.fn(() => Promise.resolve(false)),
          addListener: jest.fn(),
          removeListeners: jest.fn(),
        };
      }
      return originalModule.get?.(name);
    },
  };
});

// Mock RemoteImage to avoid async dimension calculations in tests
jest.mock('../../components/Base/RemoteImage', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => <View {...props} testID="mock-remote-image" />;
});
