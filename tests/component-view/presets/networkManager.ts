import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface InitialStateNetworkManagerOptions {
  /** Which networks are enabled in the filter. Defaults to Ethereum only. */
  enabledNetworks?: Record<string, Record<string, boolean>>;
  /** Active EVM chain ID (hex). Defaults to '0x1' (mainnet). */
  activeEvmChainId?: string;
  /** Whether to include custom/testnet networks. */
  includeCustomNetworks?: boolean;
}

const DEFAULT_ADDRESS = '0x0000000000000000000000000000000000000001';

/**
 * Popular network configurations matching the E2E FixtureBuilder.withPopularNetworks().
 * Keyed by hex chain ID.
 */
const POPULAR_NETWORK_CONFIGS: Record<string, unknown> = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Main Network',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
        type: 'infura',
        name: 'Ethereum Mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
  },
  '0x89': {
    chainId: '0x89',
    name: 'Polygon Mainnet',
    nativeCurrency: 'POL',
    rpcEndpoints: [
      {
        networkClientId: 'polygon',
        url: 'https://polygon-rpc.com',
        type: 'custom',
        name: 'Polygon Mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://polygonscan.com'],
    defaultBlockExplorerUrlIndex: 0,
  },
  '0xe708': {
    chainId: '0xe708',
    name: 'Linea Main Network',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'linea-mainnet',
        url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
        type: 'infura',
        name: 'Linea Mainnet',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://lineascan.build'],
    defaultBlockExplorerUrlIndex: 0,
  },
  '0xa4b1': {
    chainId: '0xa4b1',
    name: 'Arbitrum One',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'arbitrum',
        url: 'https://arb1.arbitrum.io/rpc',
        type: 'custom',
        name: 'Arbitrum One',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://arbiscan.io'],
    defaultBlockExplorerUrlIndex: 0,
  },
};

const CUSTOM_NETWORK_CONFIGS: Record<string, unknown> = {
  '0xaa36a7': {
    chainId: '0xaa36a7',
    name: 'Ethereum Sepolia',
    nativeCurrency: 'SepoliaETH',
    rpcEndpoints: [
      {
        networkClientId: 'sepolia',
        url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
        type: 'infura',
        name: 'Sepolia',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    defaultBlockExplorerUrlIndex: 0,
  },
  '0x539': {
    chainId: '0x539',
    name: 'Localhost 8545',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'localhost',
        url: 'http://localhost:8545',
        type: 'custom',
        name: 'Localhost 8545',
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: [],
    defaultBlockExplorerUrlIndex: 0,
  },
};

/**
 * Preset for NetworkManager / NetworkMultiSelector view tests.
 * Sets up popular + optional custom network configurations and
 * network enablement state.
 */
export const initialStateNetworkManager = (
  options?: InitialStateNetworkManagerOptions,
) => {
  const activeEvmChainId = options?.activeEvmChainId ?? '0x1';
  const includeCustomNetworks = options?.includeCustomNetworks ?? false;

  const networkConfigsByChainId = {
    ...POPULAR_NETWORK_CONFIGS,
    ...(includeCustomNetworks ? CUSTOM_NETWORK_CONFIGS : {}),
  };

  // Default: only Ethereum enabled.
  // Keys inside each namespace use hex chain IDs (e.g., '0x1'), NOT CAIP format.
  const enabledNetworks = options?.enabledNetworks ?? {
    eip155: {
      '0x1': true,
    },
  };

  // Find the networkClientId for the active chain
  const activeConfig = networkConfigsByChainId[activeEvmChainId] as
    | { rpcEndpoints: { networkClientId: string }[] }
    | undefined;
  const activeNetworkClientId =
    activeConfig?.rpcEndpoints[0]?.networkClientId ?? 'mainnet';

  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMultichainNetwork(true)
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: activeNetworkClientId,
            networksMetadata: {
              [activeNetworkClientId]: {
                status: 'available',
                EIPS: { 1559: true },
              },
            },
            networkConfigurationsByChainId: networkConfigsByChainId,
          },
          MultichainNetworkController: {
            isEvmSelected: true,
            selectedMultichainNetworkChainId: 'eip155:1',
            networksWithTransactionActivity: {},
          },
          NetworkEnablementController: {
            enabledNetworkMap: enabledNetworks,
          },
          PreferencesController: {
            tokenNetworkFilter: { [activeEvmChainId]: true },
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000, usdConversionRate: 2000 },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              [activeEvmChainId]: {
                [DEFAULT_ADDRESS]: {
                  address: DEFAULT_ADDRESS,
                  balance: '0x8AC7230489E80000',
                },
              },
            },
          },
          TokenBalancesController: { tokenBalances: {} },
          TokensController: {
            allTokens: {},
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
        },
      },
      settings: {
        basicFunctionalityEnabled: true,
      },
    } as unknown as DeepPartial<RootState>);

  return builder;
};
