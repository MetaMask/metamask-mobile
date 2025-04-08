import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { createEip1193MethodMiddleware } from '../RPCMethods/createEip1193MethodMiddleware';
import { getPermittedAccounts } from '../Permissions';

jest.mock('../Permissions', () => ({
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest.fn(),
}));

jest.mock('../RPCMethods/createEip1193MethodMiddleware', () => ({
  ...jest.requireActual('../RPCMethods/createEip1193MethodMiddleware'),
  createEip1193MethodMiddleware: jest.fn(),
}));

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
    it('creates Eip1193MethodMiddleware', async () => {
      // Arrange
      const {
        AccountsController,
        KeyringController,
        PermissionController,
        SelectedNetworkController,
      } = Engine.context;

      AccountsController.getSelectedAccount.mockReturnValue({
        address: '0x0',
      });
      PermissionController.getPermissions.mockReturnValue({
        bind: jest.fn(),
      });

      PermissionController.hasPermissions.mockReturnValue({
        bind: jest.fn(),
      });
      PermissionController.hasPermission.mockReturnValue({
        bind: jest.fn(),
      });
      PermissionController.executeRestrictedMethod.mockReturnValue({
        bind: jest.fn(),
      });
      SelectedNetworkController.getProviderAndBlockTracker.mockReturnValue({
        provider: {},
      });
      PermissionController.updateCaveat.mockReturnValue(jest.fn());

      const url = 'https:www.mock.io';
      const origin = new URL(url).hostname;
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
      const bridge = new BackgroundBridge({
        webview: null,
        channelId: 'clientId',
        url,
        isRemoteConn: true,
        ...defaultBridgeParams,
      });

      const passedObject = createEip1193MethodMiddleware.mock.calls[0][0];
      expect(passedObject.metamaskState).toEqual(bridge.getState());

      // Assert the getAccounts function
      passedObject.getAccounts();
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.channelId);
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.hostname);

      // Assert getCaip25PermissionFromLegacyPermissionsForOrigin
      const requestedPermissions = { somePermission: true };
      passedObject.getCaip25PermissionFromLegacyPermissionsForOrigin(
        requestedPermissions,
      );
      expect(
        Engine.getCaip25PermissionFromLegacyPermissions,
      ).toHaveBeenCalledWith(origin, requestedPermissions);

      // Assert getPermissionsForOrigin
      passedObject.getPermissionsForOrigin();
      expect(PermissionController.getPermissions).toHaveBeenCalledWith(origin);

      // Assert requestPermissionsForOrigin
      passedObject.requestPermissionsForOrigin(requestedPermissions);
      expect(PermissionController.requestPermissions).toHaveBeenCalledWith(
        { origin },
        requestedPermissions,
      );

      // Assert revokePermissionsForOrigin
      const permissionKeys = ['a', 'b'];
      passedObject.revokePermissionsForOrigin(permissionKeys);
      expect(PermissionController.revokePermissions).toHaveBeenCalledWith({
        [origin]: permissionKeys,
      });

      // Assert updateCaveat
      const caveatType = 'testCaveat';
      const caveatValue = { someValue: true };
      passedObject.updateCaveat(caveatType, caveatValue);
      expect(PermissionController.updateCaveat).toHaveBeenCalledWith(
        origin,
        caveatType,
        caveatValue,
      );

      // Assert getUnlockPromise
      // when already unlocked
      KeyringController.isUnlocked.mockReturnValueOnce(true);
      const unlockPromise1 = passedObject.getUnlockPromise();
      await expect(unlockPromise1).resolves.toBeUndefined();
      expect(KeyringController.isUnlocked).toHaveBeenCalled();

      // when needs to be unlocked
      KeyringController.isUnlocked.mockReturnValueOnce(false);
      passedObject.getUnlockPromise();
      expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
        expect.any(Function),
      );
    });
  });
});
