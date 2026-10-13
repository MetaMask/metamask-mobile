import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import {
  QuickBuyEntrypointVariant,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_TEST_ANALYTICS_MAPPING,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS,
} from './abTestConfig';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';

describe('SWAPS-5094 Quick Buy entrypoints A/B test', () => {
  it('defines the expected variants with control as the fallback', () => {
    expect(SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY).toBe(
      'swapsSWAPS5094AbtestQuickBuyEntrypoints',
    );
    expect(Object.keys(SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS)).toEqual([
      QuickBuyEntrypointVariant.Control,
      QuickBuyEntrypointVariant.Treatment1,
      QuickBuyEntrypointVariant.Treatment2,
    ]);
    expect(SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS.control).toEqual({
      footerLayout: 'lightning_swap_buy',
    });
  });

  it('registers the TDP and Quick Buy business events', () => {
    expect(
      SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_TEST_ANALYTICS_MAPPING.eventNames,
    ).toEqual([
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      EVENT_NAME.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
    ]);
  });

  it('is registered for shared analytics enrichment', () => {
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_TEST_ANALYTICS_MAPPING,
    );
  });
});
