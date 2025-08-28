/**
 * Helper for creating remote feature flags mock configurations
 */

import type { Mockttp } from 'mockttp';
import { setupMockRequest } from './mockHelpers';
import { MockApiEndpoint } from '../framework';

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
 */
const DEFAULT_FEATURE_FLAGS_ARRAY: Record<string, unknown>[] = [
  {
    mobileMinimumVersions: {
      appMinimumBuild: 1243,
      appleMinimumOS: 6,
      androidMinimumAPIVersion: 21,
    },
  },
  {
    confirmation_redesign: {
      signatures: false,
      staking_confirmations: false,
      contract_deployment: false,
      contract_interaction: false,
      transfer: false,
      approve: false,
    },
  },
  {
    rewards: false,
  },
  {
    assetsDefiPositionsEnabled: false,
  },
  {
    assetsEnableNotificationsByDefault: false,
  },
  {
    enableMultichainAccounts: {
      enabled: false,
      featureVersion: '1',
      minimumVersion: '7.46.0',
    },
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
): MockApiEndpoint => {
  // Start with default array
  const result = [...DEFAULT_FEATURE_FLAGS_ARRAY];

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
    urlEndpoint: `https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=${distribution}&environment=dev`,
    response: result,
    responseCode: 200,
  };
};

/**
 * Sets up default remote feature flags mock on mockttp server
 * This will be called automatically and can be overridden by testSpecificMock
 */
export const setupDefaultRemoteFeatureFlags = async (
  mockServer: Mockttp,
  flagOverrides: Record<string, unknown> = {},
  distribution: string = 'main',
): Promise<void> => {
  const mockConfig = createRemoteFeatureFlagsMock(flagOverrides, distribution);

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: mockConfig.urlEndpoint,
    response: mockConfig.response,
    responseCode: mockConfig.responseCode,
  });
};
