/*
 * Networks integration-test harness (Shape A).
 *
 * Owns messenger wiring for real NetworkController /
 * NetworkEnablementController / MultichainNetworkController and a
 * `buildNetworksIntegrationHarness()` factory.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - NetworkController — addNetwork / removeNetwork / in-memory configs
 *   - NetworkEnablementController — enablement map (listens to networkAdded)
 *   - MultichainNetworkController — constructed for Shape B reuse
 *
 * MOCKED (the I/O boundary — never makes real network calls):
 *   - global fetch (Slip44 / MultichainNetworkService / RPC)
 *   - MultichainNetworkService.fetchNetworkActivity
 *   - ConnectivityController:getState / RemoteFeatureFlagController:getState
 *     messenger handlers (required by NetworkController constructor)
 *   - AccountsController:listMultichainAccounts
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

export interface NetworksIntegrationHarnessOptions {
  /** When true, also seeds Polygon (0x89) via addNetwork. */
  seedPolygon?: boolean;
}

export interface NetworksIntegrationHarness {
  networkController: NetworkController;
  networkEnablementController: NetworkEnablementController;
  multichainNetworkController: MultichainNetworkController;
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
  // NetworkEnablementController call via the root messenger.
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
    'ConfigRegistryController:getState',
    () =>
      ({
        configs: { networks: {} },
      }) as never,
  );
  rootMessenger.registerActionHandler(
    'AccountsController:listMultichainAccounts',
    () => [] as never,
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
  // Mirror the NetworkEnablementController messenger that @metamask/wallet
  // builds.
  const networkEnablementMessenger = new Messenger({
    namespace: 'NetworkEnablementController',
    parent: rootMessenger,
  }) as NetworkEnablementControllerMessenger;

  rootMessenger.delegate({
    messenger: networkEnablementMessenger,
    actions: [
      'ConfigRegistryController:getState',
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
    rootMessenger,
    mocks: {
      fetch: fetchMock,
      fetchNetworkActivity,
    },
    addCustomNetwork,
    removeCustomNetwork,
  };
}
