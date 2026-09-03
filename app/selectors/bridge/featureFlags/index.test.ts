import type { CaipChainId, Json } from '@metamask/utils';
import {
  selectBridgeLimitOrderFeatureFlags,
  selectBridgeLimitOrderTabEnabledFlag,
  selectBridgeRecurringBuyFeatureFlags,
  selectBridgeRecurringBuyTabEnabledFlag,
} from '.';
import {
  mockedEmptyFlagsState,
  mockedUndefinedFlagsState,
} from '../../featureFlagController/mocks';

const LIMIT_ORDER_CHAIN_IDS: CaipChainId[] = ['eip155:1', 'eip155:8453'];
const RECURRING_BUY_CHAIN_IDS: CaipChainId[] = ['eip155:1', 'eip155:56'];

const buildStateWithRemoteFlags = (
  remoteFeatureFlags: Record<string, Json>,
) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags,
        cacheTimestamp: 0,
      },
    },
  },
});

describe('selectBridgeLimitOrderFeatureFlags', () => {
  it('returns the remote flag object with its enabled chain list', () => {
    const state = buildStateWithRemoteFlags({
      swapsLimitOrder: {
        enabled: true,
        enabledChainIds: LIMIT_ORDER_CHAIN_IDS,
      },
    });

    const result = selectBridgeLimitOrderFeatureFlags(state);

    expect(result).toEqual({
      enabled: true,
      enabledChainIds: LIMIT_ORDER_CHAIN_IDS,
    });
  });

  it('returns disabled with an empty chain list when the remote flag is disabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsLimitOrder: { enabled: false, enabledChainIds: [] },
    });

    const result = selectBridgeLimitOrderFeatureFlags(state);

    expect(result).toEqual({ enabled: false, enabledChainIds: [] });
  });

  it('returns undefined when the swapsLimitOrder remote flag is missing', () => {
    const result = selectBridgeLimitOrderFeatureFlags(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectBridgeLimitOrderFeatureFlags(
      mockedUndefinedFlagsState,
    );

    expect(result).toBeUndefined();
  });
});

describe('selectBridgeRecurringBuyFeatureFlags', () => {
  it('returns the remote flag object with its enabled chain list', () => {
    const state = buildStateWithRemoteFlags({
      swapsRecurringBuy: {
        enabled: true,
        enabledChainIds: RECURRING_BUY_CHAIN_IDS,
      },
    });

    const result = selectBridgeRecurringBuyFeatureFlags(state);

    expect(result).toEqual({
      enabled: true,
      enabledChainIds: RECURRING_BUY_CHAIN_IDS,
    });
  });

  it('returns disabled with an empty chain list when the remote flag is disabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsRecurringBuy: { enabled: false, enabledChainIds: [] },
    });

    const result = selectBridgeRecurringBuyFeatureFlags(state);

    expect(result).toEqual({ enabled: false, enabledChainIds: [] });
  });

  it('returns undefined when the swapsRecurringBuy remote flag is missing', () => {
    const result = selectBridgeRecurringBuyFeatureFlags(mockedEmptyFlagsState);

    expect(result).toBeUndefined();
  });

  it('returns undefined when RemoteFeatureFlagController state is undefined', () => {
    const result = selectBridgeRecurringBuyFeatureFlags(
      mockedUndefinedFlagsState,
    );

    expect(result).toBeUndefined();
  });
});

describe('selectBridgeLimitOrderTabEnabledFlag', () => {
  it('returns true when the remote flag is enabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsLimitOrder: {
        enabled: true,
        enabledChainIds: LIMIT_ORDER_CHAIN_IDS,
      },
    });

    const result = selectBridgeLimitOrderTabEnabledFlag(state);

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsLimitOrder: { enabled: false, enabledChainIds: [] },
    });

    const result = selectBridgeLimitOrderTabEnabledFlag(state);

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is missing', () => {
    const result = selectBridgeLimitOrderTabEnabledFlag(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectBridgeLimitOrderTabEnabledFlag(
      mockedUndefinedFlagsState,
    );

    expect(result).toBe(false);
  });
});

describe('selectBridgeRecurringBuyTabEnabledFlag', () => {
  it('returns true when the remote flag is enabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsRecurringBuy: {
        enabled: true,
        enabledChainIds: RECURRING_BUY_CHAIN_IDS,
      },
    });

    const result = selectBridgeRecurringBuyTabEnabledFlag(state);

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const state = buildStateWithRemoteFlags({
      swapsRecurringBuy: { enabled: false, enabledChainIds: [] },
    });

    const result = selectBridgeRecurringBuyTabEnabledFlag(state);

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is missing', () => {
    const result = selectBridgeRecurringBuyTabEnabledFlag(
      mockedEmptyFlagsState,
    );

    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectBridgeRecurringBuyTabEnabledFlag(
      mockedUndefinedFlagsState,
    );

    expect(result).toBe(false);
  });
});
