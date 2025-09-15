import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import AppConstants from '../../core/AppConstants';
import { Caip25CaveatType } from '@metamask/chain-agnostic-permission';
import {
  EthAccountType,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import EthQuery from '@metamask/eth-query';
import { createDeferredPromise } from '@metamask/utils';

const mockSendAsync = jest.fn().mockResolvedValue(1);

jest.mock('../Permissions', () => ({
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest.fn(),
}));

jest.mock('@metamask/eth-query', () => () => ({
  sendAsync: mockSendAsync,
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

jest.mock('pump');
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
    TransactionController,
  } = Engine.context;

  const mockAddress = '0x0';

  // Setup required mocks for account and permissions
  AccountsController.getSelectedAccount.mockReturnValue({
    address: mockAddress,
  });
  AccountsController.listMultichainAccounts.mockReturnValue([
    {
      address: '123',
      metadata: {
        lastSelected: 1,
      },
    },
    {
      address: '456',
      metadata: {
        lastSelected: 2,
      },
    },
  ]);

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

  // Setup transaction controller mocks
  TransactionController.addTransaction.mockResolvedValue({
    bind: jest.fn(),
  });
  TransactionController.addTransactionBatch.mockResolvedValue({
    bind: jest.fn(),
  });
  TransactionController.isAtomicBatchSupported.mockResolvedValue({
    bind: jest.fn(),
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

  // Setup the engine property to support sendNotificationEip1193
  bridge.engine = {
    emit: jest.fn(),
  };

  return bridge;
}

describe('BackgroundBridge', () => {
  const { KeyringController, PermissionController } = Engine.context;

  beforeEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('requests getProviderNetworkState from origin getter when network state is updated', async () => {
      const mockNetworkState = {
        chainId: '0x2',
        networkVersion: '2',
      };
      const url = 'https://www.mock.io';
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
      expect(getProviderSpy).toHaveBeenCalledWith(new URL(url).origin);
      expect(mmGetProviderSpy).toHaveBeenCalledWith(mmBridge.channelId);
    });

    it('notifies of chain changes when network state is updated', async () => {
      // Create the new network state with a different chain
      const mockNetworkState = {
        chainId: '0x2',
        networkVersion: '2',
      };
      // Create the new network state with a different chain
      const oldMockNetworkState = {
        chainId: '0x1',
        networkVersion: '1',
      };
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationEip1193');
      const getProviderSpy = jest.spyOn(bridge, 'getProviderNetworkState');

      expect(bridge.lastChainIdSent).toBe(oldMockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(
        oldMockNetworkState.networkVersion,
      );

      // Trigger emulated initial state update
      getProviderSpy.mockResolvedValue(mockNetworkState);
      await bridge.onStateUpdate();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: AppConstants.NOTIFICATION_NAMES.chainChanged,
        params: mockNetworkState,
      });
      expect(bridge.lastChainIdSent).toBe(mockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(mockNetworkState.networkVersion);

      getProviderSpy.mockResolvedValue(oldMockNetworkState);
      await bridge.onStateUpdate();

      expect(bridge.lastChainIdSent).toBe(oldMockNetworkState.chainId);
      expect(bridge.networkVersionSent).toBe(
        oldMockNetworkState.networkVersion,
      );
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: AppConstants.NOTIFICATION_NAMES.chainChanged,
        params: oldMockNetworkState,
      });
    });
  });

  describe('notifySolanaAccountChangedForCurrentAccount', () => {
    it('emits nothing if there is no CAIP-25 permission', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are no permitted solana scopes and `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            'eip155:1': {
              accounts: [],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted solana accounts, but the `solana_accountChanged_notifications` session property is not set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {},
        },
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted solana scopes but no accounts and the `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a solana accountChanged event when there are permitted solana accounts and the `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['someaddress'],
          },
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
    });
  });

  describe('handleSolanaAccountChangedFromScopeChanges', () => {
    it('emits nothing if the current and previous permissions both did not have `solana_accountChanged_notifications` session property set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:456`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(
        currentValue,
        previousValue,
      );

      expect(sendNotificationSpy).not.toHaveBeenCalledWith();
    });

    it('emits nothing if currently and previously selected solana accounts did not change', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true,
        },
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true,
        },
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(
        currentValue,
        previousValue,
      );

      expect(sendNotificationSpy).not.toHaveBeenCalledWith();
    });

    it('emits the currently selected solana account if the currently selected solana accounts did change', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:456`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true,
        },
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [`${SolScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true,
        },
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(
        currentValue,
        previousValue,
      );

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['456'],
          },
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
    });
  });

  describe('handleSolanaAccountChangedFromSelectedAccountChanges', () => {
    it('emits nothing if the selected account is not a solana account', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: EthAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account did not change from the last seen solana account', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });
      bridge.lastSelectedSolanaAccountAddress = 'someaddress';

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there is no CAIP-25 permission', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue();

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the `solana_accountChanged_notifications` session property is not set', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {},
        },
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account does not match a permitted solana account', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'differentaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a solana accountChanged event for the selected account if it does match a permitted solana account', () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [`${SolScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['someaddress'],
          },
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
    });
  });

  describe('getDeprecatedNetworkVersion', () => {
    it('returns cached network version when available', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';

      bridge.deprecatedNetworkVersions[networkClientId] = 1;

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      // the constructor calls this once, and we don't expect it to be called again
      expect(mockSendAsync).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });

    it('returns cached null value when network version is cached as null', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';

      bridge.deprecatedNetworkVersions[networkClientId] = null;

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      // the constructor calls this once, and we don't expect it to be called again
      expect(mockSendAsync).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('fetches and caches network version when not already cached', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';

      mockSendAsync.mockImplementation((request, callback) => {
        expect(request).toEqual({ method: 'net_version' });
        callback(null, 100);
      });

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      expect(result).toBe(100);
      expect(bridge.deprecatedNetworkVersions[networkClientId]).toBe(100);

      // the constructor calls this once, and we expect it to be called again
      expect(mockSendAsync).toHaveBeenCalledTimes(2);
      expect(mockSendAsync).toHaveBeenCalledWith(
        { method: 'net_version' },
        expect.any(Function),
      );
    });

    it('handles network errors by caching and returning null', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';
      const networkError = new Error('Network request failed');

      mockSendAsync.mockImplementation((request, callback) => {
        expect(request).toEqual({ method: 'net_version' });
        callback(networkError);
      });

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      expect(result).toBeNull();
      expect(bridge.deprecatedNetworkVersions[networkClientId]).toBeNull();
    });

    it('timeouts out if the network request takes too long by caching and returning null', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';

      mockSendAsync.mockImplementation((request, _callback) => {
        expect(request).toEqual({ method: 'net_version' });
        // purposely never call the callback
      });

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      expect(result).toBeNull();
      expect(bridge.deprecatedNetworkVersions[networkClientId]).toBeNull();
    }, 10000);

    it('caches a successful response even if the timeout has already been reached', async () => {
      const url = 'https://www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const networkClientId = 'test-network-id';

      const mockSendAsyncDeferredPromise = createDeferredPromise();

      mockSendAsync.mockImplementation((request, callback) => {
        expect(request).toEqual({ method: 'net_version' });
        // return result after the timeout
        setTimeout(() => {
          callback(null, 100);
          mockSendAsyncDeferredPromise.resolve();
        }, 5500);
      });

      const result = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });

      expect(result).toBeNull();
      expect(bridge.deprecatedNetworkVersions[networkClientId]).toBeNull();

      // Test that subsequent calls return cached value
      await mockSendAsyncDeferredPromise.promise;
      expect(bridge.deprecatedNetworkVersions[networkClientId]).toBe(100);
      const secondResult = await bridge.getDeprecatedNetworkVersion({
        networkClient: { provider: {} },
        networkClientId,
      });
      expect(secondResult).toBe(100);
      // the constructor calls this once, we call it once, and we don't expect it to be called again
      expect(mockSendAsync).toHaveBeenCalledTimes(2);
    }, 10000);
  });
});
