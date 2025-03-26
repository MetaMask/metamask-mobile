import { JsonRpcEngine, JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import type {
  Hex,
  Json,
  JsonRpcFailure,
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
} from '@metamask/utils';
import { requestPermissionsHandler } from '@metamask/eip1193-permission-middleware';
import {
  type JsonRpcError,
  providerErrors,
  rpcErrors,
} from '@metamask/rpc-errors';
import type { TransactionParams } from '@metamask/transaction-controller';
import Engine from '../Engine';
import { store } from '../../store';
import { getPermittedAccounts } from '../Permissions';
import { getRpcMethodMiddleware } from './RPCMethodMiddleware';
import {
  PermissionConstraint,
  PermissionController,
} from '@metamask/permission-controller';
import PPOMUtil from '../../lib/ppom/ppom-util';
import { backgroundState } from '../../util/test/initial-root-state';
import { Store } from 'redux';
import { RootState } from 'app/reducers';
import { addTransaction } from '../../util/transaction-controller';
import { Messenger } from '@metamask/base-controller';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../Permissions/specifications';
import { EthAccountType, EthMethod } from '@metamask/keyring-api';
import {
  processOriginThrottlingRejection,
  validateOriginThrottling,
} from './spam';
import {
  NUMBER_OF_REJECTIONS_THRESHOLD,
  OriginThrottlingState,
} from '../redux/slices/originThrottling';
import { ProviderConfig } from '../../selectors/networkController';

jest.mock('@metamask/eip1193-permission-middleware', () => ({
  requestPermissionsHandler: {
    implementation: jest.fn(),
  },
}));
const mockPermissionHandlerImplementation =
  requestPermissionsHandler.implementation as jest.Mock;

jest.mock('./spam');

jest.mock('../Engine', () => ({
  getCaip25PermissionFromLegacyPermissions: jest.fn(),
  requestPermittedChainsPermissionIncremental: jest.fn(),
  controllerMessenger: {
    call: { bind: jest.fn() },
  },
  context: {
    ApprovalController: {
      has: jest.fn(),
    },
    SelectedNetworkController: {
      getNetworkClientIdForDomain: jest.fn(),
    },
    PreferencesController: {
      state: {},
    },
    SignatureController: {
      newUnsignedPersonalMessage: jest.fn(),
      newUnsignedTypedMessage: jest.fn(),
    },
    PermissionController: {
      getCaveat: jest.fn(),
      requestPermissions: jest.fn(),
      getPermissions: jest.fn(),
      revokePermissions: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(),
      getNetworkConfigurationByNetworkClientId: () => ({ chainId: '0x1' }),
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
        },
      }),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

jest.mock('../../util/transaction-controller', () => ({
  __esModule: true,
  addTransaction: jest.fn(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

const mockStore = store as unknown as {
  getState: jest.Mock;
  dispatch: jest.Mock;
};

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest.fn(),
}));
const mockGetPermittedAccounts = getPermittedAccounts as jest.Mock;
const mockAddTransaction = addTransaction as jest.Mock;

const mockProcessOriginThrottlingRejection =
  processOriginThrottlingRejection as jest.Mock;
const mockValidateOriginThrottling = validateOriginThrottling as jest.Mock;

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
  response: JsonRpcResponse<Json>,
): asserts response is JsonRpcSuccess<Json> {
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
  middleware: JsonRpcMiddleware<JsonRpcParams, Json>;
  request: JsonRpcRequest<JsonRpcParams>;
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
 * @param options.addTransactionResult - The result that the `addTransaction`
 * method should return.
 * @param options.permittedAccounts - Permitted accounts, keyed by hostname.
 * @param options.providerConfig - The provider configuration for the current selected network.
 * @param options.selectedAddress - The current selected address.
 */
function setupGlobalState({
  activeTab,
  addTransactionResult,
  permittedAccounts,
  selectedNetworkClientId,
  networksMetadata,
  networkConfigurationsByChainId,
  selectedAddress,
  originThrottling,
}: {
  activeTab?: number;
  addTransactionResult?: Promise<string>;
  permittedAccounts?: Record<string, string[]>;
  selectedNetworkClientId: string;
  networksMetadata?: Record<string, object>;
  networkConfigurationsByChainId?: Record<string, object>;
  providerConfig?: ProviderConfig;
  selectedAddress?: string;
  originThrottling?: OriginThrottlingState;
}) {
  // TODO: Remove any cast once PermissionController type is fixed. Currently, the state shows never.
  jest
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .spyOn(store as Store<Partial<RootState>, any>, 'getState')
    .mockImplementation(() => ({
      browser: activeTab
        ? {
            activeTab,
          }
        : {},
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkController: {
            selectedNetworkClientId: selectedNetworkClientId || '',
            networksMetadata: networksMetadata || {},
            networkConfigurationsByChainId:
              networkConfigurationsByChainId || {},
          },
          PreferencesController: selectedAddress ? { selectedAddress } : {},
        },
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      originThrottling: originThrottling || {
        origins: {},
      },
    }));
  mockStore.dispatch.mockImplementation((obj) => obj);
  if (addTransactionResult) {
    mockAddTransaction.mockImplementation(async () => ({
      result: addTransactionResult,
      transactionMeta: '123',
    }));
  }
  if (permittedAccounts) {
    mockGetPermittedAccounts.mockImplementation(
      (hostname) => permittedAccounts[hostname] || [],
    );
  }
  if (selectedAddress) {
    MockEngine.context.PreferencesController.state.selectedAddress =
      selectedAddress;
  }
}

const addressMock: Hex = '0x0000000000000000000000000000000000000001';
const dataMock =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const dataJsonMock = JSON.stringify({
  test: 'data',
  domain: { chainId: '0x1' },
});
const hostMock = 'example.metamask.io';
const signatureMock = '0x1234567890';

function setupSignature() {
  setupGlobalState({
    activeTab: 1,
    selectedNetworkClientId: 'mainnet',
    networksMetadata: {},
    networkConfigurationsByChainId: {
      '0x1': {
        blockExplorerUrls: ['https://etherscan.com'],
        chainId: '0x1',
        defaultRpcEndpointIndex: 0,
        name: 'Sepolia network',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: 'mainnet',
            type: 'Custom',
            url: 'https://mainnet.infura.io/v3',
          },
        ],
      },
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
  it('allows unrecognized methods to pass through without PermissionController middleware', async () => {
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

  describe('with permission middleware before', () => {
    const engine = new JsonRpcEngine();
    const messenger = new Messenger();
    const baseEoaAccount = {
      type: EthAccountType.Eoa,
      options: {},
      methods: [
        EthMethod.PersonalSign,
        EthMethod.SignTransaction,
        EthMethod.SignTypedDataV1,
        EthMethod.SignTypedDataV3,
        EthMethod.SignTypedDataV4,
      ],
    };
    const mockListAccounts = jest.fn().mockImplementationOnce(() => [
      {
        address: '0x1',
        id: '21066553-d8c8-4cdc-af33-efc921cd3ca9',
        metadata: {
          name: 'Test Account 1',
          lastSelected: 1,
          keyring: {
            type: 'HD Key Tree',
          },
        },
        ...baseEoaAccount,
      },
    ]);
    const permissionController = new PermissionController({
      messenger: messenger.getRestricted({
        name: 'PermissionController',
        allowedActions: [],
        allowedEvents: [],
      }),
      caveatSpecifications: getCaveatSpecifications({
        listAccounts: mockListAccounts,
        findNetworkClientIdByChainId: jest.fn(),
      }),
      permissionSpecifications: {
        ...getPermissionSpecifications(),
      },
      unrestrictedMethods,
    });
    const permissionMiddleware =
      permissionController.createPermissionMiddleware({
        origin: hostMock,
      });
    engine.push(permissionMiddleware);
    const middleware = getRpcMethodMiddleware(getMinimalOptions());
    engine.push(middleware);

    it('returns method not found error', async () => {
      const fakeMethodName = 'this-is-a-fake-method';
      const response = await engine.handle({
        jsonrpc,
        id: 1,
        method: fakeMethodName,
      });

      const expectedError = rpcErrors.methodNotFound(
        `The method "${fakeMethodName}" does not exist / is not available.`,
      );

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });
  });

  const accountMethods = ['eth_coinbase', 'parity_defaultAccount'];
  for (const method of accountMethods) {
    describe(method, () => {
      describe('browser', () => {
        it('returns permitted accounts for connected site', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000002';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
            selectedNetworkClientId: 'testNetworkClientId',
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
            selectedNetworkClientId: 'testNetworkClientId',
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
            selectedNetworkClientId: 'testNetworkClientId',
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
        it('returns permitted account for connected host', async () => {
          const mockAddress1 = '0x0000000000000000000000000000000000000001';
          const mockAddress2 = '0x0000000000000000000000000000000000000002';
          setupGlobalState({
            permittedAccounts: { 'example.metamask.io': [mockAddress1] },
            selectedAddress: mockAddress2,
            selectedNetworkClientId: 'testNetworkClientId',
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalSDKOptions(),
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

        it('returns an empty array for an unconnected channel', async () => {
          const mockAddress2 = '0x0000000000000000000000000000000000000001';
          setupGlobalState({
            permittedAccounts: {},
            selectedAddress: mockAddress2,
            selectedNetworkClientId: 'testNetworkClientId',
          });
          const middleware = getRpcMethodMiddleware({
            ...getMinimalSDKOptions(),
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
    });
  }

  describe('wallet_revokePermissions', () => {
    it('revokes eth_accounts and endowment:permitted-chains permissions if eth_accounts permission key is passed', async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['eth_accounts', 'endowment:permitted-chains'],
      });
    });

    it('revokes eth_accounts and endowment:permitted-chains permissions if endowment:permitted-chains permission key is passed', async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ 'endowment:permitted-chains': {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['eth_accounts', 'endowment:permitted-chains'],
      });
    });

    it('revokes eth_accounts and endowment:permitted-chains permissions if both permission keys are passed', async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {}, 'endowment:permitted-chains': {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['eth_accounts', 'endowment:permitted-chains'],
      });
    });

    it('revokes eth_accounts, endowment:permitted-chains, and other permissions, either is passed alongside other permissions', async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ 'endowment:permitted-chains': {}, a: {}, b: {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['eth_accounts', 'endowment:permitted-chains', 'a', 'b'],
      });
    });

    it('will revoke other permissions if neither eth_accounts or endowment:permitted-chains keys are passed', async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ a: {}, b: {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['a', 'b'],
      });
    });

    it('returns null result if PermissionController throws an error', async () => {
      MockEngine.context.PermissionController.revokePermissions.mockImplementation(
        () => {
          throw new Error('permission error');
        },
      );
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      };

      expect(await callMiddleware({ middleware, request })).toEqual({
        result: null,
        jsonrpc,
        id: 1,
      });
    });
  });

  describe('wallet_requestPermissions', () => {
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

    it('should call eip1193-method-middleware requestPermissionHandler implementation with expected arguments', async () => {
      mockPermissionHandlerImplementation.mockImplementation(
        (_req, _res, _next, callback) => {
          callback(null);
          return Promise.resolve();
        },
      );

      const response = await callMiddleware({ middleware, request });

      expect(mockPermissionHandlerImplementation).toHaveBeenCalledWith(
        request,
        response,
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          getAccounts: expect.any(Function),
          getCaip25PermissionFromLegacyPermissionsForOrigin:
            expect.any(Function),
          requestPermissionsForOrigin: expect.any(Function),
        }),
      );
    });

    it('should call implementation with expected arguments and receive an error if call throws', async () => {
      const mockError = new Error('error');
      mockPermissionHandlerImplementation.mockImplementation(
        (_req, _res, _next, callback) => {
          callback(mockError);
          return Promise.resolve();
        },
      );

      const response = await callMiddleware({ middleware, request });

      expect(response).toStrictEqual({
        id: request.id,
        jsonrpc: request.jsonrpc,
        error: expect.objectContaining({
          code: -32603,
          message: 'error',
        }),
      });

      expect(mockPermissionHandlerImplementation).toHaveBeenCalledWith(
        request,
        response,
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          getAccounts: expect.any(Function),
          getCaip25PermissionFromLegacyPermissionsForOrigin:
            expect.any(Function),
          requestPermissionsForOrigin: expect.any(Function),
        }),
      );
    });
  });

  describe('wallet_getPermissions', () => {
    it('can getPermissions', async () => {
      const mockOrigin = 'example.metamask.io';
      const mockPermission: Awaited<
        ReturnType<
          typeof MockEngine.context.PermissionController.getPermissions
        >
      > = {
        eth_accounts: {
          id: 'id',
          date: 1,
          invoker: mockOrigin,
          parentCapability: 'eth_accounts',
          caveats: [
            {
              type: 'restrictReturnedAccounts',
              value: [addressMock],
            },
          ],
        },
      };
      MockEngine.context.PermissionController.getPermissions.mockImplementation(
        () => mockPermission,
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
      ).toEqual([mockPermission.eth_accounts]);
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
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              chainId: '0x1',
              defaultRpcEndpointIndex: 0,
              name: 'Sepolia network',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
            },
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
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              defaultBlockExplorerUrlIndex: 0,
              defaultRpcEndpointIndex: 0,
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
              name: 'Sepolia network',
              nativeCurrency: 'ETH',
            },
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
        const expectedError = providerErrors.userRejectedRequest();

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error.code).toBe(
          expectedError.code,
        );
        expect((response as JsonRpcFailure).error.message).toBe(
          expectedError.message,
        );
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
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              defaultBlockExplorerUrlIndex: 0,
              defaultRpcEndpointIndex: 0,
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
              name: 'Ethereum Mainnet', // Use "Ethereum Mainnet" instead of Sepolia, as chainId '0x1' refers to Mainnet
              nativeCurrency: 'ETH',
            },
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
        const expectedError = rpcErrors.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error.code).toBe(
          expectedError.code,
        );
        expect((response as JsonRpcFailure).error.message).toBe(
          expectedError.message,
        );
      });
    });

    describe('WalletConnect', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          permittedAccounts: { 'example.metamask.io': [mockAddress] },
          // Set minimal network controller state to support validation
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              chainId: '0x1',
              defaultRpcEndpointIndex: 0,
              name: 'Sepolia network',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
            },
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
          permittedAccounts: { 'example.metamask.io': [] },
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              defaultBlockExplorerUrlIndex: 0,
              defaultRpcEndpointIndex: 0,
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
              name: 'Ethereum Mainnet', // Correcting to Ethereum Mainnet as per chainId '0x1'
              nativeCurrency: 'ETH',
            },
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
        const expectedError = rpcErrors.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error.code).toBe(
          expectedError.code,
        );
        expect((response as JsonRpcFailure).error.message).toBe(
          expectedError.message,
        );
      });
    });

    describe('SDK', () => {
      it('sends the transaction and returns the resulting hash', async () => {
        const mockAddress = '0x0000000000000000000000000000000000000001';
        const mockTransactionParameters = { from: mockAddress, chainId: '0x1' };
        setupGlobalState({
          addTransactionResult: Promise.resolve('fake-hash'),
          permittedAccounts: {
            '70a863a4-a756-4660-8c72-dc367d02f625': [mockAddress],
          },
          // Set minimal network controller state to support validation
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              chainId: '0x1',
              defaultRpcEndpointIndex: 0,
              name: 'Sepolia network',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
            },
          },
          selectedAddress: mockAddress,
        });
        const middleware = getRpcMethodMiddleware({
          ...getMinimalSDKOptions(),
          hostname: 'example.metamask.io',
          channelId: '70a863a4-a756-4660-8c72-dc367d02f625',
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
          selectedNetworkClientId: 'mainnet',
          networksMetadata: {},
          networkConfigurationsByChainId: {
            '0x1': {
              blockExplorerUrls: ['https://etherscan.com'],
              defaultBlockExplorerUrlIndex: 0,
              defaultRpcEndpointIndex: 0,
              chainId: '0x1',
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  type: 'Custom',
                  url: 'https://mainnet.infura.io/v3',
                },
              ],
              name: 'Ethereum Mainnet', // Correcting to Ethereum Mainnet as per chainId '0x1'
              nativeCurrency: 'ETH',
            },
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
        const expectedError = rpcErrors.invalidParams({
          message: `Invalid parameters: must provide an Ethereum address.`,
        });

        const response = await callMiddleware({ middleware, request });

        expect((response as JsonRpcFailure).error.code).toBe(
          expectedError.code,
        );
        expect((response as JsonRpcFailure).error.message).toBe(
          expectedError.message,
        );
      });
    });

    it('skips account validation if the account is missing from the transaction parameters', async () => {
      // Downcast needed here because `from` is required by this type
      const mockTransactionParameters = { chainId: '0x1' };
      setupGlobalState({
        addTransactionResult: Promise.resolve('fake-hash'),
        // Set minimal network controller state to support validation
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {},
        networkConfigurationsByChainId: {
          '0x1': {
            blockExplorerUrls: ['https://etherscan.com'],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Sepolia network',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'Custom',
                url: 'https://mainnet.infura.io/v3',
              },
            ],
          },
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
        selectedNetworkClientId: 'mainnet', // Added to fix the linting error
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
      const mockTransactionParameters = {} as (TransactionParams &
        JsonRpcParams)[];
      // Transaction fails before returning a result
      mockAddTransaction.mockImplementation(async () => {
        throw new Error('Failed to add transaction');
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
      const expectedError = rpcErrors.internal('Failed to add transaction');

      const response = await callMiddleware({ middleware, request });

      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
      expect(
        //@ts-expect-error {JsonRpcError} will be fixed by a future bump. [Reference](https://github.com/MetaMask/metamask-mobile/pull/14091/files#r2009831015)
        ((response as JsonRpcFailure).error as JsonRpcError<unknown>).data.cause
          .message,
      ).toBe(expectedError.message);
    });

    it('returns a JSON-RPC error if an error is thrown after approval', async () => {
      // Omit `from` and `chainId` here to skip validation for simplicity
      // Downcast needed here because `from` is required by this type
      const mockTransactionParameters = {} as (TransactionParams &
        JsonRpcParams)[];
      setupGlobalState({
        addTransactionResult: Promise.reject(
          new Error('Failed to process transaction'),
        ),
        selectedNetworkClientId: 'mainnet', // Added to fix the linting error
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
      const expectedError = rpcErrors.internal('Failed to process transaction');

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
      const expectedError = rpcErrors.internal('Missing signature parameter');

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
        params: [undefined, helloWorldSignature] as JsonRpcParams,
      };
      const expectedError = rpcErrors.internal('Missing data parameter');

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

  describe('personal_sign', () => {
    async function sendRequest() {
      const { middleware } = setupSignature();

      const request = {
        jsonrpc,
        id: 1,
        method: 'personal_sign',
        params: [dataMock, addressMock],
      };

      MockEngine.context.SignatureController.newUnsignedPersonalMessage.mockResolvedValue(
        signatureMock,
      );

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await callMiddleware({ middleware, request })) as any;
    }

    it('creates unsigned message', async () => {
      await sendRequest();

      expect(
        Engine.context.SignatureController.newUnsignedPersonalMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.newUnsignedPersonalMessage,
      ).toHaveBeenCalledWith(
        {
          data: dataMock,
          from: addressMock,
          meta: expect.any(Object),
          origin: hostMock,
          requestId: 1,
        },
        expect.any(Object),
        expect.any(Object),
      );
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
      MockEngine.context.SignatureController.newUnsignedTypedMessage.mockReset();

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

      MockEngine.context.SignatureController.newUnsignedTypedMessage.mockResolvedValue(
        signatureMock,
      );

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await callMiddleware({ middleware, request })) as any;
    }

    it('creates unsigned message', async () => {
      await sendRequest();

      const expectedParams = [
        {
          data: dataJsonMock,
          from: addressMock,
          meta: expect.any(Object),
          origin: hostMock,
          requestId: 1,
        },
        expect.any(Object),
        version,
        { parseJsonData: false },
        expect.any(Object),
      ];

      expect(
        Engine.context.SignatureController.newUnsignedTypedMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.newUnsignedTypedMessage,
      ).toHaveBeenCalledWith(...expectedParams);
    });

    it('returns resolved value from message promise', async () => {
      const response = await sendRequest();

      expect(response.error).toBeUndefined();
      expect(response.result).toBe(signatureMock);
    });

    it('should invoke validateRequest method', async () => {
      const spy = jest.spyOn(PPOMUtil, 'validateRequest');
      await sendRequest();
      expect(spy).toBeCalledTimes(1);
    });
  });

  describe('originThrottling', () => {
    const assumedBlockableRPCMethod = 'eth_sendTransaction';
    const mockBlockedOrigin = 'blocked.origin';

    it('blocks the request when the origin has an active spam filter for origin', async () => {
      // Restore mock for this test
      mockValidateOriginThrottling.mockImplementationOnce(
        jest.requireActual('./spam').validateOriginThrottling,
      );

      setupGlobalState({
        originThrottling: {
          origins: {
            [mockBlockedOrigin]: {
              rejections: NUMBER_OF_REJECTIONS_THRESHOLD,
              lastRejection: Date.now() - 1,
            },
          },
        },
        selectedNetworkClientId: 'testNetworkId', // Added to meet the required property
      });

      const middleware = getRpcMethodMiddleware(getMinimalBrowserOptions());
      const request = {
        jsonrpc,
        id: 1,
        method: assumedBlockableRPCMethod,
        params: [],
        origin: mockBlockedOrigin,
      };

      const response = await callMiddleware({ middleware, request });

      const expectedError = jest.requireActual('./spam').SPAM_FILTER_ACTIVATED;
      expect((response as JsonRpcFailure).error.code).toBe(expectedError.code);
      expect((response as JsonRpcFailure).error.message).toBe(
        expectedError.message,
      );
    });

    it('calls processOriginThrottlingRejection hook after receiving error', async () => {
      jest.doMock('./eth_sendTransaction', () => ({
        __esModule: true,
        default: jest.fn(() =>
          Promise.reject(providerErrors.userRejectedRequest()),
        ),
      }));

      mockProcessOriginThrottlingRejection.mockClear();

      setupGlobalState({
        originThrottling: {
          origins: {
            [mockBlockedOrigin]: {
              rejections: 1,
              lastRejection: Date.now() - 1,
            },
          },
        },
        selectedNetworkClientId: 'testNetworkId', // Added to meet the required property
      });

      const middleware = getRpcMethodMiddleware(getMinimalBrowserOptions());
      const request = {
        jsonrpc,
        id: 1,
        method: assumedBlockableRPCMethod,
        params: [],
        origin: mockBlockedOrigin,
      };

      await callMiddleware({ middleware, request });

      expect(mockProcessOriginThrottlingRejection).toHaveBeenCalledTimes(1);
      expect(mockProcessOriginThrottlingRejection).toHaveBeenCalledWith(
        expect.objectContaining({
          error: providerErrors.userRejectedRequest(),
        }),
      );
    });
  });
});
