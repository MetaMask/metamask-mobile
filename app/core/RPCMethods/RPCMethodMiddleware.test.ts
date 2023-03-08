import {
  JsonRpcEngine,
  JsonRpcMiddleware,
  JsonRpcRequest,
  JsonRpcSuccess,
} from 'json-rpc-engine';
import { assertIsJsonRpcSuccess, JsonRpcFailure } from '@metamask/utils';
import type { Transaction } from '@metamask/transaction-controller';
import { ethErrors } from 'eth-json-rpc-errors';
import Engine from '../Engine';
import { store } from '../../store';
import { getPermittedAccounts } from '../Permissions';
import { RPC } from '../../constants/network';
import { getRpcMethodMiddleware } from './RPCMethodMiddleware';

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
  },
}));
const MockEngine = Engine as Omit<typeof Engine, 'context'> & {
  context: {
    NetworkController: Record<string, any>;
    PreferencesController: Record<string, any>;
    TransactionController: Record<string, any>;
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

  describe('eth_sendTransaction', () => {
    describe('browser', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address is permitted for the hostname used by this request
        mockGetPermittedAccounts.mockImplementation((hostname) =>
          hostname === 'example.metamask.io' ? [mockAddress] : [],
        );
        // Ensure tab used by middleware matches current tab
        const mockTabId = 10;
        mockStore.getState.mockImplementation(() => ({
          browser: {
            activeTab: mockTabId,
          },
        }));
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address is permitted for the hostname used by this request
        mockGetPermittedAccounts.mockImplementation((hostname) =>
          hostname === 'example.metamask.io' ? [mockAddress] : [],
        );
        // Tab used by middleware DOES NOT match current tab
        const mockTabId = 10;
        mockStore.getState.mockImplementation(() => ({
          browser: {
            activeTab: 20,
          },
        }));
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // No accounts permitted for this test
        mockGetPermittedAccounts.mockImplementation(() => []);
        // Ensure tab used by middleware matches current tab
        const mockTabId = 10;
        mockStore.getState.mockImplementation(() => ({
          browser: {
            activeTab: mockTabId,
          },
        }));
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address matches the selected account
        MockEngine.context.PreferencesController.state.selectedAddress =
          mockAddress;
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address DOES NOT match the selected account
        MockEngine.context.PreferencesController.state.selectedAddress =
          differentMockAddress;
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address matches the selected account
        MockEngine.context.PreferencesController.state.selectedAddress =
          mockAddress;
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
        // Transaction will succeed when added
        MockEngine.context.TransactionController.addTransaction.mockImplementation(
          async () => ({ result: Promise.resolve('fake-hash') }),
        );
        // Set minimal network controller state to support validation
        MockEngine.context.NetworkController.state.providerConfig = {
          chainId: '1',
          type: RPC,
        };
        // Ensure mock address DOES NOT match the selected account
        MockEngine.context.PreferencesController.state.selectedAddress =
          differentMockAddress;
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
      // Transaction will succeed when added
      MockEngine.context.TransactionController.addTransaction.mockImplementation(
        async () => ({ result: Promise.resolve('fake-hash') }),
      );
      // Set minimal network controller state to support validation
      MockEngine.context.NetworkController.state.providerConfig = {
        chainId: '1',
        type: RPC,
      };
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
      // Transaction will succeed when added
      MockEngine.context.TransactionController.addTransaction.mockImplementation(
        async () => ({ result: Promise.resolve('fake-hash') }),
      );
      // Ensure mock address is permitted for the hostname used by this request
      mockGetPermittedAccounts.mockImplementation((hostname) =>
        hostname === 'example.metamask.io' ? [mockAddress] : [],
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
      // Transaction returns an error as the result
      MockEngine.context.TransactionController.addTransaction.mockImplementation(
        async () => ({
          result: Promise.reject(new Error('Failed to process transaction')),
        }),
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
});
