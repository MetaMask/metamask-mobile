import {
  getHomepageSectionMountMode,
  shouldPlacePerpsAboveTokens,
  shouldPlaceTopTradersAboveAllocation,
  shouldShowTopTradersAboveAllocation,
} from './homepageSectionMountPolicy';

describe('getHomepageSectionMountMode', () => {
  it.each([
    ['LOW', 'NONE', 'when_network_available'],
    ['MID', 'NONE', 'when_network_available'],
    ['HIGH', 'NONE', 'when_network_available'],
    [null, 'NONE', 'when_network_available'],
    ['LOW', 'SLOW_CELLULAR', 'after_primary_content'],
    ['MID', 'SLOW_CELLULAR', 'after_primary_content'],
    ['HIGH', 'SLOW_CELLULAR', 'after_primary_content'],
    [null, 'SLOW_CELLULAR', 'after_primary_content'],
    ['LOW', 'FAST_CELLULAR', 'after_primary_content'],
    ['LOW', 'WIFI', 'after_primary_content'],
    ['MID', 'FAST_CELLULAR', 'immediate'],
    ['MID', 'WIFI', 'immediate'],
    ['HIGH', 'FAST_CELLULAR', 'immediate'],
    ['HIGH', 'WIFI', 'immediate'],
    [null, 'FAST_CELLULAR', 'immediate'],
    [null, 'WIFI', 'immediate'],
    ['LOW', null, 'immediate'],
    ['MID', null, 'immediate'],
    ['HIGH', null, 'immediate'],
    [null, null, 'immediate'],
  ] as const)(
    'hardware=%s and network=%s uses %s',
    (hardwareTier, networkTier, expectedMode) => {
      expect(
        getHomepageSectionMountMode({
          hardwareTier,
          networkTier,
        }),
      ).toBe(expectedMode);
    },
  );
});

describe('shouldPlacePerpsAboveTokens', () => {
  it('keeps deferred Perps below Tokens even when the experiment is eligible', () => {
    expect(
      shouldPlacePerpsAboveTokens({
        optionalSectionsCanMount: false,
        isPerpsEnabled: true,
        perpsAboveTokensEligible: true,
        isActivePerpsTrader: true,
      }),
    ).toBe(false);
  });

  it('preserves the above-Tokens placement for immediately mounted eligible Perps', () => {
    expect(
      shouldPlacePerpsAboveTokens({
        optionalSectionsCanMount: true,
        isPerpsEnabled: true,
        perpsAboveTokensEligible: true,
        isActivePerpsTrader: true,
      }),
    ).toBe(true);
  });

  it.each([
    ['Perps disabled', false, true, true],
    ['experiment ineligible', true, false, true],
    ['inactive trader', true, true, false],
  ])(
    '%s keeps Perps below Tokens',
    (_label, isPerpsEnabled, eligible, active) => {
      expect(
        shouldPlacePerpsAboveTokens({
          optionalSectionsCanMount: true,
          isPerpsEnabled,
          perpsAboveTokensEligible: eligible,
          isActivePerpsTrader: active,
        }),
      ).toBe(false);
    },
  );
});

describe('shouldPlaceTopTradersAboveAllocation', () => {
  it('keeps deferred Top Traders below allocation even when eligible', () => {
    expect(
      shouldPlaceTopTradersAboveAllocation({
        optionalSectionsCanMount: false,
        isSocialV1PriorityEnabled: true,
        isSocialTopTradersEligible: true,
      }),
    ).toBe(false);
  });

  it('places eligible Top Traders above allocation when mounted immediately', () => {
    expect(
      shouldPlaceTopTradersAboveAllocation({
        optionalSectionsCanMount: true,
        isSocialV1PriorityEnabled: true,
        isSocialTopTradersEligible: true,
      }),
    ).toBe(true);
  });

  it.each([
    ['Social V1 disabled', false, true],
    ['user ineligible', true, false],
  ])('%s keeps Top Traders below allocation', (_label, enabled, eligible) => {
    expect(
      shouldPlaceTopTradersAboveAllocation({
        optionalSectionsCanMount: true,
        isSocialV1PriorityEnabled: enabled,
        isSocialTopTradersEligible: eligible,
      }),
    ).toBe(false);
  });
});

describe('shouldShowTopTradersAboveAllocation', () => {
  it('keeps the frozen placement disabled when either live feature flag is off', () => {
    expect(
      shouldShowTopTradersAboveAllocation({
        topTradersAboveAllocationPlacement: true,
        shouldMountOptionalSections: true,
        isTopTradersEnabled: false,
        isSocialV1PriorityEnabled: true,
      }),
    ).toBe(false);

    expect(
      shouldShowTopTradersAboveAllocation({
        topTradersAboveAllocationPlacement: true,
        shouldMountOptionalSections: true,
        isTopTradersEnabled: true,
        isSocialV1PriorityEnabled: false,
      }),
    ).toBe(false);
  });

  it('shows Top Traders when the frozen placement and live gates are enabled', () => {
    expect(
      shouldShowTopTradersAboveAllocation({
        topTradersAboveAllocationPlacement: true,
        shouldMountOptionalSections: true,
        isTopTradersEnabled: true,
        isSocialV1PriorityEnabled: true,
      }),
    ).toBe(true);
  });
});
