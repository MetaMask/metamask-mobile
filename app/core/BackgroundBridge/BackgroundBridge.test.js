import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import { getCaip25PermissionFromLegacyPermissions } from '../../util/permissions';
import AppConstants from '../../core/AppConstants';
jest.mock('../../util/permissions', () => ({
  getCaip25PermissionFromLegacyPermissions: jest.fn(),
}));

jest.mock('../Permissions', () => ({
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest.fn(),
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


jest.mock('@metamask/eth-json-rpc-filters');
jest.mock('@metamask/eth-json-rpc-filters/subscriptionManager', () => () => ({
  events: {
    on: jest.fn(),
  },
}));

function setupBackgroundBridge(url, isMMSDK = false) {
  // Arrange
  const {
    AccountsController,
    PermissionController,
    SelectedNetworkController,
    NetworkController,
  } = Engine.context;

  const mockAddress = '0x0';

  // Setup required mocks for account and permissions
  AccountsController.getSelectedAccount.mockReturnValue({
    address: mockAddress,
  });

  // Setup permission controller mocks
  PermissionController.getPermissions.mockReturnValue({
    bind: jest.fn(),
  });
  PermissionController.hasPermissions.mockReturnValue({
    bind: jest.fn(),
  });
  PermissionController.executeRestrictedMethod.mockReturnValue({
    bind: jest.fn(),
  });
  PermissionController.updateCaveat.mockReturnValue(jest.fn());

  // Setup network controller mocks
  NetworkController.getNetworkConfigurationByChainId.mockReturnValue({
    bind: jest.fn(),
  });
  SelectedNetworkController.getProviderAndBlockTracker.mockReturnValue({
    provider: {},
  });

  // Mock getPermittedAccounts to return the address
  getPermittedAccounts.mockReturnValue([mockAddress]);

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
    isMMSDK,
    ...defaultBridgeParams,
  });

  // Setup the engine property to support sendNotification
  bridge.engine = {
    emit: jest.fn()
  };

  return bridge;
}

describe('BackgroundBridge', () => {
  beforeEach(() => jest.clearAllMocks());
  describe('constructor', () => {
    const { KeyringController, PermissionController } = Engine.context;

    it('requests getProviderNetworkState from origin getter when network state is updated', async () => {
      const mockNetworkState = {
        chainId: '0x2',
        networkVersion: '2'
      };
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const mmBridge = setupBackgroundBridge(url, true);
      // Mock the getProviderNetworkState method to return the expected network state
      const getProviderSpy = jest
        .spyOn(bridge, 'getProviderNetworkState')
        .mockResolvedValue(mockNetworkState);

      const mmGetProviderSpy = jest
        .spyOn(mmBridge, 'getProviderNetworkState')
        .mockResolvedValue(mockNetworkState);

      await bridge.onStateUpdate();
      await mmBridge.onStateUpdate();
      // Verify the spy was called with the correct URL
      expect(getProviderSpy).toHaveBeenCalledWith(new URL(url).hostname);
      expect(mmGetProviderSpy).toHaveBeenCalledWith(mmBridge.channelId);
    });

    it('notifies of chain changes when network state is updated', async () => {
       // Create the new network state with a different chain
       const mockNetworkState = {
        chainId: '0x2',
        networkVersion: '2'
      };
       // Create the new network state with a different chain
       const oldMockNetworkState = {
        chainId: '0x1',
        networkVersion: '1'
      };
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotification');
      const getProviderSpy = jest.spyOn(bridge, 'getProviderNetworkState');

      expect(bridge.lastChainIdSent).toBe(oldMockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(oldMockNetworkState.networkVersion);

      // Trigger emulated initial state update
      getProviderSpy.mockResolvedValue(mockNetworkState);
      await bridge.onStateUpdate();


      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: AppConstants.NOTIFICATION_NAMES.chainChanged,
        params: mockNetworkState
      });
      expect(bridge.lastChainIdSent).toBe(mockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(mockNetworkState.networkVersion);


      getProviderSpy.mockResolvedValue(oldMockNetworkState);
      await bridge.onStateUpdate();


      expect(bridge.lastChainIdSent).toBe(oldMockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(oldMockNetworkState.networkVersion);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: AppConstants.NOTIFICATION_NAMES.chainChanged,
        params: oldMockNetworkState
      });
    });
  });
});
