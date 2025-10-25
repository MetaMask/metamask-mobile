import {
  createConnectAction,
  createMMSDKAction,
  createAndroidSDKAction,
  registerSDKActions,
} from './SDKActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import SDKConnect from '../../../SDKConnect/SDKConnect';
import handleDeeplink from '../../../SDKConnect/handlers/handleDeeplink';
import parseOriginatorInfo from '../../parseOriginatorInfo';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';

// Mock dependencies
jest.mock('../../../SDKConnect/utils/DevLogger');
jest.mock('../../../SDKConnect/SDKConnect');
jest.mock('../../../SDKConnect/handlers/handleDeeplink', () => jest.fn());
jest.mock('../../parseOriginatorInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../../../core/AppConstants', () => ({
  BUNDLE_IDS: {
    ANDROID: 'io.metamask',
    IOS: 'io.metamask.MetaMask',
  },
  DEEPLINKS: {
    ORIGIN_DEEPLINK: 'deeplink',
  },
}));

// Helper function to create default DeeplinkUrlParams
const createDefaultParams = (
  overrides?: Partial<DeeplinkUrlParams>,
): DeeplinkUrlParams => ({
  uri: '',
  redirect: '',
  channelId: '',
  comm: '',
  pubkey: '',
  hr: false,
  ...overrides,
});

describe('SDKActions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>;
  let mockSDKConnect: jest.Mocked<SDKConnect>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeeplinkingService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDeeplinkingService = {
      handleConnection: jest.fn(),
      handleMessage: jest.fn(),
      bindAndroidSDK: jest.fn(),
    };

    mockSDKConnect = {
      state: {
        deeplinkingService: mockDeeplinkingService,
      },
      bindAndroidSDK: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    (SDKConnect.getInstance as jest.Mock).mockReturnValue(mockSDKConnect);
    (parseOriginatorInfo as jest.Mock).mockReturnValue({
      title: 'Test App',
      url: 'https://test.com',
    });
  });

  describe('createConnectAction', () => {
    it('creates SDK connect action with correct properties', () => {
      const action = createConnectAction();

      expect(action.name).toBe(ACTIONS.CONNECT);
      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.description).toBe('Handles SDK connection');
      expect(action.handler).toBeDefined();
    });

    it('handles deeplink connection', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({
          channelId: 'test-channel',
          comm: 'deeplinking',
          pubkey: 'test-pubkey',
          scheme: 'metamask:',
          originatorInfo: 'base64info',
          request: 'test-request',
        }),
        originalUrl: 'metamask://connect?channelId=test-channel&comm=deeplink',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'SDKActions: Handling connect action',
        {
          channelId: 'test-channel',
          comm: 'deeplinking',
          redirect: '',
        },
      );
      expect(mockDeeplinkingService.handleConnection).toHaveBeenCalledWith({
        channelId: 'test-channel',
        url: 'metamask://connect?channelId=test-channel&comm=deeplink',
        scheme: 'metamask:',
        dappPublicKey: 'test-pubkey',
        originatorInfo: 'base64info',
        request: 'test-request',
      });
    });

    it('handles socket connection', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({
          channelId: 'socket-channel',
          comm: 'socket',
          pubkey: 'socket-pubkey',
          v: '2',
          originatorInfo: 'base64info',
          hr: true,
          rpc: 'https://rpc.test.com',
        }),
        originalUrl:
          'metamask://connect?channelId=socket-channel&comm=socket&v=2',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(parseOriginatorInfo).toHaveBeenCalledWith({
        base64OriginatorInfo: 'base64info',
      });
      expect(handleDeeplink).toHaveBeenCalledWith({
        channelId: 'socket-channel',
        origin: 'qr-code',
        url: params.originalUrl,
        protocolVersion: 2,
        context: 'deeplink_scheme',
        originatorInfo: { title: 'Test App', url: 'https://test.com' },
        rpc: 'https://rpc.test.com',
        hideReturnToApp: true,
        otherPublicKey: 'socket-pubkey',
        sdkConnect: mockSDKConnect,
      });
    });

    it('handles missing required parameters', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({ channelId: 'test', comm: 'deeplinking' }), // Missing pubkey
        originalUrl: 'metamask://connect?channelId=test',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await expect(action.handler(params)).rejects.toThrow(
        'DeepLinkManager failed to connect - Invalid channelId, pubkey or communication layer',
      );
    });

    it('handles missing scheme for deeplink connection', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({
          channelId: 'test',
          comm: 'deeplinking',
          pubkey: 'test-key',
          // Missing scheme
        }),
        originalUrl: 'metamask://connect',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await expect(action.handler(params)).rejects.toThrow(
        'DeepLinkManager failed to connect - Invalid scheme',
      );
    });

    it('parses protocol version correctly', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({
          channelId: 'test',
          comm: 'socket',
          pubkey: 'test-key',
          v: '3',
        }),
        originalUrl: 'metamask://connect',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleDeeplink).toHaveBeenCalledWith(
        expect.objectContaining({
          protocolVersion: 3,
        }),
      );
    });

    it('defaults to protocol version 1 when not specified', async () => {
      const action = createConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CONNECT,
        path: '',
        params: createDefaultParams({
          channelId: 'test',
          comm: 'socket',
          pubkey: 'test-key',
        }),
        originalUrl: 'metamask://connect',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleDeeplink).toHaveBeenCalledWith(
        expect.objectContaining({
          protocolVersion: 1,
        }),
      );
    });
  });

  describe('createMMSDKAction', () => {
    it('creates SDK message action with correct properties', () => {
      const action = createMMSDKAction();

      expect(action.name).toBe(ACTIONS.MMSDK);
      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.description).toBe('Handles MM SDK messages');
      expect(action.handler).toBeDefined();
    });

    it('handles message without account', async () => {
      const action = createMMSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.MMSDK,
        path: '',
        params: createDefaultParams({
          channelId: 'msg-channel',
          pubkey: 'msg-pubkey',
          message: 'base64message',
        }),
        originalUrl: 'metamask://message',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'SDKActions: Handling MMSDK action',
        {
          channelId: 'msg-channel',
          message: 'present',
        },
      );
      expect(mockDeeplinkingService.handleMessage).toHaveBeenCalledWith({
        channelId: 'msg-channel',
        message: 'base64message',
        dappPublicKey: 'msg-pubkey',
        url: params.originalUrl,
        scheme: 'metamask:',
        account: '',
      });
    });

    it('handles message with account', async () => {
      const action = createMMSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.MMSDK,
        path: '',
        params: createDefaultParams({
          channelId: 'msg-channel',
          pubkey: 'msg-pubkey',
          message: 'base64message',
          account: '0x123@1',
        }),
        originalUrl: 'metamask://message',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(mockDeeplinkingService.handleMessage).toHaveBeenCalledWith({
        channelId: 'msg-channel',
        message: 'base64message',
        dappPublicKey: 'msg-pubkey',
        account: '0x123@1',
        url: params.originalUrl,
        scheme: 'metamask:',
      });
    });

    it('handles missing required parameters', async () => {
      const action = createMMSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.MMSDK,
        path: '',
        params: createDefaultParams({
          channelId: 'test',
          // Missing pubkey
        }),
        originalUrl: 'metamask://message',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await expect(action.handler(params)).rejects.toThrow(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid message',
      );
    });

    it('handles missing deeplinking service', async () => {
      mockSDKConnect.state.deeplinkingService = undefined;

      const action = createMMSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.MMSDK,
        path: '',
        params: createDefaultParams({
          channelId: 'test',
          pubkey: 'test-key',
          message: 'test',
        }),
        originalUrl: 'metamask://message',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      // Should not throw but won't call handler
      await action.handler(params);

      expect(mockDeeplinkingService.handleMessage).not.toHaveBeenCalled();
    });
  });

  describe('createAndroidSDKAction', () => {
    it('creates Android SDK action with correct properties', () => {
      const action = createAndroidSDKAction();

      expect(action.name).toBe(ACTIONS.ANDROID_SDK);
      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.description).toBe('Binds Android SDK');
      expect(action.handler).toBeDefined();
    });

    it('handles Android SDK binding', async () => {
      const action = createAndroidSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.ANDROID_SDK,
        path: '',
        params: createDefaultParams({
          channelId: 'android-channel',
          pubkey: 'android-pubkey',
        }),
        originalUrl: 'metamask://bind',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'android-sdk',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'SDKActions: Handling Android SDK binding',
      );
      expect(mockSDKConnect.bindAndroidSDK).toHaveBeenCalled();
    });

    it('throws error if bindAndroidSDK fails', async () => {
      const mockError = new Error('Failed to bind');
      (mockSDKConnect.bindAndroidSDK as jest.Mock).mockRejectedValueOnce(
        mockError,
      );

      const action = createAndroidSDKAction();
      const params: DeeplinkParams = {
        action: ACTIONS.ANDROID_SDK,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://android-sdk',
        scheme: 'metamask:',
        origin: 'deeplink',
      };

      await expect(action.handler(params)).rejects.toThrow('Failed to bind');
      expect(mockSDKConnect.bindAndroidSDK).toHaveBeenCalled();
    });
  });

  describe('registerSDKActions', () => {
    it('registers all SDK actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerSDKActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.CONNECT }),
        expect.objectContaining({ name: ACTIONS.MMSDK }),
        expect.objectContaining({ name: ACTIONS.ANDROID_SDK }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerSDKActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock
        .calls[0][0];
      expect(registeredActions).toHaveLength(3);
    });

    it('registers actions in correct order', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerSDKActions(mockRegistry);

      const actions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(actions[0].name).toBe(ACTIONS.CONNECT);
      expect(actions[1].name).toBe(ACTIONS.MMSDK);
      expect(actions[2].name).toBe(ACTIONS.ANDROID_SDK);
    });

    it('ensures all actions only support metamask scheme', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerSDKActions(mockRegistry);

      const actions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actions.forEach((action: any) => {
        expect(action.supportedSchemes).toEqual(['metamask://']);
      });
    });
  });
});
