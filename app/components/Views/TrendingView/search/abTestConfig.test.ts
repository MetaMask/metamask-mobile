// abTestConfig — structural tests
//
// Verifies flag key, variant names, and analytics mapping are correctly wired
// so a misconfiguration (e.g. wrong flag key or missing event) is caught
// before shipping to LaunchDarkly.

import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING,
  ExploreQuickBuyVariant,
} from './abTestConfig';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';

describe('EXPLORE_QUICK_BUY_AB_KEY', () => {
  it('matches the LaunchDarkly flag name', () => {
    expect(EXPLORE_QUICK_BUY_AB_KEY).toBe(
      'assetsASSETS3380AbtestExploreQuickBuy',
    );
  });
});

describe('EXPLORE_QUICK_BUY_VARIANTS', () => {
  it('control hides the quick trade button', () => {
    expect(
      EXPLORE_QUICK_BUY_VARIANTS[ExploreQuickBuyVariant.Control]
        .showQuickTradeButton,
    ).toBe(false);
  });

  it('treatment shows the quick trade button', () => {
    expect(
      EXPLORE_QUICK_BUY_VARIANTS[ExploreQuickBuyVariant.Treatment]
        .showQuickTradeButton,
    ).toBe(true);
  });

  it('includes a control variant (required by useABTest)', () => {
    expect(ExploreQuickBuyVariant.Control).toBe('control');
  });
});

describe('EXPLORE_QUICK_BUY_EXPOSURE_METADATA', () => {
  it('has human-readable variation names for both variants', () => {
    expect(
      EXPLORE_QUICK_BUY_EXPOSURE_METADATA.variationNames[
        ExploreQuickBuyVariant.Control
      ],
    ).toBeTruthy();
    expect(
      EXPLORE_QUICK_BUY_EXPOSURE_METADATA.variationNames[
        ExploreQuickBuyVariant.Treatment
      ],
    ).toBeTruthy();
  });
});

describe('EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING', () => {
  it('uses the correct flag key', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
      EXPLORE_QUICK_BUY_AB_KEY,
    );
  });

  it('includes all valid variants', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.validVariants).toEqual(
      expect.arrayContaining(Object.values(ExploreQuickBuyVariant)),
    );
  });

  it('enriches SOCIAL_QUICK_BUY_SHEET_VIEWED', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.eventNames).toContain(
      EVENT_NAME.SOCIAL_QUICK_BUY_SHEET_VIEWED,
    );
  });

  it('enriches SOCIAL_QUICK_BUY_TRADE_SUBMITTED', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.eventNames).toContain(
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
    );
  });

  it('enriches SOCIAL_QUICK_BUY_TRADE_COMPLETED', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.eventNames).toContain(
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
    );
  });

  it('enriches SOCIAL_QUICK_BUY_DISMISSED', () => {
    expect(EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING.eventNames).toContain(
      EVENT_NAME.SOCIAL_QUICK_BUY_DISMISSED,
    );
  });
});
