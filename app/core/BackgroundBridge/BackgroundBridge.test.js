import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { createEip1193MethodMiddleware } from '../RPCMethods/createEip1193MethodMiddleware';
import createEthAccountsMethodMiddleware from '../RPCMethods/createEthAccountsMethodMiddleware';
import { getPermittedAccounts } from '../Permissions';
import { getCaip25PermissionFromLegacyPermissions } from '../../util/permissions';
import AppConstants from '../../core/AppConstants';
import { PermissionController } from '@metamask/permission-controller';
import { Caip25CaveatType } from '@metamask/chain-agnostic-permission';
import { EthAccountType, SolAccountType, SolScope } from '@metamask/keyring-api';
jest.mock('../../util/permissions', () => ({
  getCaip25PermissionFromLegacyPermissions: jest.fn(),
}));

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

jest.mock('../RPCMethods/createEthAccountsMethodMiddleware');

createEthAccountsMethodMiddleware;

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
  AccountsController.listMultichainAccounts.mockReturnValue([
    {
      address: '123',
      metadata: {
        lastSelected: 1
      }
    },
    {
      address: '456',
      metadata: {
        lastSelected: 2
      }
    }
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
    emit: jest.fn()
  };

  return bridge;
}

describe('BackgroundBridge', () => {
  const { KeyringController, PermissionController } = Engine.context;

  beforeEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('creates Eip1193MethodMiddleware with expected hooks', async () => {
      const url = 'https:www.mock.io';
      const origin = new URL(url).hostname;
      const bridge = setupBackgroundBridge(url);
      const eip1193MethodMiddlewareHooks =
        createEip1193MethodMiddleware.mock.calls[0][0];

      // Assert getAccounts
      eip1193MethodMiddlewareHooks.getAccounts();
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.channelId);

      // Assert getCaip25PermissionFromLegacyPermissionsForOrigin
      const requestedPermissions = { somePermission: true };
      eip1193MethodMiddlewareHooks.getCaip25PermissionFromLegacyPermissionsForOrigin(
        requestedPermissions,
      );
      expect(getCaip25PermissionFromLegacyPermissions).toHaveBeenCalledWith(
        origin,
        requestedPermissions,
      );

      // Assert getPermissionsForOrigin
      eip1193MethodMiddlewareHooks.getPermissionsForOrigin();
      expect(PermissionController.getPermissions).toHaveBeenCalledWith(origin);

      // Assert requestPermissionsForOrigin
      eip1193MethodMiddlewareHooks.requestPermissionsForOrigin(
        requestedPermissions,
      );
      expect(PermissionController.requestPermissions).toHaveBeenCalledWith(
        { origin },
        requestedPermissions,
        { metadata: { isEip1193Request: true } },
      );

      // Assert revokePermissionsForOrigin
      const permissionKeys = ['a', 'b'];
      eip1193MethodMiddlewareHooks.revokePermissionsForOrigin(permissionKeys);
      expect(PermissionController.revokePermissions).toHaveBeenCalledWith({
        [origin]: permissionKeys,
      });

      // Assert updateCaveat
      const caveatType = 'testCaveat';
      const caveatValue = { someValue: true };
      eip1193MethodMiddlewareHooks.updateCaveat(caveatType, caveatValue);
      expect(PermissionController.updateCaveat).toHaveBeenCalledWith(
        origin,
        caveatType,
        caveatValue,
      );

      // Assert getUnlockPromise
      // when already unlocked
      KeyringController.isUnlocked.mockReturnValueOnce(true);
      const unlockPromise1 = eip1193MethodMiddlewareHooks.getUnlockPromise();
      await expect(unlockPromise1).resolves.toBeUndefined();
      expect(KeyringController.isUnlocked).toHaveBeenCalled();

      // when needs to be unlocked
      KeyringController.isUnlocked.mockReturnValueOnce(false);
      eip1193MethodMiddlewareHooks.getUnlockPromise();
      expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('creates EthAccountsMethodMiddleware with expected hooks', async () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const ethAccountsMethodMiddlewareHooks =
        createEthAccountsMethodMiddleware.mock.calls[0][0];

      // Assert getAccounts
      ethAccountsMethodMiddlewareHooks.getAccounts();
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.channelId);
    });

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
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationEip1193');
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

  describe('notifySolanaAccountChangedForCurrentAccount', () => {
    it('emits nothing if there is no CAIP-25 permission' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();

    });

    it('emits nothing if there are no permitted solana scopes and `solana_accountChanged_notifications` session property is set' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            'eip155:1': {
              accounts: []
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted solana accounts, but the `solana_accountChanged_notifications` session property is not set' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {}
        }
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted solana scopes but no accounts and the `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a solana accountChanged event when there are permitted solana accounts and the `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: [
            'someaddress',
            ],
          },
          scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
    });
  });

  describe('handleSolanaAccountChangedFromScopeChanges', () => {
    it('emits nothing if the current and previous permissions both did not have `solana_accountChanged_notifications` session property set', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:456`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {}
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:123`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {}
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(currentValue, previousValue);

      expect(sendNotificationSpy).not.toHaveBeenCalledWith();
    });

    it('emits nothing if currently and previously selected solana accounts did not change', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:123`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true
        }
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:123`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true
        }
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(currentValue, previousValue);

      expect(sendNotificationSpy).not.toHaveBeenCalledWith();
    });

    it('emits the currently selected solana account if the currently selected solana accounts did change', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:456`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true
        }
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [SolScope.Mainnet]: {
            accounts: [
              `${SolScope.Mainnet}:123`
            ]
          }
        },
        isMultichainOrigin: true,
        sessionProperties: {
          solana_accountChanged_notifications: true
        }
      };

      bridge.handleSolanaAccountChangedFromScopeChanges(currentValue, previousValue);

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
          params: {
            notification: {
              method: 'metamask_accountsChanged',
              params: [
                '456',
              ],
            },
            scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
      });
    });
  });

  describe('handleSolanaAccountChangedFromSelectedAccountChanges', () => {
    it('emits nothing if the selected account is not a solana account', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: EthAccountType.Eoa,
        address: 'someaddress'
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account did not change from the last seen solana account', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });
      bridge.lastSelectedSolanaAccountAddress = 'someaddress';

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress'
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there is no CAIP-25 permission' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue();

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress'
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the `solana_accountChanged_notifications` session property is not set' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {}
        }
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress'
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account does not match a permitted solana account' , () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'differentaddress'
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a solana accountChanged event for the selected account if it does match a permitted solana account', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(bridge, 'sendNotificationMultichain');
      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:someaddress`
              ]
            }
          },
          isMultichainOrigin: true,
          sessionProperties: {
            solana_accountChanged_notifications: true
          }
        }
      });

      bridge.handleSolanaAccountChangedFromSelectedAccountChanges({
        type: SolAccountType.DataAccount,
        address: 'someaddress'
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
          params: {
            notification: {
              method: 'metamask_accountsChanged',
              params: [
                'someaddress',
              ],
            },
            scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
      });
    });
  });
});
