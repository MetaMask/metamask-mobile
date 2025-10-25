// Mock dependencies - must be before imports
const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  Alert: {
    alert: mockAlert,
  },
  Platform: { OS: 'ios' },
  StyleSheet: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (styles: any) => styles,
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  NativeModules: {
    RCTDeviceEventEmitter: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      emit: jest.fn(),
    },
    CommunicationClient: {
      bindService: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),
}));

jest.mock('react-native-quick-base64', () => ({
  toByteArray: jest.fn(),
}));
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {},
  GestureDetector: 'GestureDetector',
  State: {},
  Directions: {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SafeAreaProvider: ({ children }: any) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('react-native-reanimated', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAnimatedComponent: (component: any) => component,
  useAnimatedStyle: () => ({}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSharedValue: (value: any) => ({ value }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withTiming: (value: any) => value,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withSpring: (value: any) => value,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withSequence: (...values: any[]) => values[0],
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
  },
  FadeIn: { duration: jest.fn() },
  FadeOut: { duration: jest.fn() },
}));
jest.mock('react-native-mmkv', () => {
  const MMKVMock = jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
  }));

  return { MMKV: MMKVMock };
});
jest.mock('../UnifiedDeeplinkService', () => ({
  deeplinkService: {
    handleDeeplink: jest.fn(),
    registerDefaultActions: jest.fn(),
  },
  DeeplinkService: {
    getInstance: jest.fn(),
  },
}));
jest.mock('../UnifiedDeeplinkService/ActionRegistry');
jest.mock('../UnifiedDeeplinkService/actions');
jest.mock('../../SDKConnectV2');
jest.mock('./connectWithWC', () => ({
  connectWithWC: jest.fn(),
}));
jest.mock('../Handlers/handleEthereumUrl');
jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));
jest.mock('./extractURLParams');

// Imports after mocks
import parseDeeplinkUnified, {
  initializeDeeplinkService,
} from './parseDeeplinkUnified';
import { deeplinkService } from '../UnifiedDeeplinkService';
import SDKConnectV2 from '../../SDKConnectV2';
import { connectWithWC } from './connectWithWC';
import handleEthereumUrl from '../Handlers/handleEthereumUrl';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import extractURLParams from './extractURLParams';
import DeeplinkManager from '../DeeplinkManager';
import { Alert } from 'react-native';

describe('parseDeeplinkUnified', () => {
  let mockInstance: DeeplinkManager;
  const mockNavigation = { navigate: jest.fn() };
  const mockBrowserCallBack = jest.fn();
  const mockOnHandled = jest.fn();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();

    // Spy on Alert.alert
    alertSpy = jest.spyOn(Alert, 'alert');

    // Reset the mocked deeplinkService
    (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
      success: true,
    });

    mockInstance = {
      navigation: mockNavigation,
      _handleEthereumUrl: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Default mock for extractURLParams
    (extractURLParams as jest.Mock).mockReturnValue({
      urlObj: new URL('metamask://test'),
      params: {},
    });
  });

  describe('SDKConnectV2 fast path', () => {
    it('handles SDKConnectV2 deeplinks immediately without initializing service', async () => {
      const url = 'metamask://sdk-connect?channelId=123';

      (SDKConnectV2.isConnectDeeplink as unknown as jest.Mock).mockReturnValue(
        true,
      );
      (
        SDKConnectV2.handleConnectDeeplink as unknown as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
        onHandled: mockOnHandled,
      });

      expect(SDKConnectV2.isConnectDeeplink).toHaveBeenCalledWith(url);
      expect(SDKConnectV2.handleConnectDeeplink).toHaveBeenCalledWith(url);
      expect(mockOnHandled).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(deeplinkService.handleDeeplink).not.toHaveBeenCalled();
    });

    it('continues to regular flow when not an SDK connect deeplink', async () => {
      const url = 'metamask://buy';

      (SDKConnectV2.isConnectDeeplink as unknown as jest.Mock).mockReturnValue(
        false,
      );
      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
        success: true,
        action: 'buy',
      });

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(SDKConnectV2.handleConnectDeeplink).not.toHaveBeenCalled();
      expect(deeplinkService.handleDeeplink).toHaveBeenCalledWith(url, {
        navigation: mockNavigation,
        origin: 'deeplink',
        browserCallBack: undefined,
        onHandled: undefined,
      });
      expect(result).toBe(true);
    });
  });

  describe('special protocol handling', () => {
    it('handles WalletConnect protocol directly', async () => {
      const url = 'wc:connection-string-with-params';
      const mockParams = { uri: 'wc:connection', channelId: '123' };

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: mockParams,
      });

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'qr-code',
        onHandled: mockOnHandled,
      });

      expect(mockOnHandled).toHaveBeenCalled();
      expect(connectWithWC).toHaveBeenCalledWith({
        handled: expect.any(Function),
        wcURL: 'wc:connection',
        origin: 'qr-code',
        params: mockParams,
      });
      expect(result).toBe(true);
      expect(deeplinkService.handleDeeplink).not.toHaveBeenCalled();
    });

    it('handles Ethereum protocol directly', async () => {
      const url = 'ethereum:0x123456789abcdef?value=1000000000000000000';

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
        onHandled: mockOnHandled,
      });

      expect(mockOnHandled).toHaveBeenCalled();
      expect(handleEthereumUrl).toHaveBeenCalledWith({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });
      expect(result).toBe(true);
      expect(deeplinkService.handleDeeplink).not.toHaveBeenCalled();
    });

    it('delegates http/https protocols to unified service', async () => {
      const url = 'https://link.metamask.io/buy';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });

      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
        success: true,
        action: 'buy',
      });

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
        browserCallBack: mockBrowserCallBack,
      });

      expect(deeplinkService.handleDeeplink).toHaveBeenCalledWith(url, {
        navigation: mockNavigation,
        origin: 'deeplink',
        browserCallBack: mockBrowserCallBack,
        onHandled: undefined,
      });
      expect(result).toBe(true);
    });
  });

  describe('unified service integration', () => {
    it('passes all options to unified service', async () => {
      const url = 'metamask://send/0x123';

      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
        success: true,
        action: 'send',
      });

      await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'qr-code',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(deeplinkService.handleDeeplink).toHaveBeenCalledWith(url, {
        navigation: mockNavigation,
        origin: 'qr-code',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });
    });

    it('returns false when unified service fails without user interaction', async () => {
      const url = 'metamask://invalid-action';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      const handleDeeplinkResult = {
        success: false,
        error: 'Unknown action',
        shouldProceed: true, // Explicitly set to true to show alert
      };
      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue(
        handleDeeplinkResult,
      );

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(result).toBe(false);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'parseDeeplinkUnified: Failed to handle deeplink',
        'Unknown action',
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown action',
      );
    });

    it('returns false when user declines modal without showing alert', async () => {
      const url = 'https://link.metamask.io/buy';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
        success: false,
        shouldProceed: false,
      });

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(result).toBe(false);
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('logs and alerts for Error objects', async () => {
      const url = 'metamask://buy';
      const error = new Error('Network error');

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockRejectedValue(error);

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        error,
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Error: Network error',
      );
      expect(result).toBe(false);
    });

    it('handles string errors', async () => {
      const url = 'metamask://buy';
      const error = 'String error message';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockRejectedValue(error);

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        error,
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
      expect(result).toBe(false);
    });

    it('handles falsy errors by showing unknown error', async () => {
      const url = 'metamask://buy';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockRejectedValue(false);

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        false,
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
      expect(result).toBe(false);
    });

    it('handles null errors', async () => {
      const url = 'metamask://buy';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockRejectedValue(null);

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        null,
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
      expect(result).toBe(false);
    });

    it('handles undefined errors', async () => {
      const url = 'metamask://buy';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockRejectedValue(
        undefined,
      );

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        undefined,
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
      expect(result).toBe(false);
    });

    it('handles malformed URLs', async () => {
      const url = 'not-a-valid-url';

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(DevLogger.log).toHaveBeenNthCalledWith(
        2,
        'parseDeeplinkUnified: Error',
        expect.objectContaining({
          name: 'TypeError',
          message: expect.stringContaining('Invalid URL'),
        }),
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty URL', async () => {
      const url = '';

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'Unknown error',
      );
    });

    it('handles URL with only protocol', async () => {
      const url = 'metamask://';

      (extractURLParams as jest.Mock).mockReturnValue({
        urlObj: new URL(url),
        params: {},
      });
      (deeplinkService.handleDeeplink as jest.Mock).mockResolvedValue({
        success: false,
        error: 'No action specified',
        shouldProceed: true,
      });

      const result = await parseDeeplinkUnified({
        deeplinkManager: mockInstance,
        url,
        origin: 'deeplink',
      });

      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(
        'deeplink.invalid',
        'No action specified',
      );
    });
  });
});

describe('initializeDeeplinkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
  });

  it('initializes service by calling registerDefaultActions', () => {
    initializeDeeplinkService();

    expect(DevLogger.log).toHaveBeenCalledWith(
      'Initializing unified deeplink service',
    );
    expect(deeplinkService.registerDefaultActions).toHaveBeenCalled();
  });
});
