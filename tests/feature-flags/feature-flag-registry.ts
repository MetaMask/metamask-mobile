/**
 * Feature Flag Registry
 *
 * Central source of truth for all feature flags used in MetaMask Mobile.
 * This registry tracks every remote feature flag with its production default
 * value, so E2E tests run against production-accurate flag configurations
 * unless a test explicitly overrides a specific flag.
 *
 * The global E2E mock (remoteFeatureFlagsHelper.ts) reads from this registry
 * to return production-accurate values when the app fetches flags at runtime.
 *
 * To override a flag in a test, use:
 * - `setupRemoteFeatureFlagsMock(mockServer, { flagName: value })` (mock override)
 * - `createRemoteFeatureFlagsMock({ flagName: value })` (create mock config)
 *
 * @see {@link https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=prod}
 */

import type { Json } from '@metamask/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Lifecycle status of a feature flag.
 */
export enum FeatureFlagStatus {
  /** Flag is actively used in production */
  Active = 'active',
  /** Flag is scheduled for removal */
  Deprecated = 'deprecated',
}

/**
 * Where the feature flag originates.
 */
export enum FeatureFlagType {
  /** Fetched from the client-config API at runtime */
  Remote = 'remote',
}

/**
 * A single entry in the feature flag registry.
 */
export interface FeatureFlagRegistryEntry {
  name: string;
  type: FeatureFlagType;
  inProd: boolean;
  productionDefault: Json;
  status: FeatureFlagStatus;
}

// ============================================================================
// Registry
// ============================================================================

/**
 * The feature flag registry.
 *
 * Each entry maps a flag name to its metadata and production default value.
 * Remote flag values are stored in the exact format returned by the production
 * client-config API, so they can be served directly by the E2E mock server.
 *
 * Production defaults last synced: 2026-03-02
 * Source: https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=prod
 */
export const FEATURE_FLAG_REGISTRY: Record<string, FeatureFlagRegistryEntry> = {
  addBitcoinAccountDummyFlag: {
    name: 'addBitcoinAccountDummyFlag',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  additionalNetworksBlacklist: {
    name: 'additionalNetworksBlacklist',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [],
    status: FeatureFlagStatus.Active,
  },

  aiSocialMarketAnalysisEnabled: {
    name: 'aiSocialMarketAnalysisEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '7.66.0',
    },
    status: FeatureFlagStatus.Active,
  },

  aiSocialWhatsHappeningEnabled: {
    name: 'aiSocialWhatsHappeningEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  assetsAccountApiBalances: {
    name: 'assetsAccountApiBalances',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      '0x1',
      '0xe708',
      '0x2105',
      '0x89',
      '0xa4b1',
      '0xa',
      '0x38',
    ],
    status: FeatureFlagStatus.Active,
  },

  assetsAccountApiV4MinimumVersion: {
    name: 'assetsAccountApiV4MinimumVersion',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: false,
    },
    status: FeatureFlagStatus.Active,
  },

  assetsDefiPositionsEnabled: {
    name: 'assetsDefiPositionsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  assetsEnableNotificationsByDefault: {
    name: 'assetsEnableNotificationsByDefault',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  assetsNftGridEnabled: {
    name: 'assetsNftGridEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  assetsNotificationsEnabled: {
    name: 'assetsNotificationsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  assetsUnifyState: {
    name: 'assetsUnifyState',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      featureVersion: null,
      minimumVersion: null,
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  backendWebSocketConnection: {
    name: 'backendWebSocketConnection',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      {
        scope: {
          value: 1,
          type: 'threshold',
        },
        value: true,
        name: 'feature is ON',
      },
      {
        name: 'feature is OFF',
        scope: {
          type: 'threshold',
          value: 0,
        },
        value: false,
      },
    ],
    status: FeatureFlagStatus.Active,
  },

  bitcoinAccounts: {
    name: 'bitcoinAccounts',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.59.0',
    },
    status: FeatureFlagStatus.Active,
  },

  bitcoinTestnetsEnabled: {
    name: 'bitcoinTestnetsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  bridgeConfig: {
    name: 'bridgeConfig',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      maxRefreshCount: 1,
      refreshRate: 3000000,
      support: false,
      chains: {},
    },
    status: FeatureFlagStatus.Active,
  },

  bridgeConfigV2: {
    name: 'bridgeConfigV2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      chainRanking: [
        {
          chainId: 'eip155:1',
          name: 'Ethereum',
        },
        {
          chainId: 'eip155:56',
          name: 'BNB',
        },
        {
          name: 'BTC',
          chainId: 'bip122:000000000019d6689c085ae165831e93',
        },
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'Solana',
        },
        {
          name: 'Tron',
          chainId: 'tron:728126428',
        },
        {
          name: 'Base',
          chainId: 'eip155:8453',
        },
        {
          chainId: 'eip155:42161',
          name: 'Arbitrum',
        },
        {
          name: 'Linea',
          chainId: 'eip155:59144',
        },
        {
          chainId: 'eip155:137',
          name: 'Polygon',
        },
        {
          chainId: 'eip155:43114',
          name: 'Avalanche',
        },
        {
          chainId: 'eip155:10',
          name: 'Optimism',
        },
        {
          chainId: 'eip155:143',
          name: 'Monad',
        },
        {
          chainId: 'eip155:1329',
          name: 'Sei',
        },
        {
          chainId: 'eip155:324',
          name: 'zkSync',
        },
      ],
      bip44DefaultPairs: {
        tron: {
          other: {},
          standard: {
            'tron:72812642/slip44:195':
              'tron:72812642/token:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          },
        },
        bip122: {
          other: {},
          standard: {
            'bip122:000000000019d6689c085ae165831e93/slip44:0':
              'eip155:1/slip44:60',
          },
        },
        eip155: {
          other: {},
          standard: {
            'eip155:1/slip44:60':
              'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          },
        },
        solana: {
          standard: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501':
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
          other: {},
        },
      },
      minimumVersion: '7.46.0',
      chains: {
        '1': {
          topAssets: [
            '0xaca92e438df0b2401ff60da7e4337b687a2435da',
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          ],
          isActiveDest: true,
          isActiveSrc: true,
          isGaslessSwapEnabled: true,
          isUnifiedUIEnabled: true,
          noFeeAssets: [],
        },
        '10': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '56': {
          isActiveSrc: true,
          isGaslessSwapEnabled: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '137': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '143': {
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '324': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '1329': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '8453': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '42161': {
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '43114': {
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '59144': {
          noFeeAssets: [],
          topAssets: [
            '0xaca92e438df0b2401ff60da7e4337b687a2435da',
            '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
          ],
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '728126428': {
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '20000000000001': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '1151111081099710': {
          topAssets: [
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
            'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
            '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxsDx8F8k8k3uYw1PDC',
            '3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y',
            '9zNQRsGLjNKwCUU5Gq5LR8beUCPzQMVMqKAi3SSZh54u',
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
            '21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump',
            'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
          ],
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          refreshRate: 10000,
        },
      },
      priceImpactThreshold: {
        gasless: 0.2,
        normal: 0.05,
      },
      quoteRequestOverrides: {
        perps: {
          noFee: true,
        },
      },
      maxRefreshCount: 5,
      support: true,
      sse: {
        enabled: true,
        minimumVersion: '7.59.0',
      },
      refreshRate: 30000,
    },
    status: FeatureFlagStatus.Active,
  },

  cardExperimentalSwitch2: {
    name: 'cardExperimentalSwitch2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.58.1',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  cardFeature: {
    name: 'cardFeature',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      chains: {
        'eip155:8453': {
          enabled: true,
          foxConnectAddresses: {
            global: '0xDaBDaFC43B2BC1c7D10C2BBce950A8CAd4a367F8',
            us: '0xDaBDaFC43B2BC1c7D10C2BBce950A8CAd4a367F8',
          },
          tokens: [
            {
              symbol: 'USDC',
              address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              decimals: 6,
              enabled: true,
              name: 'USD Coin',
            },
            {
              decimals: 6,
              enabled: true,
              name: 'Tether USD',
              symbol: 'USDT',
              address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
            },
            {
              address: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
              decimals: 6,
              enabled: true,
              name: 'Aave Base USDC',
              symbol: 'aUSDC',
            },
            {
              name: 'Wrapped Ether',
              symbol: 'WETH',
              address: '0x4200000000000000000000000000000000000006',
              decimals: 18,
              enabled: true,
            },
          ],
        },
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          enabled: true,
          tokens: [
            {
              decimals: 6,
              enabled: true,
              name: 'USDC',
              symbol: 'USDC',
              address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
            {
              address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
              decimals: 6,
              enabled: true,
              name: 'USDT',
              symbol: 'USDT',
            },
          ],
        },
        'eip155:59144': {
          tokens: [
            {
              name: 'USD Coin',
              symbol: 'USDC',
              address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
              decimals: 6,
              enabled: true,
            },
            {
              name: 'Tether USD',
              symbol: 'USDT',
              address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
              decimals: 6,
              enabled: true,
            },
            {
              symbol: 'WETH',
              address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
              decimals: 18,
              enabled: true,
              name: 'Wrapped Ether',
            },
            {
              enabled: true,
              name: 'EURe',
              symbol: 'EURe',
              address: '0x3ff47c5Bf409C86533FE1f4907524d304062428D',
              decimals: 18,
            },
            {
              name: 'GBPe',
              symbol: 'GBPe',
              address: '0x3Bce82cf1A2bc357F956dd494713Fe11DC54780f',
              decimals: 18,
              enabled: true,
            },
            {
              symbol: 'aUSDC',
              address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
              decimals: 6,
              enabled: true,
              name: 'Aave USDC',
            },
            {
              decimals: 6,
              enabled: true,
              name: 'MetaMask USD',
              symbol: 'mUSD',
              address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
            },
            {
              decimals: 6,
              enabled: true,
              name: 'Aave Linea mUSD',
              symbol: 'amUSD',
              address: '0x61B19879F4033c2b5682a969cccC9141e022823c',
            },
          ],
          balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
          enabled: true,
          foxConnectAddresses: {
            global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
            us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
          },
        },
      },
      constants: {
        accountsApiUrl: 'https://accounts.api.cx.metamask.io',
        onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
      },
    },
    status: FeatureFlagStatus.Active,
  },

  cardSupportedCountries: {
    name: 'cardSupportedCountries',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      'US-ID': true,
      'US-TN': true,
      'US-GA': true,
      'US-NH': true,
      SR: true,
      'US-ND': true,
      'CA-MB': true,
      'US-AL': true,
      'US-CO': true,
      ES: true,
      AT: true,
      CR: true,
      'US-TX': true,
      PE: true,
      PR: false,
      'US-OK': true,
      'CA-NB': true,
      GB: true,
      'US-CT': true,
      'US-MO': true,
      'US-NV': true,
      HN: true,
      CL: true,
      AD: true,
      'US-SC': true,
      BE: true,
      GR: true,
      LU: true,
      BG: true,
      CO: true,
      'CA-NU': true,
      IT: true,
      'US-WY': true,
      'US-WV': true,
      'US-RI': true,
      'US-VA': true,
      'US-NM': true,
      SV: true,
      UK: true,
      'US-NC': true,
      'US-FL': true,
      AR: true,
      'US-CA': true,
      'CA-BC': true,
      PA: true,
      IE: true,
      'CA-QC': true,
      'US-OR': true,
      MX: true,
      'CA-NS': true,
      'CA-PE': true,
      'US-ME': true,
      PT: true,
      'US-SD': true,
      'CA-NL': true,
      'US-AZ': true,
      'US-KS': true,
      FR: true,
      LI: true,
      'US-NY': true,
      DE: true,
      'US-MT': true,
      NL: true,
      'US-IL': true,
      SI: true,
      GT: true,
      DO: true,
      'US-IN': true,
      'US-LA': true,
      UY: true,
      HR: true,
      'US-AR': true,
      'US-MS': true,
      'US-WA': true,
      SE: true,
      'CA-YT': true,
      PL: true,
      MT: true,
      DK: true,
      'US-AK': true,
      NO: true,
      'US-VT': true,
      'US-UT': true,
      PY: true,
      BR: true,
      EC: true,
      'US-DC': true,
      'US-NE': true,
      'US-MI': true,
      'CA-AB': true,
      'US-DE': true,
      'US-MA': true,
      'CA-SK': true,
      'CA-NT': true,
      RO: true,
      CY: true,
      FI: true,
      'US-MN': true,
      CH: true,
      'US-PA': true,
      IM: true,
      SK: true,
      'US-KY': true,
      'CA-ON': true,
      GY: true,
      HU: true,
      'US-WI': true,
      'US-IA': true,
      NI: true,
      JE: true,
      'US-NJ': true,
      'US-OH': true,
      GG: true,
      GI: true,
      IS: true,
      'US-MD': true,
      'US-HI': true,
    },
    status: FeatureFlagStatus.Active,
  },

  carouselBanners: {
    name: 'carouselBanners',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  config_registry_api_enabled: {
    name: 'config_registry_api_enabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  confirmation_redesign: {
    name: 'confirmation_redesign',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      staking_confirmations: true,
      transfer: true,
      approve: true,
      contract_deployment: true,
      contract_interaction: true,
      signatures: true,
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_eip_7702: {
    name: 'confirmations_eip_7702',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      contracts: {
        '0x13882': [
          {
            name: 'Polygon Amoy Testnet',
            signature:
              '0x472bb78ebb6686ddf0bb2e75265e1f4266cd050f8b498e88f97e9380afd8bfbd169c4d3221ec8845cb81ba7e9ddb7de9b819a15617803e20aee2aaa07664b6c81b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x14a34': [
          {
            signature:
              '0xaed94ac035e745629423c547200eb2411fd7194d832a6b4cf459d3e3d34a6b62124e88640a0bf623146bdef63b0ce1c8797bd2a6c8357fab86c8be466744f55d1c',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Base Sepolia',
          },
        ],
        '0xa4b1': [
          {
            name: 'Arbitrum One',
            signature:
              '0xc3be82057efec197d92b0cbb7cef9d50dba0345646524687a3ae7235a8fcb1706ba79f197d45fcf4c6cfb5808ef70258c5f6bb29b7e3553a4b9660692eb5e81d1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0xaa36a7': [
          {
            name: 'Sepolia - Official',
            signature:
              '0x1aba1c0dafadab6663efdd6086764a9b9fa5ab5c002e88ebae85edea162fbc425c398b2b93afdc036503f12361c05a7ff0b409ee523d5277e0b4d0a840679e591c',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
          {
            address: '0xCd8D6C5554e209Fbb0deC797C6293cf7eAE13454',
            name: 'Sepolia - Testing',
            signature:
              '0x016cf109489c415ba28e695eb3cb06ac46689c5c49e2aba101d7ec2f68c890282563b324f5c8df5e0536994451825aa235438b7346e8c18b4e64161d990781891c',
          },
        ],
        '0x530': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Sei Testnet',
            signature:
              '0x91135fcd7bfb9e2456c227ff12905128c3854db36775278d47b96c3c669f730c4063e3a62d94884617769bbad2868f35d725cb3b611d9bd1231bceb5967724711c',
          },
        ],
        '0xaa044c': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Celo Sepolia',
            signature:
              '0x1590458cdfa10225e4fe734ed44deec95ac1887c877e63deb5ad35b41025c9ef2f33666cdd2c189b1999a78072ab9f8f122d93a52eaf12687fb2ff5b74d8de9f1c',
          },
        ],
        '0x8f': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Monad',
            signature:
              '0x12d31e58c92cdc29dac8af0405883b3b0ee44156d7fdf5c3c2ffa4138f2461cc20e7f8625431dbd24bb784407d1a1d9bdb75b191a6cf127eac68b67d13bd11e41c',
          },
        ],
        '0x13fb': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Citrea Testnet',
            signature:
              '0xf9e4aa35fc098468212352c2b9662022f9565bd713ca66e634c804f9820b5e0c266d710afba58aed00e5b7e24134dd9b52e2e331076de745137531a6d245a7521b',
          },
        ],
        '0x88bb0': [
          {
            signature:
              '0x23de8eb645a65b08721e5d2194063acead5f5f818474b7884ae767c7aaf9bb9b22233ab92684bc41087f8509e945d96083124ae1919a9357f2ae65267df4f0e21b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Hoodi Testnet',
          },
        ],
        '0xaa37dc': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Optimism Sepolia',
            signature:
              '0xa60cab833af6a8aa2dcc80d5e12d9e1566edb6cdf51c38e7cf43d441dac561007f05643e73e6b00107e18dbf15de98aae14192306276e92d654f62bd7c3023241c',
          },
        ],
        '0x3909': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Sonic Testnet',
            signature:
              '0xc092cc0bcf804f95eb659d281c00586bc72018a242d66fefacdc33a990faf99478c368612277cbbf72aee4a10b7ace6d8666f2c8c4fece9daada40cb360190631b',
          },
        ],
        '0x89': [
          {
            name: 'Polygon',
            signature:
              '0x302aa2d59940e88f35d2fa140fe6a1e9dc682218a444a7fb2d88f007fbe7792b2b8d615f5ae1e4f184533a02c47d8ac0f6ba3f591679295dff93c65095c0f03d1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x92': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Sonic Mainnet',
            signature:
              '0x9f2a94332f2b71bff8a772053f47dbb65e26e5286341be0a3c55270d5549351f1dddb7566be0619b0150d42d540b0847cb0acbd0ab118ff608a40a18400834711b',
          },
        ],
        '0xa4ba': [
          {
            signature:
              '0x818898e7f90f2f1f47dc7bec74dd683dfcc11efc7025d81f57644d366a3d9e442edb789731045ccb5ba89ee0d84bb517194bb9a097b152922bbd39ffd022ff421c',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Arbitrum Nova',
          },
        ],
        '0x82': [
          {
            signature:
              '0x54c423b1af4abbd1fb226e260dddba757acbcd8881e6b55b842c6b839874fa3f0e2f77685389ad5c28e096f12ef22557cebf6a77f6064baa071453a445a4c7d51c',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Unichain Mainnet',
          },
        ],
        '0x531': [
          {
            signature:
              '0xde089fc9af662bc4b0f873e4dc79760f6c3539f6f1cf32d9bc46baccf86ebae070a9062436f29ee86d04cc55699b27579f657922a2292ec2f1c5170d587917401b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Sei Mainnet',
          },
        ],
        '0x61': [
          {
            name: 'BNB Testnet',
            signature:
              '0x80aaf42c70b0b9efdf26e38ced69fce70f6b4f5496e7e59888819c14fb16290301ad049299d99e3650fa1a616a87bb80eb52ae9f02ddd8b53dd6b983275d0eb61b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x38': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'BNB',
            signature:
              '0x28ae371904b3ba71344e426c8de0e2cee0b8529a9510c059b412671655881ad646b8cf544342a5f8e0753eda83221e14e3c9dae5435417401f5fee8ee1d63dce1b',
          },
        ],
        '0x152': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Cronos Testnet',
            signature:
              '0x8fec0190a311f6ba5dc9df8d76fef3673e6c4081c087f779bca7e3247bb40a5070d393d29c6b268deb3fa231a138b7914b25395cd6dec0fdf4b2b7701975e78b1c',
          },
        ],
        '0xa4ec': [
          {
            name: 'Celo Mainnet',
            signature:
              '0x1421ea4d014170a4fc5d0559f267974f4aa095a6e6047b107eff1807afa425774775f796a52a90b767810eade3b5919087bb361651a7b8f4f9679f1f46adb60e1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x279f': [
          {
            name: 'Monad Testnet',
            signature:
              '0x85ec60e9dbac6404b66803b5abace8517ce1325bb6391b7d1ff8ec4433bbe62f4363031873a11ed79364290e196a47830fc36346a9aaf2e44518c1101496983c1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x66eee': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Arbitrum Sepolia',
            signature:
              '0x6fdb53ecf8f575b85ff9895277b1f8e11349970fbb42225fe41587a072bbcef43e8d54303c4e1aa38d44cae9ba2c8bf825e9e138176d6b09a729cd82a14356cf1b',
          },
        ],
        '0xa': [
          {
            signature:
              '0x60e12ffc04e098bd26a897ed2a974e4e255fc6db3b052fe3a2647372bfbac76f096bf5236510ddc217e12b802e08617cc27292d69ca51b0467ba91c6df74cd7b1c',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Optimism',
          },
        ],
        '0x18c6': [
          {
            signature:
              '0x6743135a8dfc8f58133d827b4997bc5316c8eb92883d2704a30b1d8a7bf494ce226b523e5f85a681eb5de8349c9564e62d389876d0e5fe5cc06fb9412d9d1cb61b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'MegaEth Testnet',
          },
        ],
        '0x1': [
          {
            signature:
              '0xffb37facfedf12f1e98b56203de1c855391b791a20ee361234c546f4b50eb11853283cfc311419049f0325ad0a806ec232cc519073e3b5d4ad59ff331964d2e71b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Mainnet',
          },
        ],
        '0x27d8': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Chiado',
            signature:
              '0x0ff531d6afcc191c3b3bdffc1596d9ce8d1d52fa500ea2097c0823820a66f97963b88b646d4d4edbc0f781127d7985b87132d89c62c3cb4ad42848ce289645fa1b',
          },
        ],
        '0x64': [
          {
            signature:
              '0xd0cfc2959c866e5218faf675f852e0c7021a454064e509d40256c5bec395e300381c19dcbec2e921b2f6d7d9a925a39dee8ea2e8dd8f595633b8dc333d91f1af1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Gnosis',
          },
        ],
        '0x19': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Cronos',
            signature:
              '0xa1856ef8c948b0a5204da687d53231848de2a585def9faac05c23c47412615dc476db943010164356b1d2ca8a8a66a8b0ae2d30c11b6b2aaf1cca116f0a333761c',
          },
        ],
        '0x138de': [
          {
            name: 'Berachain',
            signature:
              '0x2c2037ddedcdfb9b7d8ea7c546259eef371a86b0e3610192eb15ece0114c59d86134791cd9e9df4208bbbdc83776d80b30b1fea6bf1a05bb072575217492497a1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x515': [
          {
            name: 'Unichain Sepolia',
            signature:
              '0x64487330691a05700a2321ee1db4092adce9590e7aded6e489df024838ecec734c935d182f74883818cb7659d5c784163573afdf8221252fa68d960cbe1c312f1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x138c5': [
          {
            name: 'Berachain Testnet',
            signature:
              '0x66940bcb2c4b95ec2c1c1024fee1e3a8e51c8f072a52a9f0252a793604c8a6ba58ac3153d4dd041873d33eec349450c4a9acd51ddaed117bee448ed7a388208c1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
        '0x2105': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            name: 'Base',
            signature:
              '0xbdddd2e925cf2cc7e148d3c11b02c917995fba8f3a3dc0b73c0059d029feca88014e723b8a32b2310a60c5b1cc17dfb3ae180b5a39f1d3264f985314b9168e0a1c',
          },
        ],
      },
      name: 'main',
      supportedChains: [
        '0x1',
        '0x13882',
        '0x138c5',
        '0x138de',
        '0x13fb',
        '0x14a34',
        '0x152',
        '0x18c6',
        '0x19',
        '0x2105',
        '0x279f',
        '0x27d8',
        '0x38',
        '0x3909',
        '0x515',
        '0x530',
        '0x531',
        '0x61',
        '0x64',
        '0x66eee',
        '0x82',
        '0x88bb0',
        '0x89',
        '0x8f',
        '0x92',
        '0xa',
        '0xa4b1',
        '0xa4ba',
        '0xa4ec',
        '0xaa044c',
        '0xaa36a7',
        '0xaa37dc',
      ],
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_gas_buffer: {
    name: 'confirmations_gas_buffer',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      included: 1.5,
      perChainConfig: {
        '0xa4b1': {
          base: 1.2,
          name: 'arbitrum',
        },
        '0x18c6': {
          base: 1.3,
          name: 'megaeth',
        },
        '0x2105': {
          name: 'base',
          eip7702: 1.3,
        },
        '0x38': {
          eip7702: 1.3,
          name: 'bnb',
        },
        '0xa': {
          name: 'optimism',
          eip7702: 1.3,
        },
      },
      default: 1,
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_gas_fee_tokens: {
    name: 'confirmations_gas_fee_tokens',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      gasFeeTokens: {
        '0xa4b1': {
          tokens: [
            {
              address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
              name: 'ARB',
            },
            {
              address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
              name: 'USDT',
            },
            {
              address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              name: 'USDC',
            },
            {
              address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
              name: 'USDC.e',
            },
            {
              address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
              name: 'DAI',
            },
            {
              address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
              name: 'WETH',
            },
            {
              address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
              name: 'WBTC',
            },
            {
              address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
              name: 'USDe',
            },
            {
              name: 'USDS',
              address: '0x6491c05A82219b8D1479057361ff1654749b876b',
            },
            {
              address: '0xdDb46999F8891663a8F2828d25298f70416d7610',
              name: 'sUSDS',
            },
            {
              address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
              name: 'cbBTC',
            },
            {
              address: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe',
              name: 'weETH',
            },
            {
              address: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
              name: 'MIM',
            },
          ],
          name: 'Arbitrum Mainnet',
        },
        '0xe708': {
          name: 'Linea Mainnet',
          tokens: [
            {
              address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
              name: 'mUSD',
            },
            {
              address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
              name: 'USDT',
            },
            {
              address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
              name: 'USDC',
            },
            {
              name: 'DAI',
              address: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5',
            },
            {
              address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
              name: 'WETH',
            },
            {
              address: '0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4',
              name: 'wBTC',
            },
            {
              address: '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F',
              name: 'wstETH',
            },
          ],
        },
        '0x1': {
          name: 'Ethereum Mainnet',
          tokens: [
            {
              name: 'mUSD',
              address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
            },
            {
              address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
              name: 'USDT',
            },
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              name: 'USDC',
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              name: 'DAI',
            },
            {
              name: 'wETH',
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            },
            {
              address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
              name: 'wBTC',
            },
            {
              name: 'wstETH',
              address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
            },
            {
              address: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
              name: 'wSOL',
            },
            {
              address: '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD',
              name: 'sUSDS',
            },
            {
              address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
              name: 'cbBTC',
            },
            {
              address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
              name: 'rETH',
            },
            {
              address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
              name: 'weETH',
            },
          ],
        },
        '0x2105': {
          tokens: [
            {
              address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
              name: 'cbETH',
            },
            {
              address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              name: 'USDC',
            },
            {
              name: 'USDT',
              address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
            },
            {
              address: '0x820C137fa70C8691f0e44Dc420a5e53c168921Dc',
              name: 'USDS',
            },
            {
              name: 'DAI',
              address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
            },
            {
              address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
              name: 'wstETH',
            },
            {
              address: '0x4200000000000000000000000000000000000006',
              name: 'wETH',
            },
            {
              address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A',
              name: 'weETH.base',
            },
            {
              address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
              name: 'wBTC',
            },
            {
              address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
              name: 'cbBTC',
            },
            {
              address: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c',
              name: 'rETH',
            },
          ],
          name: 'Base Mainnet',
        },
        '0x38': {
          name: 'BNB Smart Chain',
          tokens: [
            {
              address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
              name: 'DAI',
            },
            {
              address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
              name: 'wBTC',
            },
            {
              address: '0x55d398326f99059fF775485246999027B3197955',
              name: 'USDT',
            },
            {
              address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
              name: 'USDC',
            },
            {
              address: '0x8965349fb649A33a30cbFDa057D8eC2C48AbE2A2',
              name: 'anyUSDC',
            },
            {
              address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
              name: 'wBNB',
            },
            {
              address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
              name: 'ETH',
            },
          ],
        },
        '0x89': {
          name: 'Polygon Mainnet',
          tokens: [
            {
              address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
              name: 'USDT0',
            },
            {
              address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
              name: 'USDC',
            },
            {
              address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
              name: 'USDC.e',
            },
            {
              name: 'DAI',
              address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
            },
            {
              name: 'WETH',
              address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
            },
            {
              address: '0xd93f7E271cB87c23AaA73edC008A79646d1F9912',
              name: 'wSOL',
            },
            {
              address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
              name: 'wBTC',
            },
            {
              name: 'rETH',
              address: '0x0266F4F08D82372CF0FcbCCc0Ff74309089c74d1',
            },
          ],
        },
      },
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_incoming_transactions: {
    name: 'confirmations_incoming_transactions',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_pay: {
    name: 'confirmations_pay',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      perpsWithdrawAnyToken: false,
      slippageTokens: {
        '0x89': {
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': 0.005,
          '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': 0.005,
          '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 0.005,
          '0x0000000000000000000000000000000000001010': 0.005,
          '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 0.005,
        },
        '0xa4b1': {
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 0.005,
          '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9': 0.005,
          '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': 0.005,
        },
        '0xe708': {
          '0xacA92E438df0B2401fF60dA7E4337B687a2435DA': 0.005,
          '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f': 0.005,
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x176211869cA2b568f2A7D4EE941E073a821EE1ff': 0.005,
          '0xA219439258ca9da29E9Cc4cE5596924745e12B93': 0.005,
        },
        '0x1': {
          '0xdAC17F958D2ee523a2206206994597C13D831ec7': 0.005,
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 0.005,
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 0.005,
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 0.005,
          '0xacA92E438df0B2401fF60dA7E4337B687a2435DA': 0.005,
        },
        '0x2105': {
          '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2': 0.005,
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x4200000000000000000000000000000000000006': 0.005,
          '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 0.005,
        },
        '0x38': {
          '0x0000000000000000000000000000000000000000': 0.005,
          '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c': 0.005,
          '0x2170Ed0880ac9A755fd29B2688956BD959F933F8': 0.005,
          '0x55d398326f99059fF775485246999027B3197955': 0.005,
          '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': 0.005,
        },
      },
      predictWithdrawAnyToken: true,
      slippage: 0.02,
      bufferInitial: 0.015,
      attemptsMax: 4,
      bufferStep: 0.015,
      relayDisabledGasStationChains: [],
      allowedPredictWithdrawTokens: {
        '0x89': [
          '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          '0x0000000000000000000000000000000000000000',
          '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        ],
        '0x1': [
          '0x0000000000000000000000000000000000000000',
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ],
        '0x38': [
          '0x0000000000000000000000000000000000000000',
          '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        ],
      },
      relayFallbackGas: {
        estimate: '900001',
        max: '1500001',
      },
      relayQuoteUrl: 'https://bridge.dev-api.cx.metamask.io/relay/quote',
      bufferSubsequent: 0.05,
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_pay_post_quote: {
    name: 'confirmations_pay_post_quote',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      versions: {
        '7.67.0': {
          overrides: {
            perpsWithdraw: {
              enabled: false,
            },
            predictWithdraw: {
              enabled: false,
              tokens: {
                '0x1': [
                  '0x0000000000000000000000000000000000000000',
                  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
                ],
                '0x2105': [
                  '0x0000000000000000000000000000000000000000',
                  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                ],
                '0x38': [
                  '0x0000000000000000000000000000000000000000',
                  '0x55d398326f99059fF775485246999027B3197955',
                  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                ],
                '0x89': [
                  '0x0000000000000000000000000000000000000000',
                  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
                ],
                '0xa4b1': ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
                '0xe708': ['0xacA92E438df0B2401fF60dA7E4337B687a2435DA'],
              },
            },
          },
          default: {
            enabled: false,
            tokens: {},
          },
        },
      },
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_pay_tokens: {
    name: 'confirmations_pay_tokens',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  confirmations_transactions: {
    name: 'confirmations_transactions',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      gasFeeRandomisation: {
        randomisedGasFeeDigits: {
          '0x2105': 5,
        },
      },
      timeoutAttempts: {
        perChainConfig: {
          '0xa4b1': 100,
        },
        default: 30,
      },
      acceleratedPolling: {
        defaultCountMax: 10,
        defaultIntervalMs: 3000,
        perChainConfig: {
          '0xcc': {
            blockTime: 1000,
            chainId: '204',
            countMax: 10,
            intervalMs: 700,
            name: 'OPBNB',
          },
          '0x8f': {
            name: 'MONAD',
            blockTime: 500,
            chainId: '143',
            countMax: 15,
            intervalMs: 500,
          },
          '0x813df': {
            intervalMs: 500,
            name: 'LAYER_K',
            blockTime: 250,
            chainId: '529375',
            countMax: 15,
          },
          '0x13e31': {
            blockTime: 2000,
            chainId: '81457',
            countMax: 10,
            intervalMs: 1300,
            name: 'BLAST',
          },
          '0xbde31': {
            countMax: 15,
            intervalMs: 500,
            name: 'WINR',
            blockTime: 250,
            chainId: '777777',
          },
          '0xa867': {
            name: 'HEMI',
            blockTime: 1200,
            chainId: '43111',
            countMax: 10,
            intervalMs: 800,
          },
          '0xa4ba': {
            blockTime: 250,
            chainId: '42170',
            countMax: 15,
            intervalMs: 500,
            name: 'ARBITRUM_NOVA',
          },
          '0x1142c': {
            chainId: '70700',
            countMax: 15,
            intervalMs: 500,
            name: 'PROOF_OF_PLAY_APEX',
            blockTime: 250,
          },
          '0xa3c3': {
            chainId: '41923',
            countMax: 15,
            intervalMs: 500,
            name: 'EDUCHAIN',
            blockTime: 250,
          },
          '0x28c58': {
            countMax: 10,
            intervalMs: 3000,
            name: 'TAIKO',
            blockTime: 6000,
            chainId: '167000',
          },
          '0x1388': {
            countMax: 10,
            intervalMs: 1300,
            name: 'MANTLE',
            blockTime: 2000,
            chainId: '5000',
          },
          '0x18232': {
            countMax: 15,
            intervalMs: 500,
            name: 'PLUME',
            blockTime: 667,
            chainId: '98866',
          },
          '0x16fd8': {
            chainId: '94168',
            countMax: 15,
            intervalMs: 500,
            name: 'LUMITERRA',
            blockTime: 250,
          },
          '0x2eb': {
            name: 'FLOW',
            blockTime: 1000,
            chainId: '747',
            countMax: 10,
            intervalMs: 700,
          },
          '0xe705': {
            chainId: '59141',
            countMax: 10,
            intervalMs: 1300,
            name: 'LINEA_SEPOLIA',
            blockTime: 2000,
          },
          '0x13a43': {
            intervalMs: 500,
            name: 'GEO_GENESIS',
            blockTime: 250,
            chainId: '80451',
            countMax: 15,
          },
          '0x99797f': {
            name: 'SPOTLIGHT',
            blockTime: 250,
            chainId: '10058111',
            countMax: 15,
            intervalMs: 500,
          },
          '0x123': {
            name: 'ORDERLY',
            blockTime: 2000,
            chainId: '291',
            countMax: 10,
            intervalMs: 1300,
          },
          '0xaa37dc': {
            blockTime: 2000,
            chainId: '11155420',
            countMax: 10,
            intervalMs: 1300,
            name: 'OPTIMISM_SEPOLIA',
          },
          '0x61': {
            blockTime: 333,
            chainId: '97',
            countMax: 15,
            intervalMs: 500,
            name: 'BNB_TESTNET',
          },
          '0x7cc': {
            blockTime: 250,
            chainId: '1996',
            countMax: 15,
            intervalMs: 500,
            name: 'SANKO',
          },
          '0x82': {
            blockTime: 2000,
            chainId: '130',
            countMax: 10,
            intervalMs: 1300,
            name: 'UNICHAIN',
          },
          '0x1b254': {
            chainId: '111188',
            countMax: 15,
            intervalMs: 500,
            name: 'REAL',
            blockTime: 250,
          },
          '0x2105': {
            name: 'BASE',
            blockTime: 2000,
            chainId: '8453',
            countMax: 10,
            intervalMs: 1300,
          },
          '0xaa36a7': {
            name: 'ETHEREUM_SEPOLIA',
            blockTime: 12000,
            chainId: '11155111',
            countMax: 10,
            intervalMs: 3000,
          },
          '0xa4b1': {
            name: 'ARBITRUM_ONE',
            blockTime: 250,
            chainId: '42161',
            countMax: 15,
            intervalMs: 500,
          },
          '0x88bb0': {
            countMax: 10,
            intervalMs: 3000,
            name: 'HOODI',
            blockTime: 12000,
            chainId: '560048',
          },
          '0x6c1': {
            countMax: 15,
            intervalMs: 500,
            name: 'REYA',
            blockTime: 250,
            chainId: '1729',
          },
          '0x13881': {
            countMax: 10,
            intervalMs: 1300,
            name: 'POLYGON_MUMBAI',
            blockTime: 2000,
            chainId: '80001',
          },
          '0x8274f': {
            name: 'SCROLL_SEPOLIA',
            blockTime: 4667,
            chainId: '534351',
            countMax: 10,
            intervalMs: 3000,
          },
          '0x725': {
            blockTime: 250,
            chainId: '1829',
            countMax: 15,
            intervalMs: 500,
            name: 'PLAYBLOCK',
          },
          '0xa9': {
            countMax: 10,
            intervalMs: 1300,
            name: 'MANTA',
            blockTime: 2000,
            chainId: '169',
          },
          '0x18c6': {
            countMax: 10,
            intervalMs: 2700,
            name: 'MEGAETH_TESTNET',
            blockTime: 4000,
            chainId: '6342',
          },
          '0x14a34': {
            name: 'BASE_SEPOLIA_TESTNET',
            blockTime: 250,
            chainId: '84532',
            countMax: 15,
            intervalMs: 500,
          },
          '0x171': {
            countMax: 10,
            intervalMs: 3000,
            name: 'PULSECHAIN',
            blockTime: 10000,
            chainId: '369',
          },
          '0x1713c': {
            blockTime: 250,
            chainId: '94524',
            countMax: 15,
            intervalMs: 500,
            name: 'IDEX',
          },
          '0xe708': {
            blockTime: 2000,
            chainId: '59144',
            countMax: 10,
            intervalMs: 1300,
            name: 'LINEA',
          },
          '0x38': {
            intervalMs: 700,
            name: 'BNB',
            blockTime: 1000,
            chainId: '56',
            countMax: 10,
          },
          '0xd7cc': {
            chainId: '55244',
            countMax: 15,
            intervalMs: 500,
            name: 'SUPERPOSITION',
            blockTime: 250,
          },
          '0x46f': {
            chainId: '1135',
            countMax: 10,
            intervalMs: 1300,
            name: 'LISK',
            blockTime: 2000,
          },
          '0x98967f': {
            chainId: '9999999',
            countMax: 15,
            intervalMs: 500,
            name: 'FLUENCE',
            blockTime: 250,
          },
          '0x88b': {
            blockTime: 250,
            chainId: '2187',
            countMax: 15,
            intervalMs: 500,
            name: 'GAME7',
          },
          '0xe8': {
            countMax: 10,
            intervalMs: 3000,
            name: 'LENS',
            blockTime: 48333,
            chainId: '232',
          },
          '0x34a1': {
            intervalMs: 1300,
            name: 'IMMUTABLE_TESTNET',
            blockTime: 2000,
            chainId: '13473',
            countMax: 10,
          },
          '0x1ecf': {
            name: 'KINTO',
            blockTime: 250,
            chainId: '7887',
            countMax: 15,
            intervalMs: 500,
          },
          '0x82750': {
            chainId: '534352',
            countMax: 10,
            intervalMs: 2000,
            name: 'SCROLL',
            blockTime: 3000,
          },
          '0x13f8': {
            blockTime: 2000,
            chainId: '5112',
            countMax: 10,
            intervalMs: 1300,
            name: 'HAM',
          },
          '0x3023': {
            name: 'HUDDLE01',
            blockTime: 250,
            chainId: '12323',
            countMax: 15,
            intervalMs: 500,
          },
          '0xa6': {
            blockTime: 1667,
            chainId: '166',
            countMax: 10,
            intervalMs: 1100,
            name: 'OMNI',
          },
          '0x42af': {
            name: 'ONCHAIN_POINTS',
            blockTime: 250,
            chainId: '17071',
            countMax: 15,
            intervalMs: 500,
          },
          '0x138de': {
            chainId: '80094',
            countMax: 10,
            intervalMs: 1300,
            name: 'BERACHAIN',
            blockTime: 2000,
          },
          '0xe4': {
            chainId: '228',
            countMax: 15,
            intervalMs: 500,
            name: 'MIND',
            blockTime: 250,
          },
          '0xd0d0': {
            countMax: 15,
            intervalMs: 500,
            name: 'DODO',
            blockTime: 250,
            chainId: '53456',
          },
          '0xb5f': {
            chainId: '2911',
            countMax: 15,
            intervalMs: 500,
            name: 'HYTOPIA',
            blockTime: 250,
          },
          '0x13882': {
            name: 'POLYGON_AMOY',
            blockTime: 2000,
            chainId: '80002',
            countMax: 10,
            intervalMs: 1300,
          },
          '0x9dd': {
            blockTime: 250,
            chainId: '2525',
            countMax: 15,
            intervalMs: 500,
            name: 'INEVM',
          },
          '0x15b43': {
            countMax: 15,
            intervalMs: 500,
            name: 'UNITE',
            blockTime: 250,
            chainId: '88899',
          },
          '0x142b6': {
            countMax: 15,
            intervalMs: 500,
            name: 'VEMP',
            blockTime: 250,
            chainId: '82614',
          },
          '0x515': {
            chainId: '1301',
            countMax: 10,
            intervalMs: 1300,
            name: 'UNICHAIN_SEPOLIA',
            blockTime: 2000,
          },
          '0x27bc86aa': {
            blockTime: 250,
            chainId: '666666666',
            countMax: 15,
            intervalMs: 500,
            name: 'DEGEN_CHAIN',
          },
          '0x3bd': {
            blockTime: 2000,
            chainId: '957',
            countMax: 10,
            intervalMs: 1300,
            name: 'LYRA',
          },
          '0x2611': {
            blockTime: 1000,
            chainId: '9745',
            countMax: 10,
            intervalMs: 700,
            name: 'PLASMA',
          },
          '0x34fb5e38': {
            countMax: 10,
            intervalMs: 1300,
            name: 'ANXIENT8',
            blockTime: 2000,
            chainId: '888888888',
          },
          '0x9c4400': {
            countMax: 15,
            intervalMs: 500,
            name: 'ALIENX',
            blockTime: 250,
            chainId: '10241024',
          },
          '0xfc': {
            name: 'FRAXTAL',
            blockTime: 2000,
            chainId: '252',
            countMax: 10,
            intervalMs: 1300,
          },
          '0x2a': {
            chainId: '42',
            countMax: 10,
            intervalMs: 2700,
            name: 'LUKSO',
            blockTime: 4000,
          },
          '0x11c3': {
            countMax: 15,
            intervalMs: 500,
            name: 'TRUMPCHAIN',
            blockTime: 250,
            chainId: '4547',
          },
          '0xe35': {
            name: 'BOTANIX',
            blockTime: 4333,
            chainId: '3637',
            countMax: 10,
            intervalMs: 2900,
          },
          '0x16876': {
            countMax: 15,
            intervalMs: 500,
            name: 'MIRACLE',
            blockTime: 250,
            chainId: '92278',
          },
          '0x19': {
            chainId: '25',
            countMax: 15,
            intervalMs: 500,
            name: 'CRONOS',
            blockTime: 667,
          },
          '0x13bf8': {
            countMax: 15,
            intervalMs: 500,
            name: 'ONYX',
            blockTime: 250,
            chainId: '80888',
          },
          '0x62ef': {
            blockTime: 250,
            chainId: '25327',
            countMax: 15,
            intervalMs: 500,
            name: 'EVERCLEAR',
          },
          '0x1': {
            chainId: '1',
            countMax: 10,
            intervalMs: 3000,
            name: 'ETHEREUM',
            blockTime: 12000,
          },
          '0x76adf1': {
            chainId: '7777777',
            countMax: 10,
            intervalMs: 1300,
            name: 'ZORA',
            blockTime: 2000,
          },
          '0x15a9': {
            chainId: '5545',
            countMax: 15,
            intervalMs: 500,
            name: 'DUCK',
            blockTime: 250,
          },
          '0x74c': {
            countMax: 10,
            intervalMs: 1300,
            name: 'SONEIUM',
            blockTime: 2000,
            chainId: '1868',
          },
          '0x659': {
            intervalMs: 500,
            name: 'GRAVITY',
            blockTime: 250,
            chainId: '1625',
            countMax: 15,
          },
          '0xa1ef': {
            countMax: 15,
            intervalMs: 500,
            name: 'ALEPH_ZERO',
            blockTime: 250,
            chainId: '41455',
          },
          '0xfa': {
            chainId: '250',
            countMax: 10,
            intervalMs: 2700,
            name: 'FANTOM',
            blockTime: 4000,
          },
          '0x1b58': {
            intervalMs: 2400,
            name: 'ZETACHAIN',
            blockTime: 3667,
            chainId: '7000',
            countMax: 10,
          },
          '0x163e7': {
            chainId: '91111',
            countMax: 15,
            intervalMs: 500,
            name: 'HENEZ',
            blockTime: 250,
          },
          '0x2272': {
            chainId: '8818',
            countMax: 15,
            intervalMs: 500,
            name: 'CLINK',
            blockTime: 250,
          },
          '0x1406f40': {
            intervalMs: 500,
            name: 'CORN',
            blockTime: 250,
            chainId: '21000000',
            countMax: 15,
          },
          '0x15eb': {
            countMax: 10,
            intervalMs: 700,
            name: 'OPBNB_TESTNET',
            blockTime: 1000,
            chainId: '5611',
          },
          '0x4268': {
            countMax: 10,
            intervalMs: 2700,
            name: 'ETHEREUM_HOLESKY',
            blockTime: 4000,
            chainId: '17000',
          },
          '0x279f': {
            name: 'MONAD_TESTNET',
            blockTime: 500,
            chainId: '10143',
            countMax: 15,
            intervalMs: 500,
          },
          '0x128ca': {
            blockTime: 250,
            chainId: '75978',
            countMax: 15,
            intervalMs: 500,
            name: 'FUSION',
          },
          '0x316b8': {
            intervalMs: 500,
            name: 'BLOCKFIT',
            blockTime: 250,
            chainId: '202424',
            countMax: 15,
          },
          '0x8279': {
            name: 'SLINGSHOTDAO',
            blockTime: 250,
            chainId: '33401',
            countMax: 15,
            intervalMs: 500,
          },
          '0x134b3cf': {
            name: 'DERI',
            blockTime: 250,
            chainId: '20231119',
            countMax: 15,
            intervalMs: 500,
          },
          '0x13a': {
            name: 'FILECOIN',
            blockTime: 30000,
            chainId: '314',
            countMax: 10,
            intervalMs: 3000,
          },
          '0x531': {
            blockTime: 333,
            chainId: '1329',
            countMax: 15,
            intervalMs: 500,
            name: 'SEI',
          },
          '0xa0c71fd': {
            chainId: '168587773',
            countMax: 10,
            intervalMs: 1300,
            name: 'BLAST_SEPOLIA',
            blockTime: 2000,
          },
          '0xf4290': {
            blockTime: 250,
            chainId: '1000080',
            countMax: 15,
            intervalMs: 500,
            name: 'SCOREKOUNT',
          },
          '0x1142d': {
            blockTime: 250,
            chainId: '70701',
            countMax: 15,
            intervalMs: 500,
            name: 'PROOF_OF_PLAY_BOSS',
          },
          '0x89': {
            intervalMs: 1300,
            name: 'POLYGON',
            blockTime: 2000,
            chainId: '137',
            countMax: 10,
          },
          '0x64': {
            name: 'GNOSIS',
            blockTime: 5000,
            chainId: '100',
            countMax: 10,
            intervalMs: 3000,
          },
          '0x3e7': {
            countMax: 10,
            intervalMs: 700,
            name: 'HYPEREVM',
            blockTime: 1000,
            chainId: '999',
          },
          '0xe49b1': {
            countMax: 15,
            intervalMs: 500,
            name: 'LOGX',
            blockTime: 250,
            chainId: '936369',
          },
          '0xab5': {
            countMax: 10,
            intervalMs: 700,
            name: 'ABSTRACT',
            blockTime: 1000,
            chainId: '2741',
          },
          '0x974': {
            name: 'DOGELON',
            blockTime: 250,
            chainId: '2420',
            countMax: 15,
            intervalMs: 500,
          },
          '0xa1337': {
            countMax: 15,
            intervalMs: 500,
            name: 'XAI',
            blockTime: 250,
            chainId: '660279',
          },
          '0x52415249': {
            countMax: 15,
            intervalMs: 500,
            name: 'RARIBLE',
            blockTime: 250,
            chainId: '1380012617',
          },
          '0xa': {
            intervalMs: 1300,
            name: 'OPTIMISM',
            blockTime: 2000,
            chainId: '10',
            countMax: 10,
          },
          '0x13c23': {
            name: 'FORTA',
            blockTime: 250,
            chainId: '80931',
            countMax: 15,
            intervalMs: 500,
          },
          '0x343b': {
            intervalMs: 1300,
            name: 'IMMUTABLE',
            blockTime: 2000,
            chainId: '13371',
            countMax: 10,
          },
          '0x144': {
            intervalMs: 700,
            name: 'ZKSYNC',
            blockTime: 1000,
            chainId: '324',
            countMax: 10,
          },
          '0xca74': {
            blockTime: 250,
            chainId: '51828',
            countMax: 15,
            intervalMs: 500,
            name: 'CHAINBOUNTY',
          },
          '0x1042': {
            countMax: 15,
            intervalMs: 500,
            name: 'SX_ROLLUP',
            blockTime: 250,
            chainId: '4162',
          },
          '0x1b59': {
            chainId: '7001',
            countMax: 10,
            intervalMs: 2400,
            name: 'ZETACHAIN_TESTNET',
            blockTime: 3667,
          },
          '0xb67d2': {
            intervalMs: 700,
            name: 'KATANA',
            blockTime: 1000,
            chainId: '747474',
            countMax: 10,
          },
          '0x2f0': {
            name: 'RIVALZ',
            blockTime: 250,
            chainId: '752',
            countMax: 15,
            intervalMs: 500,
          },
          '0x6f0': {
            chainId: '1776',
            countMax: 15,
            intervalMs: 500,
            name: 'INJECTIVE',
            blockTime: 667,
          },
          '0xc350': {
            countMax: 15,
            intervalMs: 500,
            name: 'CITRONUS',
            blockTime: 250,
            chainId: '50000',
          },
          '0x1331': {
            name: 'API3',
            blockTime: 250,
            chainId: '4913',
            countMax: 15,
            intervalMs: 500,
          },
          '0x868b': {
            chainId: '34443',
            countMax: 10,
            intervalMs: 1300,
            name: 'MODE',
            blockTime: 2000,
          },
          '0xfee': {
            chainId: '4078',
            countMax: 15,
            intervalMs: 500,
            name: 'COMETH',
            blockTime: 250,
          },
          '0x2b2': {
            blockTime: 2000,
            chainId: '690',
            countMax: 10,
            intervalMs: 1300,
            name: 'REDSTONE',
          },
          '0xb9': {
            blockTime: 2000,
            chainId: '185',
            countMax: 10,
            intervalMs: 1300,
            name: 'MINT',
          },
          '0x5d979': {
            countMax: 15,
            intervalMs: 500,
            name: 'CHEESE',
            blockTime: 250,
            chainId: '383353',
          },
          '0x28c61': {
            name: 'TAIKO_HEKLA',
            blockTime: 4000,
            chainId: '167009',
            countMax: 10,
            intervalMs: 2700,
          },
          '0xa86a': {
            chainId: '43114',
            countMax: 10,
            intervalMs: 700,
            name: 'AVALANCHE',
            blockTime: 1000,
          },
          '0xb1c9': {
            name: 'BLESSNET',
            blockTime: 250,
            chainId: '45513',
            countMax: 15,
            intervalMs: 500,
          },
          '0x8173': {
            intervalMs: 500,
            name: 'APECHAIN',
            blockTime: 250,
            chainId: '33139',
            countMax: 15,
          },
          '0x7ea': {
            blockTime: 2000,
            chainId: '2026',
            countMax: 10,
            intervalMs: 1300,
            name: 'EDGELESS',
          },
          '0x2780b': {
            chainId: '161803',
            countMax: 15,
            intervalMs: 500,
            name: 'EVENTUM',
            blockTime: 250,
          },
          '0x32': {
            blockTime: 2000,
            chainId: '50',
            countMax: 10,
            intervalMs: 1300,
            name: 'XDC',
          },
          '0x2ba': {
            blockTime: 2000,
            chainId: '698',
            countMax: 10,
            intervalMs: 1300,
            name: 'MATCHAIN',
          },
          '0x9c4401': {
            chainId: '10241025',
            countMax: 15,
            intervalMs: 500,
            name: 'ALIENX_TESTNET',
            blockTime: 250,
          },
          '0xa33fc': {
            blockTime: 250,
            chainId: '668668',
            countMax: 15,
            intervalMs: 500,
            name: 'CONWAI',
          },
          '0xe34': {
            intervalMs: 3000,
            name: 'BOTANIX_TESTNET',
            blockTime: 6000,
            chainId: '3636',
            countMax: 10,
          },
          '0x7c5': {
            countMax: 15,
            intervalMs: 500,
            name: 'LYDIA',
            blockTime: 250,
            chainId: '1989',
          },
        },
      },
      batchSizeLimit: 10,
      gasEstimateFallback: {
        perChainConfig: {
          '0x279f': {
            fixed: 1000000,
          },
        },
      },
    },
    status: FeatureFlagStatus.Active,
  },

  contentfulCarouselEnabled: {
    name: 'contentfulCarouselEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  depositConfig: {
    name: 'depositConfig',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      features: {
        metamaskUsdEnabled: true,
      },
      minimumVersion: '7.53.0',
      providerApiKey: '57bdc22b-9196-4e6b-a867-a1a410aa8545',
      providerFrontendAuth:
        '8uZwe_A252cPvqEU4bsi4xPaKC*705GcM4FfriahLWAL!gucJR74mhBt_kGpTdf7E1ic_d9cK47KZRWUypHpcCv6yL0Fi3DzextE',
      active: true,
      entrypoints: {
        walletActions: false,
      },
    },
    status: FeatureFlagStatus.Active,
  },

  displayCardButton: {
    name: 'displayCardButton',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.64.1',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  earnFeatureFlagTemplate: {
    name: 'earnFeatureFlagTemplate',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMerklCampaignClaiming: {
    name: 'earnMerklCampaignClaiming',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.66.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionAssetOverviewCtaEnabled: {
    name: 'earnMusdConversionAssetOverviewCtaEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.65.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionCtaTokens: {
    name: 'earnMusdConversionCtaTokens',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      '0xe708': ['USDC', 'USDT', 'DAI'],
      '0x1': ['USDC', 'USDT', 'DAI'],
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionFlowEnabled: {
    name: 'earnMusdConversionFlowEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.65.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionGeoBlockedCountries: {
    name: 'earnMusdConversionGeoBlockedCountries',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      blockedRegions: ['GB'],
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionMinAssetBalanceRequired: {
    name: 'earnMusdConversionMinAssetBalanceRequired',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 0.01,
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionRewardsUiEnabled: {
    name: 'earnMusdConversionRewardsUiEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConversionTokenListItemCtaEnabled: {
    name: 'earnMusdConversionTokenListItemCtaEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.65.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConvertibleTokensAllowlist: {
    name: 'earnMusdConvertibleTokensAllowlist',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      '0xe708': ['USDC', 'USDT', 'DAI'],
      '0x1': ['USDC', 'USDT', 'DAI'],
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdConvertibleTokensBlocklist: {
    name: 'earnMusdConvertibleTokensBlocklist',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {},
    status: FeatureFlagStatus.Active,
  },

  earnMusdCtaEnabled: {
    name: 'earnMusdCtaEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.65.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdQuickConvertEnabled: {
    name: 'earnMusdQuickConvertEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  earnMusdQuickConvertPercentage: {
    name: 'earnMusdQuickConvertPercentage',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 0.9,
    status: FeatureFlagStatus.Active,
  },

  earnPooledStakingEnabled: {
    name: 'earnPooledStakingEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.47.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnPooledStakingServiceInterruptionBannerEnabled: {
    name: 'earnPooledStakingServiceInterruptionBannerEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  earnStablecoinLendingEnabled: {
    name: 'earnStablecoinLendingEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.51.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  earnStablecoinLendingServiceInterruptionBannerEnabled: {
    name: 'earnStablecoinLendingServiceInterruptionBannerEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  enableMultichainAccounts: {
    name: 'enableMultichainAccounts',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      featureVersion: '1',
      minimumVersion: '7.53.0',
    },
    status: FeatureFlagStatus.Active,
  },

  enableMultichainAccountsState2: {
    name: 'enableMultichainAccountsState2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      featureVersion: '2',
      minimumVersion: '7.57.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  extensionUxPna25: {
    name: 'extensionUxPna25',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  forceRampsStagingEnvironment: {
    name: 'forceRampsStagingEnvironment',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  fullPageAccountList: {
    name: 'fullPageAccountList',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  galileoAppleWalletInAppProvisioningEnabled: {
    name: 'galileoAppleWalletInAppProvisioningEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  galileoGoogleWalletInAppProvisioningEnabled: {
    name: 'galileoGoogleWalletInAppProvisioningEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  gasFeesSponsoredNetwork: {
    name: 'gasFeesSponsoredNetwork',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      '0x38': false,
      '0x531': false,
      '0x8f': false,
    },
    status: FeatureFlagStatus.Active,
  },

  homepageRedesignV1: {
    name: 'homepageRedesignV1',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.59',
    },
    status: FeatureFlagStatus.Active,
  },

  homepageSectionsV1: {
    name: 'homepageSectionsV1',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  importSrpWordSuggestion: {
    name: 'importSrpWordSuggestion',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.61.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  metalCardCheckoutEnabled: {
    name: 'metalCardCheckoutEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.64.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  mobileMinimumVersions: {
    name: 'mobileMinimumVersions',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      androidMinimumAPIVersion: 21,
      appMinimumBuild: 3727,
      appleMinimumOS: 6,
    },
    status: FeatureFlagStatus.Active,
  },

  mobileSignedDeepLinkWarningEnabled: {
    name: 'mobileSignedDeepLinkWarningEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      {
        name: 'Warning enabled',
        scope: {
          value: 1,
          type: 'threshold',
        },
        value: true,
      },
    ],
    status: FeatureFlagStatus.Active,
  },

  mobileUxAccountMenu: {
    name: 'mobileUxAccountMenu',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  mobileUxNetworkManagement: {
    name: 'mobileUxNetworkManagement',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  nonZeroUnusedApprovals: {
    name: 'nonZeroUnusedApprovals',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      'https://aerodrome.finance',
      'https://app.bio.xyz',
      'https://app.ethena.fi',
      'https://app.euler.finance',
      'https://app.rocketx.exchange',
      'https://app.seer.pm',
      'https://app.sky.money',
      'https://app.spark.fi',
      'https://app.tea-fi.com',
      'https://app.uniswap.org',
      'https://bridge.gravity.xyz',
      'https://dev-relay-sdk.vercel.app',
      'https://evm.ekubo.org',
      'https://flaunch.gg',
      'https://fluid.io',
      'https://flyingtulip.com',
      'https://jumper.exchange',
      'https://linea.build',
      'https://pancakeswap.finance',
      'https://privacypools.com',
      'https://relay.link',
      'https://revoke.cash',
      'https://staging.relay.link',
      'https://superbridge.app',
      'https://swap.defillama.com',
      'https://toros.finance',
      'https://velodrome.finance',
      'https://walletstats.io',
      'https://www.bungee.exchange',
      'https://www.dev.relay.link',
      'https://www.fxhash.xyz',
      'https://www.hydrex.fi',
      'https://www.relay.link',
      'https://yearn.fi',
      'https://app.teller.org',
      'https://kalshi.com',
    ],
    status: FeatureFlagStatus.Active,
  },

  otaUpdatesEnabled: {
    name: 'otaUpdatesEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.65.0',
    },
    status: FeatureFlagStatus.Active,
  },

  pepsSamplePhasedRolloutFlag: {
    name: 'pepsSamplePhasedRolloutFlag',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  perpsAbtestButtonColor: {
    name: 'perpsAbtestButtonColor',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 'monochrome',
    status: FeatureFlagStatus.Active,
  },

  perpsFeedbackEnabled: {
    name: 'perpsFeedbackEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.62.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  perpsHip3AllowlistMarkets: {
    name: 'perpsHip3AllowlistMarkets',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 'xyz:*',
    status: FeatureFlagStatus.Active,
  },

  perpsHip3BlocklistMarkets: {
    name: 'perpsHip3BlocklistMarkets',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: '',
    status: FeatureFlagStatus.Active,
  },

  perpsHip3Enabled: {
    name: 'perpsHip3Enabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.60.4',
    },
    status: FeatureFlagStatus.Active,
  },

  perpsMyxProviderEnabled: {
    name: 'perpsMyxProviderEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  perpsOrderBookEnabled: {
    name: 'perpsOrderBookEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  perpsPayWithAnyTokenAllowlistAssets: {
    name: 'perpsPayWithAnyTokenAllowlistAssets',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault:
      '0x1.0x0000000000000000000000000000000000000000,0x1.0xdac17f958d2ee523a2206206994597c13d831ec7,0x1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,0x1.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x1.0x2260fac5e5542a773aa44fbcfedf7c193bc2c599,0xa4b1.0x0000000000000000000000000000000000000000,0xa4b1.0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9,0xa4b1.0xaf88d065e77c8cc2239327c5edb3a432268e5831,0xa4b1.0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f,0x2105.0x0000000000000000000000000000000000000000,0x2105.0x833589fcd6edb6e08f4c7c32d4f71b54bda02913,0x2105.0x0555e30da8f98308edb960aa94c0db47230d2b9c,0xe708.0x0000000000000000000000000000000000000000,0xe708.0xa219439258ca9da29e9cc4ce5596924745e12b93,0xe708.0x176211869ca2b568f2a7d4ee941e073a821ee1ff,0xe708.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x38.0x0000000000000000000000000000000000000000,0x38.0x55d398326f99059ff775485246999027b3197955,0x38.0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d,0x38.0xaca92e438df0b2401ff60da7e4337b687a2435da,0x38.0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c,0x89.0x0000000000000000000000000000000000000000,0x89.0xc2132d05d31c914a87c6611c10748aeb04b58e8f,0x89.0x3c499c542cef5e3811e1192ce70d8cc03d5c3359,0x89.0x2791bca1f2de4661ed88a30c99a7a9449aa84174,0x89.0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    status: FeatureFlagStatus.Active,
  },

  perpsPerpGtmOnboardingModalEnabled: {
    name: 'perpsPerpGtmOnboardingModalEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  perpsPerpTradingEnabled: {
    name: 'perpsPerpTradingEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.56.2',
    },
    status: FeatureFlagStatus.Active,
  },

  perpsPerpTradingGeoBlockedCountries: {
    name: 'perpsPerpTradingGeoBlockedCountries',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      blockedRegions: ['BE', 'US', 'CA-ON', 'GB'],
    },
    status: FeatureFlagStatus.Active,
  },

  perpsPerpTradingGeoBlockedCountriesV2: {
    name: 'perpsPerpTradingGeoBlockedCountriesV2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      blockedRegions: ['BE', 'US', 'CA-ON', 'GB'],
    },
    status: FeatureFlagStatus.Active,
  },

  perpsPerpTradingServiceInterruptionBannerEnabled: {
    name: 'perpsPerpTradingServiceInterruptionBannerEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  perpsTradeWithAnyTokenIsEnabled: {
    name: 'perpsTradeWithAnyTokenIsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.66.0',
    },
    status: FeatureFlagStatus.Active,
  },

  platformNewLinkHandlerActions: {
    name: 'platformNewLinkHandlerActions',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      home: false,
    },
    status: FeatureFlagStatus.Active,
  },

  platformNewLinkHandlerSystem: {
    name: 'platformNewLinkHandlerSystem',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  predictFakOrders: {
    name: 'predictFakOrders',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  predictFeeCollection: {
    name: 'predictFeeCollection',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      waiveList: ['middle-east'],
      collector: '0xe19b9720890539ac74AC32290626d2BA00E2e5a8',
      enabled: true,
      metamaskFee: 0.02,
      providerFee: 0.02,
    },
    status: FeatureFlagStatus.Active,
  },

  predictGtmOnboardingModalEnabled: {
    name: 'predictGtmOnboardingModalEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.60.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  predictHomeFeaturedVariant: {
    name: 'predictHomeFeaturedVariant',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.65.0',
      variant: 'list',
    },
    status: FeatureFlagStatus.Active,
  },

  predictHotTab: {
    name: 'predictHotTab',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  predictLiveSports: {
    name: 'predictLiveSports',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      leagues: ['nfl'],
    },
    status: FeatureFlagStatus.Active,
  },

  predictMarketHighlights: {
    name: 'predictMarketHighlights',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      highlights: [],
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  predictTradingEnabled: {
    name: 'predictTradingEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.60.0',
    },
    status: FeatureFlagStatus.Active,
  },

  productSafetyDappScanning: {
    name: 'productSafetyDappScanning',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  rampsUnifiedBuyV1: {
    name: 'rampsUnifiedBuyV1',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      active: true,
      minimumVersion: '7.61.0',
    },
    status: FeatureFlagStatus.Active,
  },

  rampsUnifiedBuyV2: {
    name: 'rampsUnifiedBuyV2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      active: false,
      minimumVersion: '7.61.0',
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsAnnouncementModalEnabled: {
    name: 'rewardsAnnouncementModalEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsBitcoinEnabled: {
    name: 'rewardsBitcoinEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  rewardsDropsEnabled: {
    name: 'rewardsDropsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  rewardsEnableCardSpend: {
    name: 'rewardsEnableCardSpend',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.58.0',
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsEnableMusdDeposit: {
    name: 'rewardsEnableMusdDeposit',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsEnableMusdHolding: {
    name: 'rewardsEnableMusdHolding',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsEnabled: {
    name: 'rewardsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.57.0',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsReferralCodeEnabled: {
    name: 'rewardsReferralCodeEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '0.0.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsReferralEnabled: {
    name: 'rewardsReferralEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  rewardsTronEnabled: {
    name: 'rewardsTronEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  rwaTokensEnabled: {
    name: 'rwaTokensEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  sendRedesign: {
    name: 'sendRedesign',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  smartTransactionsNetworks: {
    name: 'smartTransactionsNetworks',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      default: {
        maxDeadline: 150,
        mobileActive: false,
        mobileActiveAndroid: false,
        mobileActiveIOS: false,
        mobileReturnTxHashAsap: true,
        batchStatusPollingInterval: 1000,
        expectedDeadline: 45,
      },
      '0xe708': {
        sentinelUrl: 'https://tx-sentinel-linea-mainnet.api.cx.metamask.io',
        mobileActive: true,
        mobileActiveAndroid: true,
        mobileActiveIOS: true,
      },
      '0x89': {
        mobileActiveIOS: true,
        sentinelUrl: 'https://tx-sentinel-polygon-mainnet.api.cx.metamask.io',
        mobileActive: true,
        mobileActiveAndroid: true,
      },
      '0x144': {
        sentinelUrl: 'https://tx-sentinel-zksync-mainnet.api.cx.metamask.io',
      },
      '0x8f': {
        sentinelUrl: 'https://tx-sentinel-monad-mainnet.api.cx.metamask.io',
      },
      '0xa4b1': {
        mobileActiveAndroid: true,
        mobileActiveIOS: true,
        sentinelUrl: 'https://tx-sentinel-arbitrum-mainnet.api.cx.metamask.io',
        mobileActive: true,
      },
      '0xa': {
        sentinelUrl: 'https://tx-sentinel-optimism-mainnet.api.cx.metamask.io',
      },
      '0x1': {
        mobileActive: true,
        mobileActiveAndroid: true,
        mobileActiveIOS: true,
        sentinelUrl: 'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io',
        expectedDeadline: 45,
        maxDeadline: 160,
      },
      '0x38': {
        mobileActiveAndroid: true,
        mobileActiveIOS: true,
        sentinelUrl: 'https://tx-sentinel-bsc-mainnet.api.cx.metamask.io',
        mobileActive: true,
      },
      '0xa86a': {
        sentinelUrl: 'https://tx-sentinel-avalanche-mainnet.api.cx.metamask.io',
      },
      '0x2105': {
        mobileActive: true,
        mobileActiveAndroid: true,
        mobileActiveIOS: true,
        sentinelUrl: 'https://tx-sentinel-base-mainnet.api.cx.metamask.io',
      },
      '0x531': {
        sentinelUrl: 'https://tx-sentinel-sei-mainnet.api.cx.metamask.io',
      },
    },
    status: FeatureFlagStatus.Active,
  },

  solanaOnboardingModal: {
    name: 'solanaOnboardingModal',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  solanaTestnetsEnabled: {
    name: 'solanaTestnetsEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  swapsSWAPS4135AbtestNumpadQuickAmounts: {
    name: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [],
    status: FeatureFlagStatus.Active,
  },

  swapsTrendingTokens: {
    name: 'swapsTrendingTokens',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  testFlagForThreshold: {
    name: 'testFlagForThreshold',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {},
    status: FeatureFlagStatus.Active,
  },

  tokenDetailsV2: {
    name: 'tokenDetailsV2',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  tokenDetailsV2AbTest: {
    name: 'tokenDetailsV2AbTest',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      {
        name: 'Control is ON',
        scope: {
          value: 0.9,
          type: 'threshold',
        },
        value: {
          minimumVersion: '7.67.0',
          variant: 'control',
        },
      },
      {
        name: 'Control is OFF',
        scope: {
          type: 'threshold',
          value: 0.1,
        },
        value: {
          minimumVersion: '7.67.0',
          variant: 'treatment',
        },
      },
    ],
    status: FeatureFlagStatus.Active,
  },

  tokenDetailsV2ButtonLayout: {
    name: 'tokenDetailsV2ButtonLayout',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.67.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  tokenDiscoveryBrowserEnabled: {
    name: 'tokenDiscoveryBrowserEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  tokenListItemV2AbtestVersioned: {
    name: 'tokenListItemV2AbtestVersioned',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.67.0',
      enabled: false,
    },
    status: FeatureFlagStatus.Active,
  },

  tokenSearchDiscoveryEnabled: {
    name: 'tokenSearchDiscoveryEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },

  transactionsPrivacyPolicyUpdate: {
    name: 'transactionsPrivacyPolicyUpdate',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: 'no_update',
    status: FeatureFlagStatus.Active,
  },

  transactionsTxHashInAnalytics: {
    name: 'transactionsTxHashInAnalytics',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  trendingTokens: {
    name: 'trendingTokens',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: [
      {
        scope: {
          value: 1,
          type: 'threshold',
        },
        value: {
          minimumVersion: '7.63.0',
          enabled: true,
        },
        name: 'feature is ON',
      },
      {
        scope: {
          type: 'threshold',
          value: 0,
        },
        value: {
          enabled: false,
          minimumVersion: '7.63.0',
        },
        name: 'feature is OFF',
      },
    ],
    status: FeatureFlagStatus.Active,
  },

  tronAccounts: {
    name: 'tronAccounts',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      minimumVersion: '7.61.6',
      enabled: true,
    },
    status: FeatureFlagStatus.Active,
  },

  tronStaking: {
    name: 'tronStaking',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: false,
    status: FeatureFlagStatus.Active,
  },

  trxStakingEnabled: {
    name: 'trxStakingEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: {
      enabled: true,
      minimumVersion: '7.61.6',
    },
    status: FeatureFlagStatus.Active,
  },

  walletFrameworkRpcFailoverEnabled: {
    name: 'walletFrameworkRpcFailoverEnabled',
    type: FeatureFlagType.Remote,
    inProd: true,
    productionDefault: true,
    status: FeatureFlagStatus.Active,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns the production flag defaults in the raw API response format
 * (array of single-key objects), suitable for use by the E2E mock server.
 *
 * Only includes remote flags that are in production.
 *
 * @returns Array of `{ flagName: value }` objects matching the client-config API format
 */
export function getProductionRemoteFlagApiResponse(): Json[] {
  return Object.values(FEATURE_FLAG_REGISTRY)
    .filter((entry) => entry.type === FeatureFlagType.Remote && entry.inProd)
    .map((entry) => ({ [entry.name]: entry.productionDefault }));
}

/**
 * Returns production flag defaults as a flat key-value map.
 * This is the "resolved" format used in Redux state (after the controller
 * processes the API response).
 *
 * Useful for assertions in E2E tests.
 *
 * @returns Record of flag name to production default value
 */
export function getProductionRemoteFlagDefaults(): Record<string, Json> {
  const defaults: Record<string, Json> = {};
  for (const entry of Object.values(FEATURE_FLAG_REGISTRY)) {
    if (entry.type === FeatureFlagType.Remote && entry.inProd) {
      defaults[entry.name] = entry.productionDefault;
    }
  }
  return defaults;
}

/**
 * Gets a single registry entry by flag name.
 *
 * @param name - The flag identifier
 * @returns The registry entry, or undefined if not found
 */
export function getRegistryEntry(
  name: string,
): FeatureFlagRegistryEntry | undefined {
  return FEATURE_FLAG_REGISTRY[name];
}

/**
 * Returns all flag names in the registry.
 *
 * @returns Array of flag name strings
 */
export function getRegisteredFlagNames(): string[] {
  return Object.keys(FEATURE_FLAG_REGISTRY);
}

/**
 * Returns all registry entries matching the given status.
 *
 * @param status - The status to filter by
 * @returns Array of matching registry entries
 */
export function getRegistryEntriesByStatus(
  status: FeatureFlagStatus,
): FeatureFlagRegistryEntry[] {
  return Object.values(FEATURE_FLAG_REGISTRY).filter(
    (entry) => entry.status === status,
  );
}

/**
 * Returns all deprecated flags. Useful for tracking flags that need removal.
 *
 * @returns Array of deprecated registry entries
 */
export function getDeprecatedFlags(): FeatureFlagRegistryEntry[] {
  return getRegistryEntriesByStatus(FeatureFlagStatus.Deprecated);
}
