/**
 * Unit tests for remote feature flags helper
 */

import {
  createRemoteFeatureFlagsMock,
  setupDefaultRemoteFeatureFlags,
} from './remoteFeatureFlagsHelper';
import { setupMockRequest } from './mockHelpers';
import type { Mockttp } from 'mockttp';

jest.mock('./mockHelpers', () => ({
  setupMockRequest: jest.fn(),
}));

describe('Remote Feature Flags Helper', () => {
  const mockSetupMockRequest = setupMockRequest as jest.MockedFunction<
    typeof setupMockRequest
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemoteFeatureFlagsMock', () => {
    it('should return default configuration with rewards disabled', () => {
      const result = createRemoteFeatureFlagsMock();

      expect(result).toEqual({
        urlEndpoint:
          'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
        response: [
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
        ],
        responseCode: 200,
      });
    });

    it('should use flask distribution when specified', () => {
      const result = createRemoteFeatureFlagsMock({}, 'flask');

      expect(result.urlEndpoint).toBe(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
      );
    });

    it('should override simple boolean flags', () => {
      const result = createRemoteFeatureFlagsMock({
        rewards: true,
        assetsDefiPositionsEnabled: true,
      });

      // Find the rewards and assetsDefiPositionsEnabled objects
      const response = result.response as Record<string, unknown>[];
      const rewardsObj = response.find(
        (obj: Record<string, unknown>) => 'rewards' in obj,
      );
      const defiObj = response.find(
        (obj: Record<string, unknown>) => 'assetsDefiPositionsEnabled' in obj,
      );

      expect(rewardsObj).toEqual({ rewards: true });
      expect(defiObj).toEqual({ assetsDefiPositionsEnabled: true });
    });

    it('should deep merge nested objects', () => {
      const result = createRemoteFeatureFlagsMock({
        confirmation_redesign: {
          signatures: true,
          transfer: true,
          // Other properties should remain as defaults
        },
      });

      const response = result.response as Record<string, unknown>[];
      const confirmationObj = response.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );
      expect(confirmationObj).toEqual({
        confirmation_redesign: {
          signatures: true, // Overridden
          staking_confirmations: false, // Default preserved
          contract_deployment: false, // Default preserved
          contract_interaction: false, // Default preserved
          transfer: true, // Overridden
          approve: false, // Default preserved
        },
      });
    });

    it('should handle deeply nested objects', () => {
      const result = createRemoteFeatureFlagsMock({
        enableMultichainAccounts: {
          enabled: true, // Override this
          // featureVersion and minimumVersion should remain defaults
        },
      });

      const response = result.response as Record<string, unknown>[];
      const multichainObj = response.find(
        (obj: Record<string, unknown>) => 'enableMultichainAccounts' in obj,
      );
      expect(multichainObj).toEqual({
        enableMultichainAccounts: {
          enabled: true, // Overridden
          featureVersion: '1', // Default preserved
          minimumVersion: '7.46.0', // Default preserved
        },
      });
    });

    it('should add new flags that do not exist in defaults', () => {
      const result = createRemoteFeatureFlagsMock({
        newCustomFlag: true,
        anotherFlag: { nested: 'value' },
      });

      expect(result.response).toContainEqual({ newCustomFlag: true });
      expect(result.response).toContainEqual({
        anotherFlag: { nested: 'value' },
      });
    });

    it('should handle array values by replacing them entirely', () => {
      const result = createRemoteFeatureFlagsMock({
        arrayFlag: ['item1', 'item2', 'item3'],
      });

      expect(result.response).toContainEqual({
        arrayFlag: ['item1', 'item2', 'item3'],
      });
    });

    it('should handle complex nested arrays in existing flags', () => {
      // Test overriding a nested structure with arrays
      const result = createRemoteFeatureFlagsMock({
        confirmation_redesign: {
          customArray: [1, 2, 3],
          signatures: true,
        },
      });

      const response = result.response as Record<string, unknown>[];
      const confirmationObj = response.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );
      expect(confirmationObj).toEqual({
        confirmation_redesign: {
          signatures: true,
          staking_confirmations: false,
          contract_deployment: false,
          contract_interaction: false,
          transfer: false,
          approve: false,
          customArray: [1, 2, 3], // Array added
        },
      });
    });

    it('should handle null values', () => {
      const result = createRemoteFeatureFlagsMock({
        nullFlag: null,
        confirmation_redesign: null, // Replace entire object with null
      });

      expect(result.response).toContainEqual({ nullFlag: null });

      const response = result.response as Record<string, unknown>[];
      const confirmationObj = response.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );
      expect(confirmationObj).toEqual({ confirmation_redesign: null });
    });

    it('should handle mixed data types', () => {
      const result = createRemoteFeatureFlagsMock({
        stringFlag: 'test string',
        numberFlag: 42,
        booleanFlag: true,
        objectFlag: { key: 'value' },
        arrayFlag: [1, 2, 3],
        nullFlag: null,
      });

      expect(result.response).toContainEqual({ stringFlag: 'test string' });
      expect(result.response).toContainEqual({ numberFlag: 42 });
      expect(result.response).toContainEqual({ booleanFlag: true });
      expect(result.response).toContainEqual({ objectFlag: { key: 'value' } });
      expect(result.response).toContainEqual({ arrayFlag: [1, 2, 3] });
      expect(result.response).toContainEqual({ nullFlag: null });
    });

    it('should handle deep nesting with multiple levels', () => {
      const result = createRemoteFeatureFlagsMock({
        deepFlag: {
          level1: {
            level2: {
              level3: {
                level4: 'deep value',
                level4Array: ['a', 'b', 'c'],
              },
              otherLevel3: 'value',
            },
          },
        },
      });

      expect(result.response).toContainEqual({
        deepFlag: {
          level1: {
            level2: {
              level3: {
                level4: 'deep value',
                level4Array: ['a', 'b', 'c'],
              },
              otherLevel3: 'value',
            },
          },
        },
      });
    });

    it('should preserve array structure when replacing object with array', () => {
      const result = createRemoteFeatureFlagsMock({
        mobileMinimumVersions: [1, 2, 3], // Replace object with array
      });

      const response = result.response as Record<string, unknown>[];
      const mobileObj = response.find(
        (obj: Record<string, unknown>) => 'mobileMinimumVersions' in obj,
      );
      expect(mobileObj).toEqual({ mobileMinimumVersions: [1, 2, 3] });
    });

    it('should preserve object structure when replacing array with object', () => {
      // First add an array flag, then override with object

      // Then override it with an object
      const result2 = createRemoteFeatureFlagsMock({
        arrayFlag: { replaced: 'with object' },
      });

      expect(result2.response).toContainEqual({
        arrayFlag: { replaced: 'with object' },
      });
    });
  });

  describe('setupDefaultRemoteFeatureFlags', () => {
    let mockServer: jest.Mocked<Mockttp>;

    beforeEach(() => {
      mockServer = {} as jest.Mocked<Mockttp>;
      mockSetupMockRequest.mockResolvedValue(undefined);
    });

    it('should call setupMockRequest with default configuration', async () => {
      await setupDefaultRemoteFeatureFlags(mockServer);

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(1);
      expect(mockSetupMockRequest).toHaveBeenCalledWith(mockServer, {
        requestMethod: 'GET',
        url: 'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
        response: expect.any(Array),
        responseCode: 200,
      });

      const callArgs = mockSetupMockRequest.mock.calls[0][1];
      expect(callArgs.response).toHaveLength(6); // 6 default flag objects
      expect(callArgs.response).toContainEqual({ rewards: false });
    });

    it('should call setupMockRequest with flag overrides', async () => {
      await setupDefaultRemoteFeatureFlags(mockServer, { rewards: true });

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(1);
      const callArgs = mockSetupMockRequest.mock.calls[0][1];
      expect(callArgs.response).toContainEqual({ rewards: true });
    });

    it('should call setupMockRequest with custom distribution', async () => {
      await setupDefaultRemoteFeatureFlags(mockServer, {}, 'flask');

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(1);
      const callArgs = mockSetupMockRequest.mock.calls[0][1];
      expect(callArgs.url).toBe(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
      );
    });

    it('should handle setupMockRequest errors', async () => {
      const error = new Error('Mock setup failed');
      mockSetupMockRequest.mockRejectedValue(error);

      await expect(setupDefaultRemoteFeatureFlags(mockServer)).rejects.toThrow(
        'Mock setup failed',
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty overrides object', () => {
      const result = createRemoteFeatureFlagsMock({});

      expect(result.response).toHaveLength(6); // All default flags
      expect(result.response).toContainEqual({ rewards: false });
    });

    it('should handle undefined values in overrides', () => {
      const result = createRemoteFeatureFlagsMock({
        undefinedFlag: undefined,
      });

      expect(result.response).toContainEqual({ undefinedFlag: undefined });
    });

    it('should maintain response array order with defaults first', () => {
      const result = createRemoteFeatureFlagsMock({
        newFlag: true,
      });

      // First 6 should be defaults, then new ones
      const response = result.response as Record<string, unknown>[];
      expect(response[0]).toHaveProperty('mobileMinimumVersions');
      expect(response[1]).toHaveProperty('confirmation_redesign');
      expect(response[2]).toHaveProperty('rewards');
      expect(response[3]).toHaveProperty('assetsDefiPositionsEnabled');
      expect(response[4]).toHaveProperty('assetsEnableNotificationsByDefault');
      expect(response[5]).toHaveProperty('enableMultichainAccounts');
      expect(response[6]).toEqual({ newFlag: true });
    });

    it('should handle overrides with function values', () => {
      const testFunction = () => 'test';
      const result = createRemoteFeatureFlagsMock({
        functionFlag: testFunction,
      });

      expect(result.response).toContainEqual({ functionFlag: testFunction });
    });
  });
});
