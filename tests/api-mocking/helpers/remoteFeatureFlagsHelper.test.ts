/**
 * Unit tests for remote feature flags helper
 */

import {
  createRemoteFeatureFlagsMock,
  setupRemoteFeatureFlagsMock,
} from './remoteFeatureFlagsHelper.ts';
import { setupMockRequest } from './mockHelpers.ts';
import type { Mockttp } from 'mockttp';

jest.mock('./mockHelpers.ts', () => ({
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
    it('returns valid default configuration', () => {
      const result = createRemoteFeatureFlagsMock();

      // Test API format
      expect(result.urlEndpoint).toBe(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      );
      expect(result.responseCode).toBe(200);
      expect(Array.isArray(result.response)).toBe(true);
    });

    it('uses flask distribution when specified', () => {
      const result = createRemoteFeatureFlagsMock({}, 'flask');

      expect(result.urlEndpoint).toBe(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
      );
    });

    it('overrides simple boolean flags', () => {
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

    it('deep merges nested objects preserving existing properties', () => {
      // Get baseline to compare against
      const baseline = createRemoteFeatureFlagsMock();
      const baselineResponse = baseline.response as Record<string, unknown>[];
      const baselineConfirmation = baselineResponse.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );

      // Test deep merge behavior
      const result = createRemoteFeatureFlagsMock({
        confirmation_redesign: {
          newProperty: 'test', // Add new property
          signatures: false, // Override existing property
        },
      });

      const response = result.response as Record<string, unknown>[];
      const confirmationObj = response.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );

      // Should have the new property
      const confirmationData = (
        confirmationObj as Record<string, Record<string, unknown>>
      ).confirmation_redesign;
      expect(confirmationData.newProperty).toBe('test');
      // Should have overridden property
      expect(confirmationData.signatures).toBe(false);
      // Should preserve other default properties from baseline
      if (baselineConfirmation) {
        const baselineData = (
          baselineConfirmation as Record<string, Record<string, unknown>>
        ).confirmation_redesign;
        const baselineProps = Object.keys(baselineData);
        const resultProps = Object.keys(confirmationData);
        expect(resultProps.length).toBeGreaterThanOrEqual(baselineProps.length);
      }
    });

    it('preserves and overrides deeply nested objects', () => {
      // Test behavior: partial override should preserve other nested properties
      const result = createRemoteFeatureFlagsMock({
        enableMultichainAccounts: {
          enabled: false, // Override this
          newNestedProp: 'test', // Add this
        },
      });

      const response = result.response as Record<string, unknown>[];
      const multichainObj = response.find(
        (obj: Record<string, unknown>) => 'enableMultichainAccounts' in obj,
      );

      const multichainData = (
        multichainObj as Record<string, Record<string, unknown>>
      ).enableMultichainAccounts;
      expect(multichainData.enabled).toBe(false); // Overridden
      expect(multichainData.newNestedProp).toBe('test'); // Added
      expect(typeof multichainData.featureVersion).toBe('string'); // Preserved from defaults
      expect(typeof multichainData.minimumVersion).toBe('string'); // Preserved from defaults
    });

    it('adds new flags that do not exist in defaults', () => {
      const result = createRemoteFeatureFlagsMock({
        newCustomFlag: true,
        anotherFlag: { nested: 'value' },
      });

      expect(result.response).toContainEqual({ newCustomFlag: true });
      expect(result.response).toContainEqual({
        anotherFlag: { nested: 'value' },
      });
    });

    it('replaces array values entirely', () => {
      const result = createRemoteFeatureFlagsMock({
        arrayFlag: ['item1', 'item2', 'item3'],
      });

      expect(result.response).toContainEqual({
        arrayFlag: ['item1', 'item2', 'item3'],
      });
    });

    it('keeps arrays in nested objects without spreading', () => {
      // Test behavior: arrays should be added as-is, not spread as objects
      const testArray = [1, 2, 3];
      const result = createRemoteFeatureFlagsMock({
        confirmation_redesign: {
          customArray: testArray,
          customString: 'test',
        },
      });

      const response = result.response as Record<string, unknown>[];
      const confirmationObj = response.find(
        (obj: Record<string, unknown>) => 'confirmation_redesign' in obj,
      );

      const confirmationData = (
        confirmationObj as Record<string, Record<string, unknown>>
      ).confirmation_redesign;
      expect(Array.isArray(confirmationData.customArray)).toBe(true);
      expect(confirmationData.customArray).toEqual(testArray);
      expect(confirmationData.customString).toBe('test');
    });

    it('replaces flags with null values', () => {
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

    it('accepts mixed data types as overrides', () => {
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

    it('preserves deep nesting with multiple levels', () => {
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

    it('replaces object with array when override is an array', () => {
      const result = createRemoteFeatureFlagsMock({
        mobileMinimumVersions: [1, 2, 3], // Replace object with array
      });

      const response = result.response as Record<string, unknown>[];
      const mobileObj = response.find(
        (obj: Record<string, unknown>) => 'mobileMinimumVersions' in obj,
      );
      expect(mobileObj).toEqual({ mobileMinimumVersions: [1, 2, 3] });
    });

    it('replaces array with object when override is an object', () => {
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

  describe('setupRemoteFeatureFlagsMock', () => {
    let mockServer: jest.Mocked<Mockttp>;

    beforeEach(() => {
      mockServer = {} as jest.Mocked<Mockttp>;
      mockSetupMockRequest.mockResolvedValue(undefined);
    });

    it('calls setupMockRequest for both main and flask distributions with defaults', async () => {
      await setupRemoteFeatureFlagsMock(mockServer);

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(6);

      const expectedEnvironments = ['dev', 'test', 'prod'];
      const expectedDistributions = ['main', 'flask'];

      let callIndex = 0;
      expectedDistributions.forEach((distribution) => {
        expectedEnvironments.forEach((env) => {
          expect(mockSetupMockRequest).toHaveBeenNthCalledWith(
            callIndex + 1,
            mockServer,
            {
              requestMethod: 'GET',
              url: `https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=${distribution}&environment=${env}`,
              response: expect.any(Array),
              responseCode: 200,
            },
          );
          callIndex++;
        });
      });

      const callArgs = mockSetupMockRequest.mock.calls[0][1];
      const response = callArgs.response as Record<string, unknown>[];
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContainEqual({ addBitcoinAccountDummyFlag: false });
    });

    it('applies flag overrides to both distributions', async () => {
      await setupRemoteFeatureFlagsMock(mockServer, {
        addBitcoinAccountDummyFlag: true,
      });

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(6);
      const callArgs = mockSetupMockRequest.mock.calls[0][1];
      expect(callArgs.response).toContainEqual({
        addBitcoinAccountDummyFlag: true,
      });
    });

    it('sets up mocks for all 6 distribution-environment combinations', async () => {
      await setupRemoteFeatureFlagsMock(mockServer);

      expect(mockSetupMockRequest).toHaveBeenCalledTimes(6);

      // Check that we have calls for both distributions
      const urls = mockSetupMockRequest.mock.calls.map((call) => call[1].url);

      // Check main distribution URLs
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      );
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=test',
      );
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=prod',
      );

      // Check flask distribution URLs
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
      );
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=test',
      );
      expect(urls).toContain(
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=prod',
      );
    });

    it('rejects when setupMockRequest throws', async () => {
      const error = new Error('Mock setup failed');
      mockSetupMockRequest.mockRejectedValue(error);

      await expect(setupRemoteFeatureFlagsMock(mockServer)).rejects.toThrow(
        'Mock setup failed',
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('returns all defaults when overrides object is empty', () => {
      const result = createRemoteFeatureFlagsMock({});

      const response = result.response as Record<string, unknown>[];
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContainEqual({ addBitcoinAccountDummyFlag: false });
    });

    it('passes through undefined values in overrides', () => {
      const result = createRemoteFeatureFlagsMock({
        undefinedFlag: undefined,
      });

      expect(result.response).toContainEqual({ undefinedFlag: undefined });
    });

    it('appends new flags without removing existing defaults', () => {
      // Test behavior: new flags should be added, defaults should be preserved
      const baseline = createRemoteFeatureFlagsMock({});
      const baselineResponse = baseline.response as Record<string, unknown>[];
      const baselineCount = baselineResponse.length;

      const result = createRemoteFeatureFlagsMock({
        newFlag: true,
      });

      const response = result.response as Record<string, unknown>[];
      expect(response.length).toBe(baselineCount + 1);
      expect(response).toContainEqual({ newFlag: true });
      expect(response).toContainEqual({ addBitcoinAccountDummyFlag: false });
    });

    it('passes through function values in overrides', () => {
      const testFunction = () => 'test';
      const result = createRemoteFeatureFlagsMock({
        functionFlag: testFunction,
      });

      expect(result.response).toContainEqual({ functionFlag: testFunction });
    });
  });
});
