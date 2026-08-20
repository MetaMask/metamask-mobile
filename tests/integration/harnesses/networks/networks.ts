/*
 * Networks integration-test harness (Shape A).
 *
 * Owns messenger wiring for real NetworkController /
 * NetworkEnablementController / MultichainNetworkController /
 * TokensController and a `buildNetworksIntegrationHarness()` factory.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - NetworkController — addNetwork / removeNetwork / in-memory configs
 *   - NetworkEnablementController — enablement map (listens to networkAdded)
 *   - MultichainNetworkController — constructed for Shape B reuse
 *   - TokensController — allTokens keyed by chainId; wipes on NC remove
 *
 * MOCKED (the I/O boundary — never makes real network calls):
 *   - global fetch (Slip44 / MultichainNetworkService / RPC)
 *   - MultichainNetworkService.fetchNetworkActivity
 *   - ConnectivityController:getState / RemoteFeatureFlagController:getState
 *     messenger handlers (required by NetworkController constructor)
 *   - AccountsController account actions (selected account fixture)
 *   - ApprovalController:addRequest / TokenListService / eth provider
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USAGE — see also tests/integration/AGENTS.md
 *
 *     import { buildNetworksIntegrationHarness }
 *       from '../../tests/integration/harnesses/networks/networks';
 *
 *     const { networkController } = buildNetworksIntegrationHarness();
 *     networkController.addNetwork({ chainId: '0x64', ... });
 */

import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import {
  NetworkController,
  RpcEndpointType,
  type AddNetworkFields,
  type NetworkControllerMessenger,
} from '@metamask/network-controller';
import {
  NetworkEnablementController,
  type NetworkEnablementControllerMessenger,
} from '@metamask/network-enablement-controller';
import {
  MultichainNetworkController,
  type MultichainNetworkControllerMessenger,
} from '@metamask/multichain-network-controller';
import {
  TokensController,
  type TokensControllerMessenger,
  type TokensControllerState,
} from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';

/**
 * Unrestricted root messenger for harness wiring. Action/event unions are
 * intentionally wide so sibling controllers can register and delegate freely.
 */
type NetworksHarnessRootMessenger = Messenger<
  typeof MOCK_ANY_NAMESPACE,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

/** Gnosis-like custom chain used by Core UX smoke tests. */
export const HARNESS_CUSTOM_CHAIN_ID = '0x64' as Hex;

/** Selected EVM account used when seeding TokensController state. */
export const HARNESS_ACCOUNT_ADDRESS =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

export const HARNESS_CUSTOM_NETWORK_FIELDS: AddNetworkFields = {
  chainId: HARNESS_CUSTOM_CHAIN_ID,
  name: 'Gnosis',
  nativeCurrency: 'xDAI',
  blockExplorerUrls: ['https://gnosisscan.io'],
  defaultBlockExplorerUrlIndex: 0,
  defaultRpcEndpointIndex: 0,
  rpcEndpoints: [
    {
      url: 'https://rpc.gnosischain.com',
      type: RpcEndpointType.Custom,
    },
  ],
};

/** Seeded mainnet token — must survive custom-network removal. */
export const HARNESS_MAINNET_TOKEN = {
  address: '0x1111111111111111111111111111111111111111',
  symbol: 'MAIN',
  decimals: 18,
  aggregators: [] as string[],
};

/** Seeded custom-chain token — wiped when 0x64 is removed. */
export const HARNESS_CUSTOM_TOKEN = {
  address: '0x2222222222222222222222222222222222222222',
  symbol: 'GNO',
  decimals: 18,
  aggregators: [] as string[],
};

export interface NetworksIntegrationHarnessOptions {
  /** When true, also seeds Polygon (0x89) via addNetwork. */
  seedPolygon?: boolean;
}

export interface NetworksIntegrationHarness {
  networkController: NetworkController;
  networkEnablementController: NetworkEnablementController;
  multichainNetworkController: MultichainNetworkController;
  tokensController: TokensController;
  rootMessenger: NetworksHarnessRootMessenger;
  mocks: {
    fetch: jest.Mock;
    fetchNetworkActivity: jest.Mock;
  };
  /** Convenience: add the harness custom chain (0x64). */
  addCustomNetwork: () => ReturnType<NetworkController['addNetwork']>;
  /** Convenience: remove the harness custom chain (0x64). */
  removeCustomNetwork: () => void;
}

const INFURA_PROJECT_ID = '00000000000000000000000000000000';

const HARNESS_ACCOUNT = {
  id: 'networks-harness-account',
  address: HARNESS_ACCOUNT_ADDRESS,
  type: 'eip155:eoa',
  options: {},
  methods: [],
  scopes: ['eip155:0'],
  metadata: {
    name: 'Harness Account',
    importTime: 0,
    keyring: { type: 'HD Key Tree' },
  },
} as const;

const POLYGON_NETWORK_FIELDS: AddNetworkFields = {
  chainId: '0x89',
  name: 'Polygon Mainnet',
  nativeCurrency: 'POL',
  blockExplorerUrls: ['https://polygonscan.com'],
  defaultBlockExplorerUrlIndex: 0,
  defaultRpcEndpointIndex: 0,
  rpcEndpoints: [
    {
      url: 'https://polygon-rpc.com',
      type: RpcEndpointType.Custom,
    },
  ],
};

function createMockFetch(): jest.Mock {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
  }));
}

function buildSeededTokensState(): Partial<TokensControllerState> {
  return {
    allTokens: {
      '0x1': {
        [HARNESS_ACCOUNT_ADDRESS]: [HARNESS_MAINNET_TOKEN],
      },
      [HARNESS_CUSTOM_CHAIN_ID]: {
        [HARNESS_ACCOUNT_ADDRESS]: [HARNESS_CUSTOM_TOKEN],
      },
    },
    allIgnoredTokens: {},
    allDetectedTokens: {},
  };
}

export function buildNetworksIntegrationHarness(
  options: NetworksIntegrationHarnessOptions = {},
): NetworksIntegrationHarness {
  const { seedPolygon = false } = options;

  const fetchMock = createMockFetch();
  const fetchNetworkActivity = jest.fn().mockResolvedValue({});
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const rootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  }) as NetworksHarnessRootMessenger;

  // Stub handlers that NetworkController / MultichainNetworkController /
  // TokensController call via the root messenger during construction.
  rootMessenger.registerActionHandler(
    'ConnectivityController:getState',
    () =>
      ({
        connectivityStatus: 'online',
      }) as never,
  );
  rootMessenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    () =>
      ({
        remoteFeatureFlags: {},
      }) as never,
  );
  rootMessenger.registerActionHandler(
    'AccountsController:listMultichainAccounts',
    () => [] as never,
  );
  rootMessenger.registerActionHandler(
    'AccountsController:getSelectedAccount',
    () => HARNESS_ACCOUNT as never,
  );
  rootMessenger.registerActionHandler(
    'AccountsController:getAccount',
    () => HARNESS_ACCOUNT as never,
  );
  rootMessenger.registerActionHandler(
    'AccountsController:listAccounts',
    () => [HARNESS_ACCOUNT] as never,
  );
  rootMessenger.registerActionHandler(
    'ApprovalController:addRequest',
    async () => undefined as never,
  );

  // --- NetworkController -------------------------------------------------
  // Child messenger with parent=root: NC registers its actions/events on
  // the parent automatically (no manual forward needed).
  const networkControllerMessenger = new Messenger({
    namespace: 'NetworkController',
    parent: rootMessenger,
  }) as NetworkControllerMessenger;

  rootMessenger.delegate({
    messenger: networkControllerMessenger,
    actions: [
      'ConnectivityController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: ['RemoteFeatureFlagController:stateChange'],
  });

  const networkController = new NetworkController({
    messenger: networkControllerMessenger,
    infuraProjectId: INFURA_PROJECT_ID,
  });

  // --- MultichainNetworkController ---------------------------------------
  // Mirror production getMultichainNetworkControllerMessenger, plus the
  // extra NetworkController actions in MNC's AllowedActions type.
  const multichainNetworkMessenger = new Messenger({
    namespace: 'MultichainNetworkController',
    parent: rootMessenger,
  }) as MultichainNetworkControllerMessenger;

  rootMessenger.delegate({
    messenger: multichainNetworkMessenger,
    actions: [
      'NetworkController:getState',
      'NetworkController:setActiveNetwork',
      'NetworkController:getSelectedChainId',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:removeNetwork',
      'AccountsController:listMultichainAccounts',
    ],
    events: ['AccountsController:selectedAccountChange'],
  });

  const multichainNetworkController = new MultichainNetworkController({
    messenger: multichainNetworkMessenger,
    networkService: {
      fetchNetworkActivity,
    } as never,
  });

  // --- NetworkEnablementController ---------------------------------------
  // Mirror production getNetworkEnablementControllerMessenger.
  const networkEnablementMessenger = new Messenger({
    namespace: 'NetworkEnablementController',
    parent: rootMessenger,
  }) as NetworkEnablementControllerMessenger;

  rootMessenger.delegate({
    messenger: networkEnablementMessenger,
    actions: [
      'NetworkController:getState',
      'MultichainNetworkController:getState',
    ],
    events: [
      'NetworkController:networkAdded',
      'NetworkController:networkRemoved',
      'NetworkController:stateChange',
      'TransactionController:transactionSubmitted',
    ],
  });

  const networkEnablementController = new NetworkEnablementController({
    messenger: networkEnablementMessenger,
  });

  // --- TokensController --------------------------------------------------
  // Mirror production getTokensControllerMessenger. Seeded allTokens prove
  // the NC remove → TokensController wipe seam (UX-NET-TOKEN-WIPE).
  const tokensControllerMessenger = new Messenger({
    namespace: 'TokensController',
    parent: rootMessenger,
  }) as TokensControllerMessenger;

  rootMessenger.delegate({
    messenger: tokensControllerMessenger,
    actions: [
      'ApprovalController:addRequest',
      'NetworkController:getNetworkClientById',
      'AccountsController:getAccount',
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
    ],
    events: [
      'NetworkController:networkDidChange',
      'NetworkController:stateChange',
      'AccountsController:selectedEvmAccountChange',
      'KeyringController:accountRemoved',
    ],
  });

  const tokensController = new TokensController({
    chainId: '0x1',
    provider: {} as never,
    messenger: tokensControllerMessenger,
    tokenListService: {
      fetchTokensByChainId: jest.fn().mockResolvedValue({}),
    } as never,
    state: buildSeededTokensState(),
    isDeprecated: () => false,
  });

  if (seedPolygon) {
    networkController.addNetwork(POLYGON_NETWORK_FIELDS);
  }

  const addCustomNetwork = () =>
    networkController.addNetwork(HARNESS_CUSTOM_NETWORK_FIELDS);

  const removeCustomNetwork = () => {
    networkController.removeNetwork(HARNESS_CUSTOM_CHAIN_ID);
  };

  return {
    networkController,
    networkEnablementController,
    multichainNetworkController,
    tokensController,
    rootMessenger,
    mocks: {
      fetch: fetchMock,
      fetchNetworkActivity,
    },
    addCustomNetwork,
    removeCustomNetwork,
  };
}
