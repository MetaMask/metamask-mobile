import { JsonRpcEngine, JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import type {
  CaipAccountId,
  Hex,
  Json,
  JsonRpcFailure,
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
} from '@metamask/utils';
import {
  type JsonRpcError,
  providerErrors,
  rpcErrors,
} from '@metamask/rpc-errors';
import type { TransactionParams } from '@metamask/transaction-controller';
import Engine from '../Engine';
import { store } from '../../store';
import { getPermittedAccounts } from '../Permissions';
import {
  checkActiveAccountAndChainId,
  getRpcMethodMiddleware,
  getRpcMethodMiddlewareHooks,
} from './RPCMethodMiddleware';
import {
  Caveat,
  CaveatSpecificationConstraint,
  ExtractPermission,
  PermissionConstraint,
  PermissionController,
  PermissionDoesNotExistError,
  PermissionSpecificationConstraint,
  SubjectPermissions,
  ValidPermission,
} from '@metamask/permission-controller';
import PPOMUtil from '../../lib/ppom/ppom-util';
import { backgroundState } from '../../util/test/initial-root-state';
import { Store } from 'redux';
import { RootState } from 'app/reducers';
import { addTransaction } from '../../util/transaction-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  PermissionKeys,
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../Permissions/specifications';
import { EthAccountType, EthMethod } from '@metamask/keyring-api';
import { ProviderConfig } from '../../selectors/networkController';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getCaip25PermissionFromLegacyPermissions,
  requestPermittedChainsPermissionIncremental,
} from '@metamask/chain-agnostic-permission';
import { CaveatTypes } from '../Permissions/constants';
import { rejectOriginPendingApprovals } from '../../util/permissions';
import { toHex } from '@metamask/controller-utils';

jest.mock('@metamask/chain-agnostic-permission', () => ({
  ...jest.requireActual('@metamask/chain-agnostic-permission'),
  getCaip25PermissionFromLegacyPermissions: jest.fn(),
  requestPermittedChainsPermissionIncremental: jest.fn(),
}));

jest.mock('../../util/metrics', () => ({
  trackDappViewedEvent: jest.fn(),
}));

jest.mock('../../util/permissions', () => ({
  __esModule: true,
  rejectOriginPendingApprovals: jest.fn(),
}));

jest.mock('./spam');

jest.mock('../Engine', () => ({
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
      grantPermissionsIncremental: jest.fn(),
      requestPermissionsIncremental: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(),
      getNetworkConfigurationByNetworkClientId: jest
        .fn()
        .mockImplementation(() => ({ chainId: '0x1' })),
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
        },
      }),
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
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
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest.fn(),
}));
const mockGetPermittedAccounts = getPermittedAccounts as jest.Mock;
const mockAddTransaction = addTransaction as jest.Mock;

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
}: {
  activeTab?: number;
  addTransactionResult?: Promise<string>;
  permittedAccounts?: Record<string, string[]>;
  selectedNetworkClientId: string;
  networksMetadata?: Record<string, object>;
  networkConfigurationsByChainId?: Record<string, object>;
  providerConfig?: ProviderConfig;
  selectedAddress?: string;
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
  beforeEach(() => jest.clearAllMocks());
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
    const rootMessenger = new Messenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
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
      messenger: new Messenger<
        'PermissionController',
        never,
        never,
        typeof rootMessenger
      >({
        namespace: 'PermissionController',
        parent: rootMessenger,
      }),
      caveatSpecifications: getCaveatSpecifications({
        listAccounts: mockListAccounts,
        findNetworkClientIdByChainId: jest.fn(),
        isNonEvmScopeSupported: jest.fn(),
        getNonEvmAccountAddresses: jest.fn(),
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
    it(`revokes ${Caip25EndowmentPermissionName} permissions if ${PermissionKeys.eth_accounts} permission key is passed`, async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ [PermissionKeys.eth_accounts]: {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: [Caip25EndowmentPermissionName],
      });
    });

    it(`revokes ${Caip25EndowmentPermissionName} permission if ${PermissionKeys.permittedChains} permission key is passed`, async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [{ [PermissionKeys.permittedChains]: {} }],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: [Caip25EndowmentPermissionName],
      });
    });

    it(`revokes ${Caip25EndowmentPermissionName} permission if both ${PermissionKeys.eth_accounts} and ${PermissionKeys.permittedChains} permission keys are passed`, async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [
          {
            [PermissionKeys.eth_accounts]: {},
            [PermissionKeys.permittedChains]: {},
          },
        ],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: [Caip25EndowmentPermissionName],
      });
    });

    it(`revokes ${Caip25EndowmentPermissionName} and other permissions, if ${PermissionKeys.eth_accounts} and ${PermissionKeys.permittedChains} passed alongside other permissions`, async () => {
      const hostname = 'example.metamask.io';
      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname,
      });
      const request = {
        jsonrpc,
        id: 1,
        method: 'wallet_revokePermissions',
        params: [
          {
            [PermissionKeys.eth_accounts]: {},
            [PermissionKeys.permittedChains]: {},
            a: {},
            b: {},
          },
        ],
      };
      await callMiddleware({ middleware, request });
      expect(
        MockEngine.context.PermissionController.revokePermissions,
      ).toHaveBeenCalledWith({
        [hostname]: ['a', 'b', Caip25EndowmentPermissionName],
      });
    });

    it(`will revoke other permissions if ${Caip25EndowmentPermissionName} is not passed`, async () => {
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
    it('can requestPermissions for eth_accounts', async () => {
      const accounts: CaipAccountId[] = [`wallet:eip155:${addressMock}`];
      const mockOrigin = 'example.metamask.io';
      const mockPermission = {
        [Caip25EndowmentPermissionName]: {
          parentCapability: PermissionKeys.eth_accounts,
          id: 'id',
          date: 1,
          invoker: mockOrigin,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: {
                  'wallet:eip155': {
                    accounts,
                  },
                },
                sessionProperties: {},
                isMultichainOrigin: false,
              },
            },
          ],
        },
      };

      mockGetPermittedAccounts.mockImplementation(() => [addressMock]);
      MockEngine.context.PermissionController.requestPermissions.mockImplementation(
        async () => [
          /**
           * `PermissionController.requestPermissions` response can return a valid `{@link Caip25EndowmentPermissionName}` permission object,
           * which does not match the explicit return type for the method implementation itself, so we typecast to prevent compile error.
           */
          mockPermission as unknown as Partial<
            SubjectPermissions<
              ExtractPermission<
                PermissionSpecificationConstraint,
                CaveatSpecificationConstraint
              >
            >
          >,
          {
            id: 'id',
            origin: mockOrigin,
          },
        ],
      );
      (getCaip25PermissionFromLegacyPermissions as jest.Mock).mockReturnValue(
        mockPermission,
      );

      const expectedEthAccountsPermission = {
        caveats: [
          {
            type: CaveatTypes.restrictReturnedAccounts,
            value: [addressMock],
          },
        ],
        id: 'id',
        date: 1,
        invoker: mockOrigin,
        parentCapability: PermissionKeys.eth_accounts,
      };

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
            [PermissionKeys.eth_accounts]: {},
          },
        ],
      };
      const response = await callMiddleware({ middleware, request });
      expect(
        (response as JsonRpcSuccess<PermissionConstraint[]>).result,
      ).toEqual([expectedEthAccountsPermission]);
    });
  });

  describe('wallet_getPermissions', () => {
    it('can getPermissions', async () => {
      const accounts: CaipAccountId[] = [`wallet:eip155:${addressMock}`];
      const mockOrigin = 'example.metamask.io';
      const mockPermission: SubjectPermissions<
        ValidPermission<string, Caveat<typeof Caip25CaveatType, Json>>
      > = {
        [Caip25EndowmentPermissionName]: {
          parentCapability: PermissionKeys.eth_accounts,
          id: 'id',
          date: 1,
          invoker: mockOrigin,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: {
                  'wallet:eip155': {
                    accounts,
                  },
                },
                sessionProperties: {},
                isMultichainOrigin: false,
              },
            },
          ],
        },
      };

      mockGetPermittedAccounts.mockImplementation(() => [addressMock]);
      MockEngine.context.PermissionController.getPermissions.mockImplementation(
        () => mockPermission,
      );

      const expectedEthAccountsPermission = {
        id: 'id',
        date: 1,
        invoker: mockOrigin,
        parentCapability: PermissionKeys.eth_accounts,
        caveats: [
          {
            type: CaveatTypes.restrictReturnedAccounts,
            value: [addressMock],
          },
        ],
      };

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
      ).toEqual([expectedEthAccountsPermission]);
    });
  });

  describe('eth_requestAccounts', () => {
    it('can get permitted accounts if permission exists', async () => {
      const requestPermissionsSpy = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissions',
      );
      mockGetPermittedAccounts.mockReturnValue([addressMock]);

      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });

      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_requestAccounts',
        params: [],
        origin: 'example.metamask.io',
      };

      const response = await callMiddleware({ middleware, request });

      expect(requestPermissionsSpy).not.toHaveBeenCalled();
      expect(
        (response as JsonRpcSuccess<PermissionConstraint[]>).result,
      ).toEqual([addressMock]);
    });

    it('can get permitted accounts after requesting permissions if permission does not exists', async () => {
      const requestPermissionsSpy = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissions',
      );
      mockGetPermittedAccounts
        .mockReturnValueOnce([])
        .mockReturnValue([addressMock]);

      const mockPermission = {
        [Caip25EndowmentPermissionName]: {
          parentCapability: PermissionKeys.eth_accounts,
          id: 'id',
          date: 1,
          invoker: 'example.metamask.io',
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: {
                  'wallet:eip155': {
                    accounts: [],
                  },
                },
                sessionProperties: {},
                isMultichainOrigin: false,
              },
            },
          ],
        },
      };
      (getCaip25PermissionFromLegacyPermissions as jest.Mock).mockReturnValue(
        mockPermission,
      );

      const middleware = getRpcMethodMiddleware({
        ...getMinimalOptions(),
        hostname: 'example.metamask.io',
      });

      const request = {
        jsonrpc,
        id: 1,
        method: 'eth_requestAccounts',
        params: [],
        origin: 'example.metamask.io',
      };

      const response = await callMiddleware({ middleware, request });

      expect(
        (response as JsonRpcSuccess<PermissionConstraint[]>).result,
      ).toEqual([addressMock]);
      expect(requestPermissionsSpy).toHaveBeenCalledWith(
        { origin: 'example.metamask.io' },
        mockPermission,
        {
          metadata: {
            isEip1193Request: true,
          },
        },
      );
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
});

describe('checkActiveAccountAndChainId', () => {
  const mockGetNetworkConfigurationByNetworkClientId = jest.mocked(
    Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermittedAccounts.mockReturnValue([]);
  });

  describe('chainId validation', () => {
    it('validates when networkClientId chainId matches request hex chainId', async () => {
      const networkConfig = { chainId: '0x1' };
      mockGetNetworkConfigurationByNetworkClientId.mockReturnValue(
        networkConfig as ReturnType<
          typeof mockGetNetworkConfigurationByNetworkClientId
        >,
      );

      await expect(
        checkActiveAccountAndChainId({
          hostname: 'test.com',
          isWalletConnect: false,
          chainId: '0x1',
          networkClientId: 'mainnet',
        }),
      ).resolves.not.toThrow();

      expect(mockGetNetworkConfigurationByNetworkClientId).toHaveBeenCalledWith(
        'mainnet',
      );
    });

    it('validates when networkClientId chainId matches request decimal chainId', async () => {
      const networkConfig = { chainId: '0x89' };
      mockGetNetworkConfigurationByNetworkClientId.mockReturnValue(
        networkConfig as ReturnType<
          typeof mockGetNetworkConfigurationByNetworkClientId
        >,
      );

      await expect(
        checkActiveAccountAndChainId({
          hostname: 'test.com',
          isWalletConnect: false,
          chainId: 137,
          networkClientId: 'polygon',
        }),
      ).resolves.not.toThrow();
    });

    it('throws internal error when network configuration is not found', async () => {
      mockGetNetworkConfigurationByNetworkClientId.mockReturnValue(undefined);

      await expect(
        checkActiveAccountAndChainId({
          hostname: 'test.com',
          isWalletConnect: false,
          chainId: 1,
          networkClientId: 'unknown-network',
        }),
      ).rejects.toMatchObject({
        code: -32603,
        message: 'Failed to get active chainId.',
      });
    });

    it('throws invalidParams error when chainIds do not match', async () => {
      const networkConfig = { chainId: '0x1' };
      mockGetNetworkConfigurationByNetworkClientId.mockReturnValue(
        networkConfig as ReturnType<
          typeof mockGetNetworkConfigurationByNetworkClientId
        >,
      );

      await expect(
        checkActiveAccountAndChainId({
          hostname: 'test.com',
          isWalletConnect: false,
          chainId: 137,
          networkClientId: 'mainnet',
        }),
      ).rejects.toMatchObject({
        code: -32602,
        message:
          'Invalid parameters: active chainId is different than the one provided.',
      });
    });

    it('skips chainId validation when chainId is not provided', async () => {
      await expect(
        checkActiveAccountAndChainId({
          hostname: 'test.com',
          isWalletConnect: false,
          networkClientId: 'mainnet',
        }),
      ).resolves.not.toThrow();

      expect(
        mockGetNetworkConfigurationByNetworkClientId,
      ).not.toHaveBeenCalled();
    });
  });
});

describe('getRpcMethodMiddlewareHooks', () => {
  const testOrigin = 'https://test.com';
  const mockUrl = { current: 'https://test.com' };
  const mockTitle = { current: 'Test Site' };
  const mockIcon = { current: undefined };
  const mockAnalytics = { test: true };
  const mockGetSource = jest.fn(() => 'test-source');

  const hooks = getRpcMethodMiddlewareHooks({
    origin: testOrigin,
    url: mockUrl,
    title: mockTitle,
    icon: mockIcon,
    analytics: mockAnalytics,
    channelId: 'test-channel',
    getSource: mockGetSource,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Your mocks will go here
  });

  describe('getCaveat', () => {
    it('should return caveat when permission exists', () => {
      const mockCaveat = {
        value: { optionalScopes: { 'eip155:1': { accounts: [] } } },
      };

      MockEngine.context.PermissionController.getCaveat.mockReturnValue(
        mockCaveat as unknown as ReturnType<
          typeof MockEngine.context.PermissionController.getCaveat
        >,
      );

      const params = {
        target: Caip25EndowmentPermissionName,
        caveatType: Caip25CaveatType,
      };

      const result = hooks.getCaveat(params);

      expect(
        MockEngine.context.PermissionController.getCaveat,
      ).toHaveBeenCalledWith(testOrigin, params.target, params.caveatType);
      expect(result).toEqual(mockCaveat);
    });

    it('should return undefined when permission does not exist', () => {
      const params = {
        target: Caip25EndowmentPermissionName,
        caveatType: Caip25CaveatType,
      };

      MockEngine.context.PermissionController.getCaveat.mockImplementation(
        () => {
          throw new PermissionDoesNotExistError(testOrigin, params.target);
        },
      );

      const result = hooks.getCaveat(params);
      expect(result).toBeUndefined();
    });

    it('should propagate unexpected errors', () => {
      const params = {
        target: Caip25EndowmentPermissionName,
        caveatType: Caip25CaveatType,
      };

      MockEngine.context.PermissionController.getCaveat.mockImplementation(
        () => {
          throw new Error('Unexpected error');
        },
      );

      expect(() => hooks.getCaveat(params)).toThrow('Unexpected error');
    });
  });

  describe('requestPermittedChainsPermissionIncrementalForOrigin', () => {
    it('should call requestPermittedChainsPermissionIncremental with correct params', () => {
      const options = {
        origin: 'https://other-origin.com', // This should be overridden
        chainId: toHex('0x1'),
        autoApprove: true,
      };

      const mockRequestPermittedChainsPermissionIncremental =
        requestPermittedChainsPermissionIncremental as jest.Mock;
      hooks.requestPermittedChainsPermissionIncrementalForOrigin(options);

      expect(
        mockRequestPermittedChainsPermissionIncremental,
      ).toHaveBeenCalledWith({
        ...options,
        origin: testOrigin,
        hooks: {
          grantPermissionsIncremental: expect.any(Function),
          requestPermissionsIncremental: expect.any(Function),
        },
      });
    });
  });

  describe('hasApprovalRequestsForOrigin', () => {
    it('should call ApprovalController.has with correct origin', () => {
      hooks.hasApprovalRequestsForOrigin();

      expect(MockEngine.context.ApprovalController.has).toHaveBeenCalledWith({
        origin: testOrigin,
      });
    });
  });

  describe('getCurrentChainIdForDomain', () => {
    it('should return chainId for the given domain', () => {
      const domain = 'test.domain';
      const networkClientId = 'mainnet';
      const networkConfig = { chainId: '0x1' };

      MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
        networkClientId,
      );
      MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
        networkConfig as ReturnType<
          typeof MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId
        >,
      );

      const result = hooks.getCurrentChainIdForDomain(domain);

      expect(
        MockEngine.context.SelectedNetworkController
          .getNetworkClientIdForDomain,
      ).toHaveBeenCalledWith(domain);
      expect(
        MockEngine.context.NetworkController
          .getNetworkConfigurationByNetworkClientId,
      ).toHaveBeenCalledWith(networkClientId);
      expect(result).toBe('0x1');
    });
  });

  describe('getNetworkConfigurationByChainId', () => {
    it('should call the bound method with correct chainId', () => {
      const chainId = '0x1';

      hooks.getNetworkConfigurationByChainId(chainId);

      expect(
        MockEngine.context.NetworkController.getNetworkConfigurationByChainId,
      ).toHaveBeenCalledWith(chainId);
    });
  });

  describe('rejectApprovalRequestsForOrigin', () => {
    it('should call "rejectOriginPendingApprovals" with correct origin', () => {
      hooks.rejectApprovalRequestsForOrigin();

      expect(rejectOriginPendingApprovals).toHaveBeenCalledWith(testOrigin);
    });
  });
});
