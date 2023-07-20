import {
  JsonRpcEngine,
  JsonRpcFailure,
  JsonRpcMiddleware,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
} from 'json-rpc-engine';
import type { Transaction } from '@metamask/transaction-controller';
import type { ProviderConfig } from '@metamask/network-controller';
import { ethErrors } from 'eth-json-rpc-errors';
import Engine from '../Engine';
import { store } from '../../store';
import { getPermittedAccounts } from '../Permissions';
import { RPC } from '../../constants/network';
import { getRpcMethodMiddleware } from './RPCMethodMiddleware';
import AppConstants from '../AppConstants';
import { PermissionConstraint } from '@metamask/permission-controller';

jest.mock('../Engine', () => ({
  context: {
    NetworkController: {
      state: {},
    },
    PreferencesController: {
      state: {},
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    SignatureController: {
      newUnsignedMessage: jest.fn(),
      newUnsignedPersonalMessage: jest.fn(),
      newUnsignedTypedMessage: jest.fn(),
    },
    PermissionController: {
      requestPermissions: jest.fn(),
      getPermissions: jest.fn(),
    },
  },
}));
const MockEngine = Engine as Omit<typeof Engine, 'context'> & {
  context: {
    NetworkController: Record<string, any>;
    PreferencesController: Record<string, any>;
    TransactionController: Record<string, any>;
    PermissionController: Record<string, any>;
  };
};

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
const mockStore = store as { getState: jest.Mock };

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest.fn(),
}));
const mockGetPermittedAccounts = getPermittedAccounts as jest.Mock;

/**
 * This is used to build JSON-RPC requests. It is defined here for convenience, so that we don't
 * need to use "as const" each time.
 */
const jsonrpc = '2.0' as const;

/**
 * Assert that the given response was successful.
 *
 * TODO: Replace this with `assertIsJsonRpcSuccess` from `@metamask/utils`
 *
 * @param value - The value to check.
 * @throws If the given value is not a valid {@link JsonRpcSuccess} object.
 */
function assertIsJsonRpcSuccess(
  response: JsonRpcResponse<unknown>,
): asserts response is JsonRpcSuccess<unknown> {
  if ('error' in response) {
    throw new Error(`Response failed with error '${JSON.stringify('error')}'`);
  } else if (!('result' in response)) {
    throw new Error(`Response is missing 'result' property`);
  }
}

/**
 * Return a minimal set of options for `getRpcMethodMiddleware`. These options
 * are complete enough to test at least some method handlers, and they are type-
 * compatible. They don't represent a realistic scenario.
 *
 * @returns A minimal set of options for `getRpcMethodMiddleware`
 */
function getMinimalOptions() {
  return {
    hostname: '',
    getProviderState: jest.fn(),
    navigation: jest.fn(),
    url: { current: '' },
    title: { current: '' },
    icon: { current: undefined },
    // Bookmarks
    isHomepage: jest.fn(),
    // Show autocomplete
    fromHomepage: { current: false },
    toggleUrlModal: jest.fn(),
    // Wizard
    wizardScrollAdjusted: { current: false },
    // For the browser
    tabId: '' as const,
    // For WalletConnect
    isWalletConnect: false,
    // For MM SDK
    isMMSDK: false,
    getApprovedHosts: jest.fn(),
    setApprovedHosts: jest.fn(),
    approveHost: jest.fn(),
    injectHomePageScripts: jest.fn(),
    analytics: {},
  };
}

/**
 * Return a minimal set of options for `getRpcMethodMiddleware` when used in a
 * browser context.
 *
 * See {@link getMinimalOptions} for more details.
 *
 * @returns A minimal set of options for `getRpcMethodMiddleware`
 */
function getMinimalBrowserOptions() {
  return {
    ...getMinimalOptions(),
    tabId: 1,
  };
}

/**
 * Return a minimal set of options for `getRpcMethodMiddleware` when used in a
 * WalletConnect context.
 *
 * See {@link getMinimalOptions} for more details.
 *
 * @returns A minimal set of options for `getRpcMethodMiddleware`
 */
function getMinimalWalletConnectOptions() {
  return {
    ...getMinimalOptions(),
    isWalletConnect: true,
  };
}

/**
 * Return a minimal set of options for `getRpcMethodMiddleware` when used in a
 * MetaMask SDK context.
 *
 * See {@link getMinimalOptions} for more details.
 *
 * @returns A minimal set of options for `getRpcMethodMiddleware`
 */
function getMinimalSDKOptions() {
  return {
    ...getMinimalOptions(),
    isMMSDK: true,
  };
}

/**
 * Process the given request with the provided middleware.
 *
 * @param arguments - Named arguments.
 * @param arguments.middleware - The middleware to call.
 * @param arguments.request - The request to process.
 * @returns The JSON-RPC response.
 */
async function callMiddleware({
  middleware,
  request,
}: {
  middleware: JsonRpcMiddleware<unknown, unknown>;
  request: JsonRpcRequest<unknown>;
}) {
  const engine = new JsonRpcEngine();
  engine.push(middleware);

  return await engine.handle(request);
}

/**
 * Setup any global state relevant for one of these tests.
 *
 * @param options - Options.
 * @param options.activeTab - The current active tab.
 * @param options.addTransactionResult - The result that the `TransactionController.addTransaction`
 * method should return.
 * @param options.permittedAccounts - Permitted accounts, keyed by hostname.
 * @param options.providerConfig - The provider configuration for the current selected network.
 * @param options.selectedAddress - The current selected address.
 */
function setupGlobalState({
  activeTab,
  addTransactionResult,
  permittedAccounts,
  providerConfig,
  selectedAddress,
}: {
  activeTab?: number;
  addTransactionResult?: Promise<string>;
  permittedAccounts?: Record<string, string[]>;
  providerConfig?: ProviderConfig;
  selectedAddress?: string;
}) {
  if (activeTab) {
    mockStore.getState.mockImplementation(() => ({
      browser: {
        activeTab,
      },
    }));
  }
  if (addTransactionResult) {
    MockEngine.context.TransactionController.addTransaction.mockImplementation(
      async () => ({ result: addTransactionResult }),
    );
  }
  if (permittedAccounts) {
    mockGetPermittedAccounts.mockImplementation(
      (hostname) => permittedAccounts[hostname] || [],
    );
  }
  if (providerConfig) {
    MockEngine.context.NetworkController.state.providerConfig = providerConfig;
  }
  if (selectedAddress) {
    MockEngine.context.PreferencesController.state.selectedAddress =
      selectedAddress;
  }
}

const addressMock = '0x0000000000000000000000000000000000000001';
const dataMock =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const dataJsonMock = JSON.stringify({ test: 'data', domain: { chainId: '1' } });
const hostMock = 'example.metamask.io';
const signatureMock = '0x1234567890';

function setupSignature() {
  setupGlobalState({
    activeTab: 1,
    providerConfig: {
      chainId: '1',
      type: RPC,
    },
    selectedAddress: addressMock,
    permittedAccounts: { [hostMock]: [addressMock] },
  });

  const middleware = getRpcMethodMiddleware({
    ...getMinimalOptions(),
    hostname: hostMock,
  });

  return { middleware };
}

describe('getRpcMethodMiddleware', () => {
  it('allows unrecognized methods to pass through', async () => {
    const engine = new JsonRpcEngine();
    const middleware = getRpcMethodMiddleware(getMinimalOptions());
    engine.push(middleware);
    const nextMiddleware = jest
      .fn()
      .mockImplementation((_req, res, _next, end) => {
        res.result = 'success';
        end();
      });
    engine.push(nextMiddleware);

    const response = await engine.handle({
      jsonrpc,
      id: 1,
      method: 'this-is-a-fake-method',
    });

    assertIsJsonRpcSuccess(response);
    expect(response.result).toBe('success');
  });

  const accountMethods = [
    'eth_accounts',
    'eth_coinbase',
    'parity_defaultAccount',
  ];
  for (const method of accountMethods) {
    describe(method, () => {
      describe('browser', () => {
        it('returns permitted accounts for connected site', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalBrowserOptions(),
            hostname: 'example.metamask.io',
          });
          const request = {
            jsonrpc,
            id: 1,
            method,
          };

          const response = await callMiddleware({ middleware, request });

          expect((response as JsonRpcFailure).error).toBeUndefined();
          expect((response as JsonRpcSuccess<string>).result).toStrictEqual([
            mockAddress1,
          ]);
        });

        it('returns an empty array for an unconnected site', async () => {
          const mockAddress = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: {},
            selectedAddress: mockAddress,
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalBrowserOptions(),
            hostname: 'example.metamask.io',
          });
          const request = {
            jsonrpc,
            id: 1,
            method,
          };

          const response = await callMiddleware({ middleware, request });

          expect((response as JsonRpcFailure).error).toBeUndefined();
          expect((response as JsonRpcSuccess<string>).result).toStrictEqual([]);
        });
      });

      describe('WalletConnect', () => {
        it('returns the selected account', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalWalletConnectOptions(),
            hostname: 'example.metamask.io',
          });
          const request = {
            jsonrpc,
            id: 1,
            method,
          };

          const response = await callMiddleware({ middleware, request });

          expect((response as JsonRpcFailure).error).toBeUndefined();
          expect((response as JsonRpcSuccess<string>).result).toStrictEqual([
            mockAddress2,
          ]);
        });
      });

      describe('SDK', () => {
        it('returns the selected account for an approved host', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalSDKOptions(),
            hostname: 'example.metamask.io',
            getApprovedHosts: () => ({ 'example.metamask.io': true }),
          });
          const request = {
            jsonrpc,
            id: 1,
            method,
          };

          const response = await callMiddleware({ middleware, request });

          expect((response as JsonRpcFailure).error).toBeUndefined();
          expect((response as JsonRpcSuccess<string>).result).toStrictEqual([
            mockAddress2,
          ]);
        });

        it('returns an empty array for an unapproved host', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalSDKOptions(),
            hostname: 'example.metamask.io',
            getApprovedHosts: () => ({}),
          });
          const request = {
            jsonrpc,
            id: 1,
            method,
          };

          const response = await callMiddleware({ middleware, request });

          expect((response as JsonRpcFailure).error).toBeUndefined();
          expect((response as JsonRpcSuccess<string>).result).toStrictEqual([]);
        });
      });
    });
  }

  describe('wallet_requestPermissions', () => {
    it('can requestPermissions for eth_accounts', async () => {
      MockEngine.context.PermissionController.requestPermissions.mockImplementation(
        async () => [
          {
            eth_accounts: {
              parentCapability: 'eth_accounts',
              caveats: [],
            },
          },
        ],
      );
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_requestPermissions',
        params: [
          {
            eth_accounts: {},
          },
        ],
      };
      const response = await callMiddleware({ middleware, request });
      expect(
        (response as JsonRpcSuccess<PermissionConstraint[]>).result,
      ).toEqual([{ parentCapability: 'eth_accounts', caveats: [] }]);
    });
  });

  describe('wallet_getPermissions', () => {
    it('can getPermissions', async () => {
      MockEngine.context.PermissionController.getPermissions.mockImplementation(
        () => ({
          eth_accounts: {
            parentCapability: 'eth_accounts',
            caveats: [],
          },
        }),
      );
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_getPermissions',
        params: [],
      };
      const response = await callMiddleware({ middleware, request });
      expect(
        (response as JsonRpcSuccess<PermissionConstraint[]>).result,
      ).toEqual([{ parentCapability: 'eth_accounts', caveats: [] }]);
    });
  });

  describe('eth_sendTransaction', () => {
    describe('browser', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        const mockTabId = 10;
        setupGlobalState({
          activeTab: mockTabId,
          addTransactionResult: Promise.resolve('fake-hash'),
          permittedAccounts: { 'example.metamask.io': [mockAddress] },
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalBrowserOptions(),
          hostname: 'example.metamask.io',
          tabId: mockTabId,
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toBeUndefined();
        expect((response as JsonRpcSuccess<string>).result).toBe('fake-hash');
      });

      it('returns a JSON-RPC error if the transaction is requested by a non-active tab', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        // Tab used by middleware DOES NOT match current tab
        const requestTabId = 10;
        const activeTabId = 20;
        setupGlobalState({
          activeTab: activeTabId,
          addTransactionResult: Promise.resolve('fake-hash'),
          permittedAccounts: { 'example.metamask.io': [mockAddress] },
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalBrowserOptions(),
          hostname: 'example.metamask.io',
          tabId: requestTabId,
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };
        const expectedError = ethErrors.provider.userRejectedRequest();

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toStrictEqual({
          code: expectedError.code,
          message: expectedError.message,
        });
      });

      it('returns a JSON-RPC error if the site does not have permission to use the referenced account', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        const mockTabId = 10;
        setupGlobalState({
          activeTab: mockTabId,
          addTransactionResult: Promise.resolve('fake-hash'),
          // Note that no accounts are permitted
          permittedAccounts: {},
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalBrowserOptions(),
          hostname: 'example.metamask.io',
          tabId: mockTabId,
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };
        const expectedError = ethErrors.rpc.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toStrictEqual({
          code: expectedError.code,
          message: expectedError.message,
        });
      });
    });

    describe('WalletConnect', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
          selectedAddress: mockAddress,
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalWalletConnectOptions(),
          hostname: 'example.metamask.io',
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toBeUndefined();
        expect((response as JsonRpcSuccess<string>).result).toBe('fake-hash');
      });

      it('returns a JSON-RPC error if the referenced account is not currently selected', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const differentMockAddress =
          '0x0000000000000000000000000000000000000002';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
          selectedAddress: differentMockAddress,
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalWalletConnectOptions(),
          hostname: 'example.metamask.io',
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };
        const expectedError = ethErrors.rpc.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toStrictEqual({
          code: expectedError.code,
          message: expectedError.message,
        });
      });
    });

    describe('SDK', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
          selectedAddress: mockAddress,
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalSDKOptions(),
          hostname: 'example.metamask.io',
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toBeUndefined();
        expect((response as JsonRpcSuccess<string>).result).toBe('fake-hash');
      });

      it('returns a JSON-RPC error if the referenced account is not currently selected', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const differentMockAddress =
          '0x0000000000000000000000000000000000000002';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          // Set minimal network controller state to support validation
          providerConfig: {
            chainId: '1',
            type: RPC,
          },
          selectedAddress: differentMockAddress,
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalSDKOptions(),
          hostname: 'example.metamask.io',
        });
        const request = {
          jsonrpc,
          id: 1,
          method: 'eth_sendTransaction',
          params: [mockTransactionParameters],
        };
        const expectedError = ethErrors.rpc.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error).toStrictEqual({
          code: expectedError.code,
          message: expectedError.message,
        });
      });
    });

    it('skips account validation if the account is missing from the transaction parameters', async () => {
      // Downcast needed here because `from` is required by this type
      const mockTransactionParameters = { chainId: 1 } as Transaction;
      setupGlobalState({
        addTransactionResult: Promise.resolve('fake-hash'),
        // Set minimal network controller state to support validation
        providerConfig: {
          chainId: '1',
          type: RPC,
        },
      });
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [mockTransactionParameters],
      };

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error).toBeUndefined();
      expect((response as JsonRpcSuccess<string>).result).toBe('fake-hash');
    });

    it('skips chain ID validation if the chain ID is missing from the transaction parameters', async () => {
      const mockAddress = '0x0000000000000000000000000000000000000001';
      const mockTransactionParameters = { from: mockAddress };
      setupGlobalState({
        addTransactionResult: Promise.resolve('fake-hash'),
        permittedAccounts: { 'example.metamask.io': [mockAddress] },
      });
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [mockTransactionParameters],
      };

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error).toBeUndefined();
      expect((response as JsonRpcSuccess<string>).result).toBe('fake-hash');
    });

    it('returns a JSON-RPC error if an error is thrown when adding this transaction', async () => {
      // Omit `from` and `chainId` here to skip validation for simplicity
      // Downcast needed here because `from` is required by this type
      const mockTransactionParameters = {} as Transaction;
      // Transaction fails before returning a result
      MockEngine.context.TransactionController.addTransaction.mockImplementation(
        async () => {
          throw new Error('Failed to add transaction');
        },
      );
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [mockTransactionParameters],
      };
      const expectedError = ethErrors.rpc.internal('Failed to add transaction');

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });

    it('returns a JSON-RPC error if an error is thrown after approval', async () => {
      // Omit `from` and `chainId` here to skip validation for simplicity
      // Downcast needed here because `from` is required by this type
      const mockTransactionParameters = {} as Transaction;
      setupGlobalState({
        addTransactionResult: Promise.reject(
          new Error('Failed to process transaction'),
        ),
      });
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [mockTransactionParameters],
      };
      const expectedError = ethErrors.rpc.internal(
        'Failed to process transaction',
      );

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });
  });

  describe('personal_ecRecover', () => {
    const helloWorldAddress = '0x29c76e6ad8f28bb1004902578fb108c507be341b';
    // This is a signature of the message "Hello, world!" that was created using the private key of
    // the helloWorldAddress account
    const helloWorldSignature =
      '0x90a938f7457df6e8f741264c32697fc52f9a8f867c52dd70713d9d2d472f2e415d9c94148991bbe1f4a1818d1dff09165782749c877f5cf1eff4ef126e55714d1c';
    const helloWorldMessage = `0x${Buffer.from('Hello, world!').toString(
      'hex',
    )}`;

    it('recovers the address of a signature', async () => {
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_ecRecover',
        params: [helloWorldMessage, helloWorldSignature],
      };

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error).toBeUndefined();
      expect((response as JsonRpcSuccess<string>).result).toBe(
        helloWorldAddress,
      );
    });

    it('returns the wrong address if the wrong data is provided', async () => {
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_ecRecover',
        params: ['another message', helloWorldSignature],
      };

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error).toBeUndefined();
      expect((response as JsonRpcSuccess<string>).result).toBeTruthy();
      expect((response as JsonRpcSuccess<string>).result).not.toBe(
        helloWorldAddress,
      );
    });

    it('returns a JSON-RPC error if the signature is missing', async () => {
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_ecRecover',
        params: [helloWorldMessage],
      };
      const expectedError = ethErrors.rpc.internal(
        'Missing signature parameter',
      );

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });

    it('returns a JSON-RPC error if the data is missing', async () => {
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_ecRecover',
        params: [undefined, helloWorldSignature],
      };
      const expectedError = ethErrors.rpc.internal('Missing data parameter');

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });
  });

  describe('parity_checkRequest', () => {
    it('returns null', async () => {
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'parity_checkRequest',
      };

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error).toBeUndefined();
      expect((response as JsonRpcSuccess<string>).result).toBeNull();
    });
  });

  describe('eth_sign', () => {
    async function sendRequest({ data = dataMock } = {}) {
      const { middleware } = setupSignature();

      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_sign',
        params: [addressMock, data],
      };

      return (await callMiddleware({ middleware, request })) as any;
    }

    beforeEach(() => {
      Engine.context.PreferencesController.state.disabledRpcMethodPreferences =
        { eth_sign: true };
    });

    it('creates unsigned message', async () => {
      await sendRequest();

      expect(
        Engine.context.SignatureController.newUnsignedMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.newUnsignedMessage,
      ).toHaveBeenCalledWith({
        data: dataMock,
        from: addressMock,
        meta: expect.any(Object),
        origin: hostMock,
      });
    });

    it('returns resolved value from message promise', async () => {
      Engine.context.SignatureController.newUnsignedMessage.mockResolvedValue(
        signatureMock,
      );

      const response = await sendRequest();

      expect(response.error).toBeUndefined();
      expect(response.result).toBe(signatureMock);
    });

    it('returns error if eth_sign disabled in preferences', async () => {
      Engine.context.PreferencesController.state.disabledRpcMethodPreferences =
        { eth_sign: false };

      const response = await sendRequest();

      expect(response.error.message).toBe(
        'eth_sign has been disabled. You must enable it in the advanced settings',
      );
    });

    it('returns error if data is wrong length', async () => {
      const response = await sendRequest({ data: '0x1' });

      expect(response.error.message).toBe(AppConstants.ETH_SIGN_ERROR);
    });
  });

  describe('personal_sign', () => {
    async function sendRequest() {
      const { middleware } = setupSignature();

      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_sign',
        params: [dataMock, addressMock],
      };

      Engine.context.SignatureController.newUnsignedPersonalMessage.mockResolvedValue(
        signatureMock,
      );

      return (await callMiddleware({ middleware, request })) as any;
    }

    it('creates unsigned message', async () => {
      await sendRequest();

      expect(
        Engine.context.SignatureController.newUnsignedPersonalMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.newUnsignedPersonalMessage,
      ).toHaveBeenCalledWith({
        data: dataMock,
        from: addressMock,
        meta: expect.any(Object),
        origin: hostMock,
      });
    });

    it('returns resolved value from message promise', async () => {
      const response = await sendRequest();

      expect(response.error).toBeUndefined();
      expect(response.result).toBe(signatureMock);
    });
  });

  describe.each([
    ['eth_signTypedData', 'V1', false],
    ['eth_signTypedData_v3', 'V3', true],
    ['eth_signTypedData_v4', 'V4', true],
  ])('%s', (methodName, version, addressFirst) => {
    async function sendRequest() {
      Engine.context.SignatureController.newUnsignedTypedMessage.mockReset();

      const { middleware } = setupSignature();

      const request = {
        jsonrpc,
        id: 1,
        method: methodName,
        params: [
          addressFirst ? addressMock : dataJsonMock,
          addressFirst ? dataJsonMock : addressMock,
        ],
      };

      Engine.context.SignatureController.newUnsignedTypedMessage.mockResolvedValue(
        signatureMock,
      );

      return (await callMiddleware({ middleware, request })) as any;
    }

    it('creates unsigned message', async () => {
      await sendRequest();

      expect(
        Engine.context.SignatureController.newUnsignedTypedMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.newUnsignedTypedMessage,
      ).toHaveBeenCalledWith(
        {
          data: dataJsonMock,
          from: addressMock,
          meta: expect.any(Object),
          origin: hostMock,
        },
        expect.any(Object),
        version,
      );
    });

    it('returns resolved value from message promise', async () => {
      const response = await sendRequest();

      expect(response.error).toBeUndefined();
      expect(response.result).toBe(signatureMock);
    });
  });
});
