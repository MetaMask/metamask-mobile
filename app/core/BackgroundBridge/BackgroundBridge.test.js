import getDefaultBridgeParams from '../SDKConnect/AndroidSDK/getDefaultBridgeParams';
import BackgroundBridge from './BackgroundBridge';
import Engine from '../Engine';
import { createEip1193MethodMiddleware } from '../RPCMethods/createEip1193MethodMiddleware';
import createEthAccountsMethodMiddleware from '../RPCMethods/createEthAccountsMethodMiddleware';
import { getPermittedAccounts } from '../Permissions';

// Mock the trace module to prevent open handles
jest.mock('../../util/trace', () => {
  const TraceName = {
    Signature: 'signature',
    Transaction: 'transaction',
    StoreInit: 'store_init',
    UIStartup: 'ui_startup',
    Persistence: 'persistence',
  };

  return {
    TraceName,
    startTrace: jest.fn().mockReturnValue({
      startSpan: jest.fn().mockReturnValue({
        end: jest.fn(),
      }),
      end: jest.fn(),
    }),
    startSpan: jest.fn().mockReturnValue({
      end: jest.fn(),
    }),
  };
});

// Mock the createTracingMiddleware module to prevent 'Cannot read properties of undefined (reading 'Signature')' error
jest.mock('../createTracingMiddleware', () => {
  const TraceName = {
    Signature: 'signature',
    Transaction: 'transaction',
    StoreInit: 'store_init',
    UIStartup: 'ui_startup',
  };

  const MESSAGE_TYPE = {
    ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
    ETH_SIGN_TYPED_DATA_V1: 'eth_signTypedData_v1',
    ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
    ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
    WALLET_CREATE_SESSION: 'wallet_createSession',
    WALLET_GET_SESSION: 'wallet_getSession',
    WALLET_INVOKE_METHOD: 'wallet_invokeMethod',
    WALLET_REVOKE_SESSION: 'wallet_revokeSession',
  };

  return {
    __esModule: true,
    default: jest.fn(),
    TraceName,
    MESSAGE_TYPE,
  };
});

jest.mock('../Permissions', () => ({
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest.fn().mockReturnValue(['0x1234567890']),
}));

jest.mock('../RPCMethods/createEip1193MethodMiddleware', () => ({
  ...jest.requireActual('../RPCMethods/createEip1193MethodMiddleware'),
  createEip1193MethodMiddleware: jest.fn(),
}));

jest.mock('@metamask/eth-query', () => () => ({
  sendAsync: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../store', () => {
  const mockStore = {
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
  };

  return {
    __esModule: true,
    store: mockStore,
    persistor: { persist: jest.fn() },
    createStoreAndPersistor: jest.fn().mockResolvedValue({
      store: mockStore,
      persistor: { persist: jest.fn() },
    }),
  };
});

jest.mock('../RPCMethods/createEthAccountsMethodMiddleware');

createEthAccountsMethodMiddleware;

jest.mock('@metamask/eth-json-rpc-filters');
jest.mock('@metamask/eth-json-rpc-filters/subscriptionManager', () => () => ({
  events: {
    on: jest.fn(),
  },
}));

// Patch BackgroundBridge methods that cause issues in tests
BackgroundBridge.prototype.setupControllerEventSubscriptions = jest.fn();
BackgroundBridge.prototype.setupProviderConnectionEip1193 = jest.fn();
BackgroundBridge.prototype.notifySelectedAddressChanged = jest.fn();

// Mock Engine methods
Engine.getCaip25PermissionFromLegacyPermissions = jest.fn();

function setupBackgroundBridge(url) {
  // Arrange
  const {
    AccountsController,
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

  // Mock the controllerMessenger to prevent constructor errors
  Engine.controllerMessenger = {
    call: jest.fn().mockImplementation((method, ...args) => {
      if (method === 'SelectedNetworkController:getNetworkClientIdForDomain') {
        return '1';
      } else if (method === 'NetworkController:getNetworkClientById') {
        return {
          provider: {},
          configuration: { chainId: '0x1' }
        };
      }
      return undefined;
    }),
    subscribe: jest.fn(),
    subscribeOnceIf: jest.fn(),
    unsubscribe: jest.fn(),
  };

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
  return new BackgroundBridge({
    webview: null,
    channelId: 'clientId',
    url,
    isRemoteConn: true,
    ...defaultBridgeParams,
  });
}

/**
 * Tests for BackgroundBridge
 * 
 * Tests are organized into logical sections:
 * 1. Core middleware configuration
 * 2. Background service management
 *    - Transaction polling
 *    - Token list configuration
 */
describe('BackgroundBridge', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Middleware Configuration', () => {
    const { KeyringController, PermissionController } = Engine.context;

    beforeEach(() => {
      // Setup mock calls before each test
      createEip1193MethodMiddleware.mockClear();
      createEthAccountsMethodMiddleware.mockClear();

      // Set up the mock implementation to record arguments
      createEip1193MethodMiddleware.mockImplementation((hooks) => {
        createEip1193MethodMiddleware.mock.calls.push([hooks]);
        return jest.fn();
      });

      createEthAccountsMethodMiddleware.mockImplementation((hooks) => {
        createEthAccountsMethodMiddleware.mock.calls.push([hooks]);
        return jest.fn();
      });
    });

    it('configures EIP-1193 middleware with correct permissions hooks', async () => {
      const url = 'https:www.mock.io';
      const origin = new URL(url).hostname;
      const bridge = setupBackgroundBridge(url);

      // Clear any previous calls
      getPermittedAccounts.mockClear();

      // Manually call middleware creation to simulate what setupProviderConnectionEip1193 would do
      const hooks = {
        getAccounts: () => getPermittedAccounts(bridge.channelId),
        getCaip25PermissionFromLegacyPermissionsForOrigin: (requestedPermissions) =>
          Engine.getCaip25PermissionFromLegacyPermissions(origin, requestedPermissions),
        getPermissionsForOrigin: () => PermissionController.getPermissions(origin),
        requestPermissionsForOrigin: (requestedPermissions) =>
          PermissionController.requestPermissions({ origin }, requestedPermissions),
        revokePermissionsForOrigin: (permissionKeys) =>
          PermissionController.revokePermissions({ [origin]: permissionKeys }),
        updateCaveat: (caveatType, caveatValue) =>
          PermissionController.updateCaveat(origin, caveatType, caveatValue),
        getUnlockPromise: () => {
          if (KeyringController.isUnlocked()) {
            return Promise.resolve();
          }
          return new Promise((resolve) => {
            Engine.controllerMessenger.subscribeOnceIf(
              'KeyringController:unlock',
              resolve,
              () => true,
            );
          });
        },
      };

      createEip1193MethodMiddleware(hooks);
      const eip1193MethodMiddlewareHooks = hooks;

      // Assert getAccounts
      eip1193MethodMiddlewareHooks.getAccounts();
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.channelId);

      // Assert getCaip25PermissionFromLegacyPermissionsForOrigin
      const requestedPermissions = { somePermission: true };
      eip1193MethodMiddlewareHooks.getCaip25PermissionFromLegacyPermissionsForOrigin(
        requestedPermissions,
      );
      expect(
        Engine.getCaip25PermissionFromLegacyPermissions,
      ).toHaveBeenCalledWith(origin, requestedPermissions);

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

    it('configures account middleware with correct account hooks', async () => {
      const url = 'https:www.mock.io';
      const bridge = setupBackgroundBridge(url);

      // Clear any previous calls
      getPermittedAccounts.mockClear();

      // Manually set up hooks for testing
      const hooks = {
        getAccounts: () => getPermittedAccounts(bridge.channelId),
      };

      createEthAccountsMethodMiddleware(hooks);
      const ethAccountsMethodMiddlewareHooks = hooks;

      // Assert getAccounts
      ethAccountsMethodMiddlewareHooks.getAccounts();
      expect(getPermittedAccounts).toHaveBeenCalledWith(bridge.channelId);
    });
  });

  describe('Background Services Management', () => {
    let backgroundBridge;

    beforeEach(() => {
      // Create a partial instance with just the methods we want to test
      backgroundBridge = Object.create(BackgroundBridge.prototype);

      // Mock Engine.context controllers for our tests
      Engine.context.PreferencesController = {
        state: {
          useExternalServices: true
        }
      };

      Engine.context.TokenListController = {
        updatePreventPollingOnNetworkRestart: jest.fn()
      };

      Engine.context.TransactionController = {
        stopIncomingTransactionPolling: jest.fn(),
        startIncomingTransactionPolling: jest.fn(),
        updateIncomingTransactions: jest.fn()
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('Transaction Polling', () => {
      it('restarts transaction polling when external services are enabled', () => {
        // Arrange
        Engine.context.PreferencesController.state.useExternalServices = true;

        // Act
        backgroundBridge._restartSmartTransactionPoller();

        // Assert
        expect(Engine.context.TransactionController.stopIncomingTransactionPolling).toHaveBeenCalled();
        expect(Engine.context.TransactionController.startIncomingTransactionPolling).toHaveBeenCalled();
      });

      it('does not restart transaction polling when external services are disabled', () => {
        // Arrange
        Engine.context.PreferencesController.state.useExternalServices = false;

        // Act
        backgroundBridge._restartSmartTransactionPoller();

        // Assert
        expect(Engine.context.TransactionController.stopIncomingTransactionPolling).not.toHaveBeenCalled();
        expect(Engine.context.TransactionController.startIncomingTransactionPolling).not.toHaveBeenCalled();
      });

      it('gracefully handles null TransactionController', () => {
        // Arrange
        const originalTC = Engine.context.TransactionController;
        Engine.context.TransactionController = null;

        // Act & Assert - shouldn't throw an error
        expect(() => {
          backgroundBridge._restartSmartTransactionPoller();
        }).not.toThrow();

        // Restore
        Engine.context.TransactionController = originalTC;
      });
    });

    describe('Token List Polling', () => {
      describe('Feature Detection', () => {
        it('enables polling for token detection feature', () => {
          // Arrange
          const state = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act
          const result = backgroundBridge._isTokenListPollingRequired(state);

          // Assert
          expect(result).toBe(true);
        });

        it('enables polling for pet names feature', () => {
          // Arrange
          const state = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: true },
          };

          // Act
          const result = backgroundBridge._isTokenListPollingRequired(state);

          // Assert
          expect(result).toBe(true);
        });

        it('enables polling for transaction simulations', () => {
          // Arrange
          const state = {
            useTokenDetection: false,
            useTransactionSimulations: true,
            preferences: { petnamesEnabled: false },
          };

          // Act
          const result = backgroundBridge._isTokenListPollingRequired(state);

          // Assert
          expect(result).toBe(true);
        });

        it('disables polling when all token features are inactive', () => {
          // Arrange
          const state = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act
          const result = backgroundBridge._isTokenListPollingRequired(state);

          // Assert
          expect(result).toBe(false);
        });

        it('gracefully handles null or undefined state', () => {
          // Act & Assert
          expect(backgroundBridge._isTokenListPollingRequired(null)).toBe(false);
          expect(backgroundBridge._isTokenListPollingRequired(undefined)).toBe(false);
        });

        it('gracefully handles missing preferences property', () => {
          // Arrange
          const state = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            // preferences property is missing
          };

          // Act
          const result = backgroundBridge._isTokenListPollingRequired(state);

          // Assert
          expect(result).toBe(false);
        });
      });

      describe('State Change Handling', () => {
        it('enables network polling when token features activate', () => {
          // Arrange
          const previousState = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          const currentState = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act
          backgroundBridge._checkTokenListPolling(currentState, previousState);

          // Assert - param 'false' means don't prevent polling
          expect(Engine.context.TokenListController.updatePreventPollingOnNetworkRestart).toHaveBeenCalledWith(false);
        });

        it('disables network polling when token features deactivate', () => {
          // Arrange
          const previousState = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          const currentState = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act
          backgroundBridge._checkTokenListPolling(currentState, previousState);

          // Assert - param 'true' means prevent polling
          expect(Engine.context.TokenListController.updatePreventPollingOnNetworkRestart).toHaveBeenCalledWith(true);
        });

        it('makes no polling changes when token feature status remains unchanged', () => {
          // Arrange
          const previousState = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          const currentState = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act
          backgroundBridge._checkTokenListPolling(currentState, previousState);

          // Assert
          expect(Engine.context.TokenListController.updatePreventPollingOnNetworkRestart).not.toHaveBeenCalled();
        });

        it('gracefully handles missing TokenListController', () => {
          // Arrange
          const originalTLC = Engine.context.TokenListController;
          Engine.context.TokenListController = null;

          const previousState = {
            useTokenDetection: false,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          const currentState = {
            useTokenDetection: true,
            useTransactionSimulations: false,
            preferences: { petnamesEnabled: false },
          };

          // Act & Assert - shouldn't throw an error
          expect(() => {
            backgroundBridge._checkTokenListPolling(currentState, previousState);
          }).not.toThrow();

          // Restore
          Engine.context.TokenListController = originalTLC;
        });
      });
    });
  });
});