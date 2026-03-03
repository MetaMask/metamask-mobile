/**
 * Helper for creating remote feature flags mock configurations
 */

import type { Mockttp } from 'mockttp';
import { setupMockRequest } from './mockHelpers.ts';
import { MockApiEndpoint } from '../../framework';
import { getProductionRemoteFlagApiResponse } from '../../feature-flags';

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
 * Returns the default feature flags array from the central registry.
 * The registry is the single source of truth for all production flag defaults.
 *
 * @see tests/feature-flags/feature-flag-registry.ts
 */
function getDefaultFeatureFlagsArray(): Record<string, unknown>[] {
  return getProductionRemoteFlagApiResponse() as Record<string, unknown>[];
}

/**
 * Creates a remote feature flags mock with custom overrides
 * @param flagOverrides - Object containing flag overrides (e.g., { rewards: true })
 * @param distribution - Distribution type (main, flask)
 * @returns Mock configuration object with array response format matching real API
 */
export const createRemoteFeatureFlagsMock = (
  flagOverrides: Record<string, unknown> = {},
  distribution: string = 'main',
  environment: string = 'dev',
): MockApiEndpoint => {
  const result = JSON.parse(
    JSON.stringify(getDefaultFeatureFlagsArray()),
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
        // Deep merge for nested objects
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
 * Sets up default remote feature flags mock on mockttp server for both main and flask distributions
 * This will be called automatically and can be overridden by testSpecificMock
 */
export const setupRemoteFeatureFlagsMock = async (
  mockServer: Mockttp,
  flagOverrides: Record<string, unknown> = {},
): Promise<void> => {
  const environments = ['dev', 'test', 'prod'] as const;
  const distributions = ['main', 'flask'] as const;

  const mockPromises = distributions.flatMap((distribution) =>
    environments.map((environment) => {
      const { urlEndpoint, response, responseCode } =
        createRemoteFeatureFlagsMock(flagOverrides, distribution, environment);

      return setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: urlEndpoint,
        response,
        responseCode,
      });
    }),
  );

  await Promise.all(mockPromises);
};
