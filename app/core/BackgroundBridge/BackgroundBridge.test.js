import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import { createEip1193MethodMiddleware } from '../RPCMethods/createEip1193MethodMiddleware';
import Engine from '../Engine';

jest.mock('@metamask/eth-query', () => () => ({
  sendAsync: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../store', () => ({
  ...jest.requireActual('../../store'),
  store: {
    getState: () => ({
      inpageProvider: {
        networkId: '',
      },
      engine: {
        backgroundState: {
          NetworkController: {
            networksMetadata: { 1: { status: false } },
            selectedNetworkClientId: '1',
          },
        },
      },
    }),
  },
}));

jest.mock('../RPCMethods/createEip1193MethodMiddleware', () => ({
  ...jest.requireActual('../RPCMethods/createEip1193MethodMiddleware'),
  createEip1193MethodMiddleware: jest.fn(),
}));

jest.mock('@metamask/eth-json-rpc-filters');
jest.mock('@metamask/eth-json-rpc-filters/subscriptionManager', () => () => ({
  events: {
    on: jest.fn(),
  },
}));

describe('BackgroundBridge', () => {
  beforeEach(() => jest.clearAllMocks());
  describe('constructor', () => {
    it('creates Eip1193MethodMiddleware and pushes to engine', () => {
      // Arrange
      Engine.context.AccountsController.getSelectedAccount.mockReturnValue({
        address: '0x0',
      });
      Engine.context.PermissionController.getPermissions.mockReturnValue({
        bind: jest.fn(),
      });

      Engine.context.PermissionController.hasPermissions.mockReturnValue({
        bind: jest.fn(),
      });
      Engine.context.PermissionController.hasPermission.mockReturnValue({
        bind: jest.fn(),
      });
      Engine.context.PermissionController.executeRestrictedMethod.mockReturnValue(
        {
          bind: jest.fn(),
        },
      );
      Engine.context.SelectedNetworkController.getProviderAndBlockTracker.mockReturnValue(
        { provider: {} },
      );

      const defaultBridgeParams = getDefaultBridgeParams({
        originatorInfo: {
          url: 'string',
          title: 'title',
          platform: 'platform',
          dappId: '000',
        },
        clientId: 'clientId',
        connected: true,
      });

      // Act
      new BackgroundBridge({
        webview: null,
        channelId: 'clientId',
        url: 'https:www.mock.io',
        isRemoteConn: true,
        ...defaultBridgeParams,
      });

      // Assert
      expect(createEip1193MethodMiddleware).toHaveBeenCalledWith({
        metamaskState: expect.any(Object),
        getAccounts: expect.any(Function),
        getCaip25PermissionFromLegacyPermissionsForOrigin: expect.any(Function),
        getPermissionsForOrigin: expect.any(Function),
        requestPermissionsForOrigin: expect.any(Function),
        revokePermissionsForOrigin: expect.any(Function),
        updateCaveat: expect.any(Function),
        getUnlockPromise: expect.any(Function),
      });
    });
  });
});
