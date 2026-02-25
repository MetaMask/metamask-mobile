import { selectAdditionalNetworksBlacklistFeatureFlag } from './index';
import { StateWithPartialEngine } from '../types';
import { Json } from '@metamask/utils';

describe('selectAdditionalNetworksBlacklistFeatureFlag', () => {
  const originalEnv = process.env;

  // Helper function to create test state with proper typing
  const createTestState = (
    remoteFeatureFlags: Record<string, Json> = {},
  ): StateWithPartialEngine => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  });

  beforeEach(() => {
    // Reset environment variables (ensure non-GH path for tests that use env)
    process.env = { ...originalEnv };
    delete process.env.GITHUB_ACTIONS;
    delete process.env.E2E;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty array when feature flag is not set', () => {
    const state = createTestState();

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual([]);
  });

  it('returns chain IDs array from remote feature flag', () => {
    const state = createTestState({
      additionalNetworksBlacklist: ['0x8f', '0x531', '0x1329'],
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual(['0x8f', '0x531', '0x1329']);
  });

  it('handles empty environment variable', () => {
    const originalEnvValue = process.env.MM_ADDITIONAL_NETWORK_BLACKLIST;
    process.env.MM_ADDITIONAL_NETWORK_BLACKLIST = '';

    const state = createTestState({
      additionalNetworksBlacklist: ['0x8f', '0x531'],
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual(['0x8f', '0x531']);

    // Clean up
    process.env.MM_ADDITIONAL_NETWORK_BLACKLIST = originalEnvValue;
  });

  it('handles invalid remote value gracefully', () => {
    const state = createTestState({
      additionalNetworksBlacklist: 'not-an-array',
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual([]);
  });

  it('handles null remote value', () => {
    const state = createTestState({
      additionalNetworksBlacklist: null,
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual([]);
  });

  it('handles undefined remote value', () => {
    const state = createTestState({
      // networkBlacklist not present
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual([]);
  });

  it('validates array structure', () => {
    const state = createTestState({
      additionalNetworksBlacklist: ['0x8f', 123, null, '0x531'],
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual(['0x8f', 123, null, '0x531']);
  });

  it('when GITHUB_ACTIONS uses only remote and ignores env override', () => {
    process.env.GITHUB_ACTIONS = 'true';
    delete process.env.E2E;
    process.env.MM_ADDITIONAL_NETWORK_BLACKLIST = '0x1,0x2';

    const state = createTestState({
      additionalNetworksBlacklist: ['0x8f', '0x531'],
    });

    const result = selectAdditionalNetworksBlacklistFeatureFlag(state);
    expect(result).toEqual(['0x8f', '0x531']);
  });
});
