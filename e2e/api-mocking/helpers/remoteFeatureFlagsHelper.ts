/**
 * Helper for creating remote feature flags mock configurations
 */

import type { Mockttp } from 'mockttp';
import { setupMockRequest } from './mockHelpers';
import { MockApiEndpoint } from '../../framework';

/**
 * Deep merge utility that properly handles nested objects
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      sourceValue !== null &&
      targetValue !== null &&
      !Array.isArray(sourceValue) &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      // Replace with source value (handles primitives, arrays, null, type mismatches)
      result[key] = sourceValue;
    }
  });

  return result;
}

/**
 * Default feature flags configuration as array of objects (matches API format)
 * Note: You can override these using testSpecificMock
 */
const DEFAULT_FEATURE_FLAGS_ARRAY: Record<string, unknown>[] = [
  {
    assetsDefiPositionsEnabled: true,
  },
  {
    assetsEnableNotificationsByDefault: true,
  },
  {
    assetsNftGridEnabled: true,
  },
  {
    assetsNotificationsEnabled: true,
  },
  {
    bridgeConfig: {
      refreshRate: 3000000,
      support: false,
      chains: {},
      maxRefreshCount: 1,
    },
  },
  {
    bridgeConfigV2: {
      minimumVersion: '7.46.0',
      priceImpactThreshold: {
        normal: 0.05,
        gasless: 0.2,
      },
      refreshRate: 30000,
      support: true,
      chains: {
        '1': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '10': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '56': {
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
          isActiveDest: true,
        },
        '137': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '324': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
        },
        '1329': {
          isActiveDest: true,
          isActiveSrc: true,
          isUnifiedUIEnabled: true,
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
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '59144': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '20000000000001': {
          isUnifiedUIEnabled: true,
          isActiveDest: true,
          isActiveSrc: true,
        },
        '1151111081099710': {
          isUnifiedUIEnabled: true,
          refreshRate: 10000,
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
        },
      },
      maxRefreshCount: 5,
    },
  },
  {
    cardFeature: {
      chains: {
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
              address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
              decimals: 18,
              enabled: true,
              name: 'Wrapped Ether',
              symbol: 'WETH',
            },
            {
              enabled: true,
              name: 'EURe',
              symbol: 'EURe',
              address: '0x3ff47c5Bf409C86533FE1f4907524d304062428D',
              decimals: 18,
            },
            {
              enabled: true,
              name: 'GBPe',
              symbol: 'GBPe',
              address: '0x3Bce82cf1A2bc357F956dd494713Fe11DC54780f',
              decimals: 18,
            },
            {
              enabled: true,
              name: 'Aave USDC',
              symbol: 'aUSDC',
              address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
              decimals: 6,
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
  },
  {
    carouselBanners: false,
  },
  {
    confirmation_redesign: {
      staking_confirmations: true,
      transfer: true,
      approve: true,
      contract_deployment: true,
      contract_interaction: true,
      signatures: true,
    },
  },
  {
    rewards: false,
  },
  {
    perpsEnabled: true,
  },
  {
    perpsPerpTradingEnabled: {
      enabled: true,
      minimumVersion: '7.51.0',
    },
  },
  {
    enableMultichainAccounts: {
      enabled: true,
      featureVersion: '1',
      minimumVersion: '7.53.0',
    },
  },
  {
    mobileMinimumVersions: {
      androidMinimumAPIVersion: 0,
      appMinimumBuild: 0,
      appleMinimumOS: 0,
    },
  },
  {
    sendRedesign: {
      enabled: false, // Disabled by default, can be enabled in tests
    },
  },
  {
    tokenDiscoveryBrowserEnabled: false,
  },
  {
    tokenSearchDiscoveryEnabled: true,
  },
  {
    walletFrameworkRpcFailoverEnabled: true,
  },
];

/**
 * Creates a remote feature flags mock with custom overrides
 * @param flagOverrides - Object containing flag overrides (e.g., { rewards: true, confirmation_redesign: { signatures: true } })
 * @param distribution - Distribution type (main, flask)
 * @returns Mock configuration object with array response format matching real API
 */
export const createRemoteFeatureFlagsMock = (
  flagOverrides: Record<string, unknown> = {},
  distribution: string = 'main',
  environment: string = 'dev',
): MockApiEndpoint => {
  // Start with deep copy of default array to avoid mutation
  const result = JSON.parse(
    JSON.stringify(DEFAULT_FEATURE_FLAGS_ARRAY),
  ) as Record<string, unknown>[];

  // Apply overrides by finding and merging with existing objects or adding new ones
  Object.entries(flagOverrides).forEach(([flagName, flagValue]) => {
    const existingIndex = result.findIndex((obj) =>
      Object.prototype.hasOwnProperty.call(obj, flagName),
    );

    if (existingIndex >= 0) {
      // Flag exists, merge the values
      const existingObj = result[existingIndex] as Record<string, unknown>;
      const existingFlag = existingObj[flagName];
      if (
        typeof existingFlag === 'object' &&
        typeof flagValue === 'object' &&
        flagValue !== null &&
        existingFlag !== null &&
        !Array.isArray(existingFlag) &&
        !Array.isArray(flagValue)
      ) {
        // Deep merge for nested objects like confirmation_redesign
        existingObj[flagName] = deepMerge(
          existingFlag as Record<string, unknown>,
          flagValue as Record<string, unknown>,
        );
      } else {
        // Replace simple values, arrays, or when types don't match
        existingObj[flagName] = flagValue;
      }
    } else {
      // Flag doesn't exist, add new object
      result.push({ [flagName]: flagValue });
    }
  });

  return {
    urlEndpoint: `https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=${distribution}&environment=${environment}`,
    response: result,
    responseCode: 200,
  };
};

/**
 * Sets up default remote feature flags mock on mockttp server
 * This will be called automatically and can be overridden by testSpecificMock
 */
export const setupRemoteFeatureFlagsMock = async (
  mockServer: Mockttp,
  flagOverrides: Record<string, unknown> = {},
  distribution: string = 'main',
): Promise<void> => {
  const {
    urlEndpoint: devUrl,
    response,
    responseCode,
  } = createRemoteFeatureFlagsMock(flagOverrides, distribution);
  const { urlEndpoint: prodUrl } = createRemoteFeatureFlagsMock(
    flagOverrides,
    distribution,
    'prod',
  );

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: devUrl,
    response,
    responseCode,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: prodUrl,
    response,
    responseCode,
  });
};
