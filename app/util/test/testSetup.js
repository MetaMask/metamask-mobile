import { NativeModules, Linking, Keyboard } from 'react-native';
import mockRNAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';
/* eslint-disable import-x/no-namespace */
import { mockTheme } from '../theme';
import base64js from 'base64-js';

// Set up global polyfills for base64 functions
global.base64FromArrayBuffer = base64js.fromByteArray;
global.base64ToArrayBuffer = base64js.toByteArray;

// Augment RN preset Linking mock with missing methods needed by @react-navigation/native
Linking.removeEventListener = jest.fn();
Linking.openURL = jest.fn().mockResolvedValue(undefined);

// Keyboard.addListener must return a subscription with .remove() for KeyboardAvoidingView
// We need to patch the prototype/instance method that KeyboardAvoidingView uses
const RNKeyboard = require('react-native/Libraries/Components/Keyboard/Keyboard');
const origAddListener =
  RNKeyboard.default?.addListener || RNKeyboard.addListener;
const patchedAddListener = jest.fn((...args) => {
  try {
    const sub = origAddListener?.call(
      RNKeyboard.default || RNKeyboard,
      ...args,
    );
    if (sub && typeof sub.remove === 'function') return sub;
    return { remove: jest.fn() };
  } catch {
    return { remove: jest.fn() };
  }
});
if (RNKeyboard.default) {
  RNKeyboard.default.addListener = patchedAddListener;
} else {
  RNKeyboard.addListener = patchedAddListener;
}
Keyboard.addListener = patchedAddListener;

// Mock the redux-devtools-expo-dev-plugin module
jest.mock('redux-devtools-expo-dev-plugin', () => {});

// Mock Expo's fetch implementation
jest.mock('expo/fetch', () => {
  return {
    fetch: fetch,
  };
});

jest.mock('react-native-quick-crypto', () => ({
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    importKey: jest.fn((format, keyData, algorithm, extractable, keyUsages) => {
      return Promise.resolve({
        format,
        keyData,
        algorithm,
        extractable,
        keyUsages,
      });
    }),
    deriveBits: jest.fn((algorithm, baseKey, length) => {
      const derivedBits = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        derivedBits[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(derivedBits);
    }),
    exportKey: jest.fn((format, key) => {
      return Promise.resolve(new Uint8Array([1, 2, 3, 4]));
    }),
    encrypt: jest.fn((algorithm, key, data) => {
      return Promise.resolve(
        new Uint8Array([
          123, 34, 116, 101, 115, 116, 34, 58, 34, 100, 97, 116, 97, 34, 125,
        ]),
      );
    }),
    decrypt: jest.fn((algorithm, key, data) => {
      return Promise.resolve(
        new Uint8Array([
          123, 34, 116, 101, 115, 116, 34, 58, 34, 100, 97, 116, 97, 34, 125,
        ]),
      );
    }),
  },
  randomUUID: jest.fn(
    () => 'mock-uuid-' + Math.random().toString(36).slice(2, 11),
  ),
}));

// Create a persistent mock function that survives Jest teardown
const mockBatchedUpdates = jest.fn((fn) => {
  if (typeof fn === 'function') {
    return fn();
  }
  return fn;
});

jest.mock('react-native', () => {
  const originalModule = jest.requireActual('react-native');

  // Set the Platform.OS property to the desired value
  originalModule.Platform.OS = 'ios'; // or 'android', depending on what you want to test

  // Mock deprecated prop types for third-party packages that haven't been updated
  originalModule.Text.propTypes = {
    allowFontScaling: true,
    style: true,
  };

  originalModule.ViewPropTypes = {
    style: true,
  };

  // Mock unstable_batchedUpdates directly in the react-native module
  originalModule.unstable_batchedUpdates = mockBatchedUpdates;

  return originalModule;
});

// Mock unstable_batchedUpdates more reliably
const ReactNative = require('react-native');
if (ReactNative.unstable_batchedUpdates) {
  ReactNative.unstable_batchedUpdates = mockBatchedUpdates;
}

// Also mock it globally as a fallback
global.unstable_batchedUpdates = mockBatchedUpdates;

// Mock the specific module path that might be causing issues
jest.mock('react-native/index.js', () => {
  const originalModule = jest.requireActual('react-native');
  originalModule.unstable_batchedUpdates = mockBatchedUpdates;
  return originalModule;
});

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

const { createMockUseAnalyticsHook } = require('./analyticsMock');

const mockUseAnalytics = createMockUseAnalyticsHook();

jest.mock('../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => mockUseAnalytics),
}));

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

// Mock SDKConnectV2 singleton to prevent auto-initialization during test setup.
jest.mock('../../core/SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isMwpDeeplink: jest.fn(() => false),
    handleMwpDeeplink: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../core/NotificationManager');

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  const NativeEventEmitter = jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListeners: jest.fn(),
    removeAllListeners: jest.fn(),
    listenerCount: jest.fn(() => 0),
    emit: jest.fn(),
  }));
  return { __esModule: true, default: NativeEventEmitter };
});

jest.mock('react-native/Libraries/Utilities/NativePlatformConstantsIOS', () => {
  const mock = {
    getConstants: () => ({
      forceTouchAvailable: false,
      interfaceIdiom: 'en',
      isTesting: false,
      osVersion: 'ios',
      reactNativeVersion: { major: 60, minor: 1, patch: 0 },
      systemName: 'ios',
    }),
  };
  return { __esModule: true, default: mock };
});

jest.mock('react-native-keychain', () => ({
  // Security Level enum
  SECURITY_LEVEL: {
    ANY: 'MOCK_SECURITY_LEVEL_ANY',
    SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
    SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  },

  // Accessible enum
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    ALWAYS: 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
      'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:
      'AccessibleAfterFirstUnlockThisDeviceOnly',
  },

  // Access Control enum
  ACCESS_CONTROL: {
    USER_PRESENCE: 'UserPresence',
    BIOMETRY_ANY: 'BiometryAny',
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
    DEVICE_PASSCODE: 'DevicePasscode',
    APPLICATION_PASSWORD: 'ApplicationPassword',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE:
      'BiometryCurrentSetOrDevicePasscode',
  },

  // Authentication Type enum
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
    BIOMETRICS: 'AuthenticationWithBiometrics',
  },

  // Biometry Type enum
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    OPTIC_ID: 'OpticID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },

  // Storage Type enum
  STORAGE_TYPE: {
    FB: 'FacebookConceal',
    AES: 'KeystoreAES',
    AES_CBC: 'KeystoreAESCBC',
    AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth',
    AES_GCM: 'KeystoreAESGCM',
    RSA: 'KeystoreRSAECB',
  },

  // Security Rules enum
  SECURITY_RULES: {
    NONE: 'none',
    AUTOMATIC_UPGRADE: 'automaticUpgradeToMoreSecuredStorage',
  },

  // Generic password functions
  setGenericPassword: jest
    .fn()
    .mockResolvedValue({ service: 'metamask', storage: 'storage' }),
  getGenericPassword: jest.fn().mockResolvedValue({
    service: 'metamask',
    username: 'mock-username',
    password: 'mock-password',
    storage: 'storage',
  }),
  hasGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getAllGenericPasswordServices: jest.fn().mockResolvedValue(['metamask']),

  // Internet credentials functions
  setInternetCredentials: jest
    .fn()
    .mockResolvedValue({ service: 'metamask', storage: 'storage' }),
  getInternetCredentials: jest.fn().mockResolvedValue({
    server: 'mock-server',
    username: 'mock-username',
    password: 'mock-credentials-password',
    storage: 'storage',
  }),
  hasInternetCredentials: jest.fn().mockResolvedValue(true),
  resetInternetCredentials: jest.fn().mockResolvedValue(),

  // Biometry and authentication functions
  getSupportedBiometryType: jest.fn().mockResolvedValue('FaceID'),
  canImplyAuthentication: jest.fn().mockResolvedValue(true),
  getSecurityLevel: jest
    .fn()
    .mockResolvedValue('MOCK_SECURITY_LEVEL_SECURE_SOFTWARE'),

  // Shared web credentials (iOS only)
  requestSharedWebCredentials: jest.fn().mockResolvedValue({
    server: 'mock-server',
    username: 'mock-username',
    password: 'mock-password',
  }),
  setSharedWebCredentials: jest.fn().mockResolvedValue(),

  // Legacy exports for backward compatibility
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
  SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
}));

jest.mock('react-native-share', () => 'RNShare');
jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
}));
jest.mock('react-native-sensors', () => 'RNSensors');
jest.mock('@metamask/react-native-search-api', () => 'SearchApi');

jest.mock('react-native-background-timer', () => 'RNBackgroundTimer');
jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockRNAsyncStorage,
);
jest.mock('@react-native-cookies/cookies', () => 'RNCookies');

jest.mock('react-native-worklets', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-worklets/src/mock'),
);

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      getString: jest.fn((key) => store.get(key)),
      set: jest.fn((key, value) => store.set(key, value)),
      getBoolean: jest.fn((key) => store.get(key)),
      getNumber: jest.fn((key) => store.get(key)),
      delete: jest.fn((key) => store.delete(key)),
      remove: jest.fn((key) => store.delete(key)),
      contains: jest.fn((key) => store.has(key)),
      clearAll: jest.fn(() => store.clear()),
      getAllKeys: jest.fn(() => [...store.keys()]),
    }),
  };
});

NativeModules.RNGestureHandlerModule = {
  getConstants: jest.fn(() => ({
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
  })),
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

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const manager = {
    runAfterInteractions: jest.fn(),
    createInteractionHandle: jest.fn(),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
  };
  return { __esModule: true, default: manager, ...manager };
});

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

  class EventPlugin extends Plugin {
    execute(event) {
      return event;
    }
    identify(event) {
      return event;
    }
    track(event) {
      return event;
    }
    screen(event) {
      return event;
    }
    alias(event) {
      return event;
    }
    group(event) {
      return event;
    }
    flush() {}
    reset() {}
  }

  class DestinationPlugin extends EventPlugin {
    type = 'destination';
    key = '';
  }

  class CountFlushPolicy {
    constructor(count) {
      this.count = count;
    }
  }

  class TimerFlushPolicy {
    constructor(interval) {
      this.interval = interval;
    }
  }

  return {
    createClient: jest.fn(() => initializeMockClient()),
    PluginType: {
      enrichment: 'enrichment',
      destination: 'destination',
      utility: 'utility',
    },
    EventType: {
      TrackEvent: 'track',
      IdentifyEvent: 'identify',
    },
    Plugin,
    EventPlugin,
    DestinationPlugin,
    CountFlushPolicy,
    TimerFlushPolicy,
  };
});

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    changeUser: jest.fn(),
    logCustomEvent: jest.fn(),
    requestImmediateDataFlush: jest.fn(),
    setCustomUserAttribute: jest.fn(),
    setLanguage: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    Events: { PUSH_NOTIFICATION_EVENT: 'push_notification_event' },
    getInitialPushPayload: jest.fn(),
  },
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

jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// eslint-disable-next-line import/no-commonjs
const Reanimated = require('react-native-reanimated');
Reanimated.setUpTests();
global.__reanimatedWorkletInit = jest.fn();

// Patch configureReanimatedLogger so tests that import it don't crash.
if (typeof Reanimated.configureReanimatedLogger !== 'function') {
  Reanimated.configureReanimatedLogger = jest.fn();
}
if (!Reanimated.ReanimatedLogLevel) {
  Reanimated.ReanimatedLogLevel = { warn: 1, error: 2 };
}

// Patch Reanimated's makeMutable so that shared values' toJSON() won't blow up
// on circular references (the default implementation does JSON.stringify(value)
// which throws "Converting circular structure to JSON" or causes RangeError).
try {
  const mutables = require('react-native-reanimated/src/mutables');
  const origMakeMutable = mutables.makeMutable;
  if (origMakeMutable) {
    mutables.makeMutable = function patchedMakeMutable(value) {
      const mutable = origMakeMutable(value);
      if (mutable && typeof mutable.toJSON === 'function') {
        mutable.toJSON = () => {
          try {
            const seen = new WeakSet();
            return JSON.stringify(value, function (_key, val) {
              if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) return '[Circular]';
                seen.add(val);
              }
              return val;
            });
          } catch {
            return '"SharedValue(<unserializable>)"';
          }
        };
      }
      return mutable;
    };
  }
} catch {
  // Reanimated internals may change — fall through silently
}

// useAnimatedGestureHandler was removed in react-native-reanimated v4 but is
// still imported by legacy source code (e.g. ReusableModal). Patch the module
// so tests that render those components don't crash.
if (typeof Reanimated.useAnimatedGestureHandler !== 'function') {
  Reanimated.useAnimatedGestureHandler = jest.fn(() => ({}));
}

global.__DEV__ = false;

// Custom snapshot serializer to handle Reanimated shared value proxies.
expect.addSnapshotSerializer({
  test: (val) =>
    val != null &&
    typeof val === 'object' &&
    val._isReanimatedSharedValue === true,
  serialize: (val) => {
    try {
      const v = val.value;
      return `"SharedValue(${typeof v === 'object' ? JSON.stringify(v) : String(v)})"`;
    } catch {
      return '"SharedValue(<circular>)"';
    }
  },
});

// Mock the component-library BottomSheet to render children immediately
// and handle close/open callbacks synchronously (bypasses reanimated animations).
// Note: This mock can be overridden by individual test files if needed.
jest.mock('../../component-library/components/BottomSheets/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheet = React.forwardRef(
    (
      { children, onClose, onOpen, shouldNavigateBack = true, ...props },
      ref,
    ) => {
      // Mimic real BottomSheet: call navigation.goBack() when shouldNavigateBack is true
      let navigation;
      try {
        const { useNavigation } = require('@react-navigation/native');
        navigation = useNavigation();
      } catch {
        // navigation not available in this context
      }
      React.useImperativeHandle(ref, () => ({
        onOpenDialog: () => onOpen?.(),
        onOpenBottomSheet: () => onOpen?.(),
        onCloseDialog: () => {
          onClose?.();
          if (shouldNavigateBack) navigation?.goBack();
        },
        onCloseBottomSheet: (callback) => {
          onClose?.(!!callback);
          if (shouldNavigateBack) navigation?.goBack();
          callback?.();
        },
      }));
      const { testID, style: sheetStyle, accessibilityLabel } = props;
      return React.createElement(
        View,
        {
          testID: testID || 'bottom-sheet-mock',
          style: sheetStyle,
          accessibilityLabel,
        },
        children,
      );
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    __esModule: true,
    default: BottomSheet,
  };
});

// Mock react-native-modal to render children immediately (bypasses animation)
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Modal = ({ children, isVisible, testID, ...props }) => {
    if (isVisible === false) return null;
    return React.createElement(
      View,
      { testID: testID || 'modal-mock' },
      children,
    );
  };
  Modal.displayName = 'Modal';
  return { __esModule: true, default: Modal };
});

// Patch NativeAnimatedHelper to provide nativeEventEmitter.addListener.
// In RN 0.81+, createAnimatedPropsHook accesses
// NativeAnimatedHelper.nativeEventEmitter.addListener during useEffect mount.
// Using Object.defineProperty with a getter ensures the mock is always returned
// even if the original module uses a getter internally.
{
  const emitterMock = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
    removeSubscription: jest.fn(),
  };
  try {
    const mod = require('react-native/Libraries/Animated/NativeAnimatedHelper');
    const target = mod.default || mod;
    Object.defineProperty(target, 'nativeEventEmitter', {
      get: () => emitterMock,
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* ignore */
  }
}

jest.mock('../../core/Engine', () =>
  require('../../core/__mocks__/MockedEngine'),
);

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

jest.mock(
  'react-native-keyboard-controller',
  () => ({
    KeyboardProvider: ({ children }) => children,
    KeyboardAwareScrollView: require('react-native').ScrollView,
    KeyboardGestureArea: require('react-native').View,
    KeyboardStickyView: require('react-native').View,
    KeyboardToolbar: require('react-native').View,
    useKeyboardAnimation: () => ({
      height: { value: 0 },
      progress: { value: 0 },
    }),
    useReanimatedKeyboardAnimation: () => ({
      height: { value: 0 },
      progress: { value: 0 },
    }),
    useKeyboardHandler: () => {},
    useGenericKeyboardHandler: () => {},
    useKeyboardState: (selector) => {
      const defaultState = {
        isVisible: false,
        height: 0,
        duration: 0,
        timestamp: 0,
      };
      return selector ? selector(defaultState) : defaultState;
    },
    KeyboardEvents: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    KeyboardController: {
      setInputMode: jest.fn(),
      setDefaultMode: jest.fn(),
    },
    AndroidSoftInputModes: {
      SOFT_INPUT_ADJUST_NOTHING: 0,
      SOFT_INPUT_ADJUST_PAN: 1,
      SOFT_INPUT_ADJUST_RESIZE: 2,
      SOFT_INPUT_ADJUST_UNSPECIFIED: 3,
    },
  }),
  { virtual: true },
);

// Custom snapshot serializer to handle React Navigation's NavigationStateContext.
// The default context value uses getter properties (getKey, getIsInitial, etc.) that
// throw "Couldn't find a navigation context" when accessed. pretty-format triggers
// these getters during snapshot serialization, causing tests to fail.
expect.addSnapshotSerializer({
  test: (val) =>
    val != null &&
    typeof val === 'object' &&
    val.isDefault === true &&
    Object.getOwnPropertyDescriptor(val, 'getIsInitial')?.get != null,
  serialize: () => '"NavigationStateContext"',
});

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

// Mock Sentry to prevent initialization issues in tests
jest.mock('@sentry/react-native', () => ({
  // Core methods
  init: jest.fn(),
  wrap: (component) => component,

  // Capture methods
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureUserFeedback: jest.fn(),

  // Breadcrumb and context methods
  addBreadcrumb: jest.fn(),
  configureScope: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),

  // Scope methods
  withScope: jest.fn(),

  // Performance/tracing methods
  setMeasurement: jest.fn(),
  startSpan: jest.fn(),
  startSpanManual: jest.fn(),
  startTransaction: jest.fn(),

  // User feedback
  lastEventId: jest.fn(),

  // Global scope
  getGlobalScope: jest.fn(() => ({
    setTag: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/messaging', () => {
  const module = () => {
    return {
      getToken: jest.fn(() => Promise.resolve('fcmToken')),
      deleteToken: jest.fn(() => Promise.resolve()),
      subscribeToTopic: jest.fn(),
      unsubscribeFromTopic: jest.fn(),
      hasPermission: jest.fn(() =>
        Promise.resolve(module.AuthorizationStatus.AUTHORIZED),
      ),
      requestPermission: jest.fn(() =>
        Promise.resolve(module.AuthorizationStatus.AUTHORIZED),
      ),
      setBackgroundMessageHandler: jest.fn(() => Promise.resolve()),
      isDeviceRegisteredForRemoteMessages: jest.fn(() =>
        Promise.resolve(false),
      ),
      registerDeviceForRemoteMessages: jest.fn(() =>
        Promise.resolve('registered'),
      ),
      unregisterDeviceForRemoteMessages: jest.fn(() =>
        Promise.resolve('unregistered'),
      ),
      onMessage: jest.fn(),
      onTokenRefresh: jest.fn(),
    };
  };

  module.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };

  return module;
});

jest.mock('../../core/Analytics/MetaMetricsTestUtils', () => {
  return {
    default: {
      getInstance: jest.fn().mockReturnValue({
        trackEvent: jest.fn(),
      }),
    },
  };
});

// Mock whenEngineReady to prevent async Engine access after Jest teardown.
// Components that trigger analytics (trackView/trackEvent) cause the queue to call
// whenEngineReady(), which uses setTimeout and can run after tests finish.
jest.mock('../analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const originalModule = jest.requireActual(
    'react-native/Libraries/TurboModule/TurboModuleRegistry',
  );
  return {
    getEnforcing: (name) => {
      if (name === 'RNGestureHandlerModule') {
        return {
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
      }
      return originalModule.getEnforcing(name);
    },
    get: (name) => {
      if (name === 'RNGestureHandlerModule') {
        return {
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
      }
      return originalModule.get?.(name);
    },
  };
});
