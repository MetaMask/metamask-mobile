import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

/**
 * Reusable network enablement maps.
 * Keys inside each namespace use hex chain IDs, not CAIP format.
 */
export const ENABLED_NETWORKS = {
  ALL_POPULAR: {
    eip155: {
      '0x1': true,
      '0x89': true,
      '0xe708': true,
      '0xa4b1': true,
    },
    solana: {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
    },
    bip122: {
      'bip122:000000000019d6689c085ae165831e93': true,
    },
  },
  ETHEREUM_ONLY: {
    eip155: {
      '0x1': true,
    },
  },
} as const;

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

// ─── Token List Preset ───────────────────────────────────────

interface InitialStateTokenListOptions
  extends InitialStateNetworkManagerOptions {
  /** Token fixtures to seed on Ethereum. Defaults to USDC. */
  ethereumTokens?: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  }[];
  /** Token balance hex values keyed by token address. */
  tokenBalances?: Record<string, string>;
}

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

/**
 * Preset for token list view tests.
 * Extends the network manager preset with token data across multiple networks
 * and all controllers required to render the Tokens component without crashes.
 */
export const initialStateTokenList = (
  options?: InitialStateTokenListOptions,
) => {
  const ethereumTokens = options?.ethereumTokens ?? [
    {
      address: USDC_ADDRESS,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ];
  const tokenBalances = options?.tokenBalances ?? {
    [USDC_ADDRESS]: '0x2540BE400', // 10000 USDC
  };

  return initialStateNetworkManager({
    enabledNetworks: options?.enabledNetworks,
    activeEvmChainId: options?.activeEvmChainId,
    includeCustomNetworks: options?.includeCustomNetworks ?? true,
  })
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalSmartTransactions()
    .withOverrides({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                [DEFAULT_ADDRESS]: {
                  address: DEFAULT_ADDRESS,
                  balance: '0x8AC7230489E80000', // 10 ETH
                },
              },
              '0x89': {
                [DEFAULT_ADDRESS]: {
                  address: DEFAULT_ADDRESS,
                  balance: '0x8AC7230489E80000', // 10 POL
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [DEFAULT_ADDRESS]: ethereumTokens.map((t) => ({
                  address: t.address,
                  symbol: t.symbol,
                  name: t.name,
                  decimals: t.decimals,
                  image: '',
                })),
              },
              '0x89': {
                [DEFAULT_ADDRESS]: [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          TokenBalancesController: {
            tokenBalances: {
              [DEFAULT_ADDRESS]: {
                '0x1': tokenBalances,
              },
            },
          },
          TokenRatesController: {
            marketData: {
              '0x1': Object.fromEntries(
                ethereumTokens.map((t) => [
                  t.address,
                  {
                    tokenAddress: t.address,
                    currency: 'ETH',
                    price: 0.0005,
                  },
                ]),
              ),
            },
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000, usdConversionRate: 2000 },
              POL: { conversionRate: 0.5, usdConversionRate: 0.5 },
            },
          },
          MultichainAssetsController: {
            accountsAssets: {},
            assetsMetadata: {},
            allIgnoredAssets: {},
          },
          MultichainBalancesController: { balances: {} },
          MultichainAssetsRatesController: { conversionRates: {} },
          MultichainTransactionsController: { nonEvmTransactions: {} },
          NftController: { allNfts: {}, allNftContracts: {} },
          AssetsController: {
            assets: {},
            assetsBalance: {},
            assetsInfo: {},
            assetsPrice: {},
            customAssets: {},
            assetPreferences: {},
          },
          TransactionPayController: { transactionData: {} },
          ApprovalController: {
            pendingApprovals: {},
            pendingApprovalCount: 0,
          },
          EarnController: {
            lastUpdated: 0,
            pooled_staking: { isEligible: false },
            lending: { positions: [], markets: [] },
          },
        },
      },
      settings: {
        hideZeroBalanceTokens: false,
      },
    } as unknown as DeepPartial<RootState>);
};
