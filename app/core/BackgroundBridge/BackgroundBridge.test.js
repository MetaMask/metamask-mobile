import getDefaultBridgeParams from '../SDKConnect/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import AppConstants from '../../core/AppConstants';
import {
  Caip25CaveatType,
  KnownSessionProperties,
} from '@metamask/chain-agnostic-permission';
import {
  EthAccountType,
  SolAccountType,
  SolScope,
  TrxAccountType,
  TrxScope,
} from '@metamask/keyring-api';

jest.mock('../Engine', () => ({
  init: jest.fn(),
  acceptPrivacyPolicy: jest.fn(),
  rejectPrivacyPolicy: jest.fn(),
  controllerMessenger: {
    call: jest.fn().mockImplementation((method) => {
      if (method === 'SelectedNetworkController:getNetworkClientIdForDomain') {
        return 'mainnet';
      }
      if (method === 'NetworkController:getNetworkClientById') {
        return {
          configuration: {
            chainId: '0x1',
            ticker: 'ETH',
          },
        };
      }
      if (
        method === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
      ) {
        return [];
      }
      return undefined;
    }),
    subscribe: jest.fn(),
    tryUnsubscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  datamodel: {
    state: {
      PreferencesController: {
        selectedAddress: '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571',
      },
      AccountTreeController: {
        selectedAccountGroup:
          'eip155:1:0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571',
      },
    },
  },
  context: {
    AccountsController: {
      listAccounts: jest.fn(),
      listMultichainAccounts: jest.fn(),
      getSelectedAccount: jest.fn(),
      getAccountByAddress: jest.fn(),
    },
    PermissionController: {
      createPermissionMiddleware: jest.fn(),
      requestPermissions: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
      revokePermission: jest.fn(),
      revokePermissions: jest.fn(),
      getPermissions: jest.fn(),
      hasPermissions: jest.fn(),
      hasPermission: jest.fn(),
      executeRestrictedMethod: jest.fn(),
      state: {
        subjects: {},
      },
    },
    PreferencesController: {
      state: {},
    },
    SelectedNetworkController: {
      getProviderAndBlockTracker: jest.fn(),
    },
    KeyringController: {
      setLocked: jest.fn(),
      createNewVaultAndRestore: jest.fn(),
      createNewVaultAndKeychain: jest.fn(),
      isUnlocked: jest.fn().mockReturnValue(true),
      state: {
        vault: 'vault',
      },
    },
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(),
      getNetworkClientById: jest.fn(() => ({
        configuration: {
          chainId: '0x1',
          ticker: 'ETH',
        },
      })),
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionController: {
      addTransaction: jest.fn(),
      addTransactionBatch: jest.fn(),
      isAtomicBatchSupported: jest.fn(),
    },
    ApprovalController: {
      addAndShowApprovalRequest: jest.fn(),
    },
  },
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

  const mockAddress = '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';

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

const mockAccountTreeController = (accounts) => {
  Engine.controllerMessenger.call = jest
    .fn()
    .mockImplementation((method, params) => {
      if (method === 'SelectedNetworkController:getNetworkClientIdForDomain') {
        return 'mainnet';
      }

      if (method === 'NetworkController:getNetworkClientById') {
        return {
          configuration: {
            chainId: '0x1',
            ticker: 'ETH',
          },
        };
      }

      if (
        method === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
      ) {
        // Filter accounts by type if params.type is specified
        if (params?.type) {
          return accounts.filter((account) => account.type === params.type);
        }
        return accounts;
      }

      // Default return for other methods
      return undefined;
    });
};

describe('BackgroundBridge', () => {
  const { KeyringController, PermissionController } = Engine.context;

  beforeEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('requests getProviderNetworkState from origin getter when network state is updated', async () => {
      const mockNetworkState = {
        chainId: '0x2',
        networkVersion: '2',
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
      const url = 'https:www.mock.io';
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

  describe('onMessage', () => {
    let bridge;
    let mockPort;
    beforeEach(() => {
      bridge = setupBackgroundBridge('https://portfolio.metamask.io/');
      mockPort = bridge.port;
      mockPort.emit = jest.fn();
      console.warn = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('WalletConnect or SDK connection', () => {
      it('emits message to port regardless of message origin', () => {
        const message = {
          origin: 'https://non-matching-url.com',
          name: 'test-message',
          data: { method: 'eth_requestAccounts' },
        };

        bridge = setupBackgroundBridge('https://portfolio.metamask.io/', true);
        mockPort = bridge.port;
        mockPort.emit = jest.fn();
        console.warn = jest.fn();
        bridge.onMessage(message);

        expect(mockPort.emit).toHaveBeenCalledWith('message', {
          name: message.name,
          data: message.data,
        });
        expect(console.warn).not.toHaveBeenCalled();
      });
    });

    describe('BrowserTab connection', () => {
      it('emits message to port when origin matches bridge origin', () => {
        const message = {
          origin: 'https://portfolio.metamask.io',
          name: 'test-message',
          data: { method: 'eth_requestAccounts' },
        };

        bridge = setupBackgroundBridge('https://portfolio.metamask.io/');
        mockPort = bridge.port;
        mockPort.emit = jest.fn();
        console.warn = jest.fn();
        bridge.onMessage(message);

        expect(mockPort.emit).toHaveBeenCalledWith('message', {
          name: message.name,
          data: message.data,
        });
        expect(console.warn).not.toHaveBeenCalled();
      });

      it('blocks message and logs warning when origin does not match', () => {
        const message = {
          origin: 'https://malicious.com',
          name: 'test-message',
          data: { method: 'eth_requestAccounts' },
        };

        bridge = setupBackgroundBridge('https://portfolio.metamask.io/');
        mockPort = bridge.port;
        mockPort.emit = jest.fn();
        console.warn = jest.fn();
        bridge.onMessage(message);

        expect(mockPort.emit).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
      });

      it('handles different subdomains as different origins', () => {
        const message = {
          origin: 'https://dapp.metamask.io',
          name: 'test-message',
          data: { method: 'eth_requestAccounts' },
        };

        bridge = setupBackgroundBridge('https://portfolio.metamask.io/');
        mockPort = bridge.port;
        mockPort.emit = jest.fn();
        console.warn = jest.fn();
        bridge.onMessage(message);

        expect(mockPort.emit).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
      });
    });
  });

  describe('notifySolanaAccountChangedForCurrentAccount', () => {
    it('emits nothing if there is no CAIP-25 permission', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are no permitted solana scopes and `solana_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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

    it('prioritizes solana account from selected account group over scope accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const selectedGroupSolanaAccount = {
        type: SolAccountType.DataAccount,
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      };
      mockAccountTreeController([selectedGroupSolanaAccount]);

      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [SolScope.Mainnet]: {
              accounts: [
                `${SolScope.Mainnet}:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`,
              ],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            [KnownSessionProperties.SolanaAccountChangedNotifications]: true,
          },
        },
      });

      bridge.notifySolanaAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'],
          },
          scope: SolScope.Mainnet,
        },
      });
    });
  });

  describe('handleSolanaAccountChangedFromScopeChanges', () => {
    it('emits nothing if the current and previous permissions both did not have `solana_accountChanged_notifications` session property set', () => {
      const url = 'https:www.mock.io';
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

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if currently and previously selected solana accounts did not change', () => {
      const url = 'https:www.mock.io';
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

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits the currently selected solana account if the currently selected solana accounts did change', () => {
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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
      const url = 'https:www.mock.io';
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

  describe('handleSolanaAccountChangedFromSelectedAccountGroupChanges', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('emits nothing when AccountTreeController returns no accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleSolanaAccountSpy = jest.spyOn(
        bridge,
        'handleSolanaAccountChangedFromSelectedAccountChanges',
      );

      mockAccountTreeController([]);

      bridge.handleSolanaAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: SolAccountType.DataAccount },
      );
      expect(handleSolanaAccountSpy).not.toHaveBeenCalled();
    });

    it('emits nothing when AccountTreeController returns only non-Solana accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleSolanaAccountSpy = jest.spyOn(
        bridge,
        'handleSolanaAccountChangedFromSelectedAccountChanges',
      );

      const mockAccounts = [
        { type: EthAccountType.Eoa, address: 'eth-address-1' },
        { type: EthAccountType.Erc4337, address: 'eth-address-2' },
      ];

      mockAccountTreeController(mockAccounts);

      bridge.handleSolanaAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: SolAccountType.DataAccount },
      );
      expect(handleSolanaAccountSpy).not.toHaveBeenCalled();
    });

    it('calls handleSolanaAccountChangedFromSelectedAccountChanges when AccountTreeController returns a Solana account', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleSolanaAccountSpy = jest.spyOn(
        bridge,
        'handleSolanaAccountChangedFromSelectedAccountChanges',
      );

      const mockSolanaAccount = {
        type: SolAccountType.DataAccount,
        address: 'solana-address-1',
      };
      const mockAccounts = [mockSolanaAccount];

      mockAccountTreeController(mockAccounts);

      bridge.handleSolanaAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: SolAccountType.DataAccount },
      );
      expect(handleSolanaAccountSpy).toHaveBeenCalledWith(mockSolanaAccount);
    });

    it('processes only the first Solana account when multiple valid Solana accounts exist', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleSolanaAccountSpy = jest.spyOn(
        bridge,
        'handleSolanaAccountChangedFromSelectedAccountChanges',
      );

      const mockSolanaAccount1 = {
        type: SolAccountType.DataAccount,
        address: 'first-solana-address',
      };
      const mockSolanaAccount2 = {
        type: SolAccountType.DataAccount,
        address: 'second-solana-address',
      };
      const mockSolanaAccount3 = {
        type: SolAccountType.DataAccount,
        address: 'third-solana-address',
      };

      mockAccountTreeController([
        mockSolanaAccount1,
        mockSolanaAccount2,
        mockSolanaAccount3,
      ]);

      bridge.handleSolanaAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: SolAccountType.DataAccount },
      );
      expect(handleSolanaAccountSpy).toHaveBeenCalledWith(mockSolanaAccount1);
      expect(handleSolanaAccountSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyTronAccountChangedForCurrentAccount', () => {
    it('emits nothing if there is no CAIP-25 permission', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are no permitted tron scopes and `tron_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
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
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted tron accounts, but the `tron_accountChanged_notifications` session property is not set', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {},
        },
      });

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there are permitted tron scopes but no accounts and the `tron_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a tron accountChanged event when there are permitted tron accounts and the `tron_accountChanged_notifications` session property is set', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['someaddress'],
          },
          scope: TrxScope.Mainnet,
        },
      });
    });

    it('prioritizes tron account from selected account group over scope accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const selectedGroupTronAccount = {
        type: TrxAccountType.Eoa,
        address: 'TRXAddressExample123456789',
      };
      mockAccountTreeController([selectedGroupTronAccount]);

      PermissionController.getCaveat.mockReturnValue({
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes: {
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:TDifferentAddress987654321`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            [KnownSessionProperties.TronAccountChangedNotifications]: true,
          },
        },
      });

      bridge.notifyTronAccountChangedForCurrentAccount();

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['TRXAddressExample123456789'],
          },
          scope: TrxScope.Mainnet,
        },
      });
    });
  });

  describe('handleTronAccountChangedFromScopeChanges', () => {
    it('emits nothing if the current and previous permissions both did not have `tron_accountChanged_notifications` session property set', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:456`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      bridge.handleTronAccountChangedFromScopeChanges(
        currentValue,
        previousValue,
      );

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if currently and previously selected tron accounts did not change', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          tron_accountChanged_notifications: true,
        },
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          tron_accountChanged_notifications: true,
        },
      };

      bridge.handleTronAccountChangedFromScopeChanges(
        currentValue,
        previousValue,
      );

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits the currently selected tron account if the currently selected tron accounts did change', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );

      const currentValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:456`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          tron_accountChanged_notifications: true,
        },
      };

      const previousValue = {
        requiredScopes: {},
        optionalScopes: {
          [TrxScope.Mainnet]: {
            accounts: [`${TrxScope.Mainnet}:123`],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {
          tron_accountChanged_notifications: true,
        },
      };

      bridge.handleTronAccountChangedFromScopeChanges(
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
          scope: TrxScope.Mainnet,
        },
      });
    });
  });

  describe('handleTronAccountChangedFromSelectedAccountChanges', () => {
    it('emits nothing if the selected account is not a tron account', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: EthAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account did not change from the last seen tron account', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });
      bridge.lastSelectedTronAccountAddress = 'someaddress';

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: TrxAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if there is no CAIP-25 permission', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const sendNotificationSpy = jest.spyOn(
        bridge,
        'sendNotificationMultichain',
      );
      PermissionController.getCaveat.mockReturnValue();

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: TrxAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the `tron_accountChanged_notifications` session property is not set', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {},
        },
      });

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: TrxAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits nothing if the selected account does not match a permitted tron account', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: TrxAccountType.Eoa,
        address: 'differentaddress',
      });

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('emits a tron accountChanged event for the selected account if it does match a permitted tron account', () => {
      const url = 'https:www.mock.io';
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
            [TrxScope.Mainnet]: {
              accounts: [`${TrxScope.Mainnet}:someaddress`],
            },
          },
          isMultichainOrigin: true,
          sessionProperties: {
            tron_accountChanged_notifications: true,
          },
        },
      });

      bridge.handleTronAccountChangedFromSelectedAccountChanges({
        type: TrxAccountType.Eoa,
        address: 'someaddress',
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        method: 'wallet_notify',
        params: {
          notification: {
            method: 'metamask_accountsChanged',
            params: ['someaddress'],
          },
          scope: TrxScope.Mainnet,
        },
      });
    });
  });

  describe('handleTronAccountChangedFromSelectedAccountGroupChanges', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('emits nothing when AccountTreeController returns no accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleTronAccountSpy = jest.spyOn(
        bridge,
        'handleTronAccountChangedFromSelectedAccountChanges',
      );

      mockAccountTreeController([]);

      bridge.handleTronAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: TrxAccountType.Eoa },
      );
      expect(handleTronAccountSpy).not.toHaveBeenCalled();
    });

    it('emits nothing when AccountTreeController returns only non-Tron accounts', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleTronAccountSpy = jest.spyOn(
        bridge,
        'handleTronAccountChangedFromSelectedAccountChanges',
      );

      const mockAccounts = [
        { type: EthAccountType.Eoa, address: 'eth-address-1' },
        { type: EthAccountType.Erc4337, address: 'eth-address-2' },
      ];

      mockAccountTreeController(mockAccounts);

      bridge.handleTronAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: TrxAccountType.Eoa },
      );
      expect(handleTronAccountSpy).not.toHaveBeenCalled();
    });

    it('calls handleTronAccountChangedFromSelectedAccountChanges when AccountTreeController returns a Tron account', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleTronAccountSpy = jest.spyOn(
        bridge,
        'handleTronAccountChangedFromSelectedAccountChanges',
      );

      const mockTronAccount = {
        type: TrxAccountType.Eoa,
        address: 'tron-address-1',
      };
      const mockAccounts = [mockTronAccount];

      mockAccountTreeController(mockAccounts);

      bridge.handleTronAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: TrxAccountType.Eoa },
      );
      expect(handleTronAccountSpy).toHaveBeenCalledWith(mockTronAccount);
    });

    it('processes only the first Tron account when multiple valid Tron accounts exist', () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);
      const handleTronAccountSpy = jest.spyOn(
        bridge,
        'handleTronAccountChangedFromSelectedAccountChanges',
      );

      const mockTronAccount1 = {
        type: TrxAccountType.Eoa,
        address: 'first-tron-address',
      };
      const mockTronAccount2 = {
        type: TrxAccountType.Eoa,
        address: 'second-tron-address',
      };
      const mockTronAccount3 = {
        type: TrxAccountType.Eoa,
        address: 'third-tron-address',
      };

      mockAccountTreeController([
        mockTronAccount1,
        mockTronAccount2,
        mockTronAccount3,
      ]);

      bridge.handleTronAccountChangedFromSelectedAccountGroupChanges();

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        { type: TrxAccountType.Eoa },
      );
      expect(handleTronAccountSpy).toHaveBeenCalledWith(mockTronAccount1);
      expect(handleTronAccountSpy).toHaveBeenCalledTimes(1);
    });
  });
});
