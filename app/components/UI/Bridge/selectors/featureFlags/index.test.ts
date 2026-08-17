import {
  selectBridgeLimitOrderTabEnabledFlag,
  selectBridgeRecurringBuyTabEnabledFlag,
} from '.';
import {
  mockedEmptyFlagsState,
  mockedUndefinedFlagsState,
} from '../../../../../selectors/featureFlagController/mocks';

const mockedStateWithBothTabsEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          swapsLimitOrder: { enabled: true },
          swapsRecurringBuy: { enabled: true },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithBothTabsDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          swapsLimitOrder: { enabled: false },
          swapsRecurringBuy: { enabled: false },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

describe('selectBridgeLimitOrderTabEnabledFlag', () => {
  it('returns true when the remote flag is enabled', () => {
    expect(
      selectBridgeLimitOrderTabEnabledFlag(mockedStateWithBothTabsEnabled),
    ).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    expect(
      selectBridgeLimitOrderTabEnabledFlag(mockedStateWithBothTabsDisabled),
    ).toBe(false);
  });

  it('falls back to false when the remote flag is missing and no local override is set', () => {
    expect(selectBridgeLimitOrderTabEnabledFlag(mockedEmptyFlagsState)).toBe(
      false,
    );
  });

  it('returns false when controller state is undefined', () => {
    expect(
      selectBridgeLimitOrderTabEnabledFlag(mockedUndefinedFlagsState),
    ).toBe(false);
  });
});

describe('selectBridgeRecurringBuyTabEnabledFlag', () => {
  it('returns true when the remote flag is enabled', () => {
    expect(
      selectBridgeRecurringBuyTabEnabledFlag(mockedStateWithBothTabsEnabled),
    ).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    expect(
      selectBridgeRecurringBuyTabEnabledFlag(mockedStateWithBothTabsDisabled),
    ).toBe(false);
  });

  it('falls back to false when the remote flag is missing and no local override is set', () => {
    expect(selectBridgeRecurringBuyTabEnabledFlag(mockedEmptyFlagsState)).toBe(
      false,
    );
  });

  it('returns false when controller state is undefined', () => {
    expect(
      selectBridgeRecurringBuyTabEnabledFlag(mockedUndefinedFlagsState),
    ).toBe(false);
  });
});
