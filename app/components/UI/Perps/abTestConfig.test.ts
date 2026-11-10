import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { PerpsMode } from '@metamask/perps-controller';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';
import {
  FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING,
  FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS,
  FEE_DISPLAY_AB_TEST_KEY,
  FEE_DISPLAY_VARIANTS,
  FeeDisplayVariant,
  PERPS_HEADER_AB_TEST_ANALYTICS_MAPPING,
  PERPS_HEADER_AB_TEST_KEY,
  PERPS_HEADER_NAV_VARIANTS,
  PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING,
  PERPS_HOME_EXPLORE_AB_TEST_KEY,
  PERPS_HOME_EXPLORE_VARIANTS,
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  PerpsHeaderNavVariant,
  PerpsHomeExploreVariant,
  SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING,
  SCREEN_VS_BOTTOM_SHEET_VARIANTS,
  ScreenVsBottomSheetVariant,
  PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING,
  PERPS_LIVE_TRADES_AB_TEST_KEY,
  PERPS_LIVE_TRADES_VARIANTS,
  PerpsLiveTradesVariant,
} from './abTestConfig';

describe('Perps abTestConfig', () => {
  describe('PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY).toBe(
        'perpsTAT3938AbtestScreenVsBottomSheet',
      );
      expect(PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('SCREEN_VS_BOTTOM_SHEET_VARIANTS', () => {
    it('includes a control variant', () => {
      expect(SCREEN_VS_BOTTOM_SHEET_VARIANTS).toHaveProperty(
        ScreenVsBottomSheetVariant.Control,
      );
    });

    it('maps control to the screen presentation', () => {
      expect(
        SCREEN_VS_BOTTOM_SHEET_VARIANTS[ScreenVsBottomSheetVariant.Control],
      ).toEqual({ useBottomSheet: false });
    });

    it('maps the bottom-sheet experience to bottom-sheet presentation', () => {
      expect(
        SCREEN_VS_BOTTOM_SHEET_VARIANTS[ScreenVsBottomSheetVariant.Treatment],
      ).toEqual({ useBottomSheet: true });
    });
  });

  describe('SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING', () => {
    it('references the screen-vs-bottom-sheet flag key', () => {
      expect(SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
        PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
      );
    });

    it('declares control and treatment as valid variants', () => {
      expect(
        SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING.validVariants,
      ).toEqual([
        ScreenVsBottomSheetVariant.Control,
        ScreenVsBottomSheetVariant.Treatment,
      ]);
    });

    it('registers the position-management and trade conversion events', () => {
      expect(
        SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING.eventNames,
      ).toEqual([
        EVENT_NAME.PERPS_POSITION_CLOSE_TRANSACTION,
        EVENT_NAME.PERPS_MARGIN_ADJUSTMENT_TRANSACTION,
        EVENT_NAME.PERPS_TRANSACTION_CONSIDERED,
        EVENT_NAME.PERPS_TRADE_QUOTE_RECEIVED,
        EVENT_NAME.PERPS_TRADE_TRANSACTION,
      ]);
    });
  });

  describe('PERPS_HEADER_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_HEADER_AB_TEST_KEY).toBe(
        'perpsTAT4021AbtestPerpsHeaderMarketList',
      );
      expect(PERPS_HEADER_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('PERPS_HEADER_NAV_VARIANTS', () => {
    it('includes a control variant that keeps the last-viewed market', () => {
      expect(PERPS_HEADER_NAV_VARIANTS[PerpsHeaderNavVariant.Control]).toEqual({
        destination: 'lastViewedMarket',
      });
    });

    it('maps treatment to the market list', () => {
      expect(
        PERPS_HEADER_NAV_VARIANTS[PerpsHeaderNavVariant.Treatment],
      ).toEqual({ destination: 'marketList' });
    });
  });

  describe('PERPS_HEADER_AB_TEST_ANALYTICS_MAPPING', () => {
    it('enriches pro-mode tap-through and trade events only', () => {
      expect(PERPS_HEADER_AB_TEST_ANALYTICS_MAPPING).toEqual({
        flagKey: PERPS_HEADER_AB_TEST_KEY,
        validVariants: [
          PerpsHeaderNavVariant.Control,
          PerpsHeaderNavVariant.Treatment,
        ],
        eventNames: [
          EVENT_NAME.PERPS_UI_INTERACTION,
          EVENT_NAME.PERPS_SCREEN_VIEWED,
          EVENT_NAME.PERPS_TRADE_TRANSACTION,
        ],
        injectWhenPropertiesMatch: {
          perps_mode: PerpsMode.Pro,
        },
      });
    });

    it('is registered for shared-path active_ab_tests enrichment', () => {
      expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
        PERPS_HEADER_AB_TEST_ANALYTICS_MAPPING,
      );
    });
  });

  describe('PERPS_HOME_EXPLORE_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_HOME_EXPLORE_AB_TEST_KEY).toBe(
        'perpsTAT3793AbtestPerpsHomeExplore',
      );
      expect(PERPS_HOME_EXPLORE_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('PERPS_HOME_EXPLORE_VARIANTS', () => {
    it('includes a control variant', () => {
      expect(PERPS_HOME_EXPLORE_VARIANTS).toHaveProperty(
        PerpsHomeExploreVariant.Control,
      );
    });

    it('maps control to the stacked sections', () => {
      expect(
        PERPS_HOME_EXPLORE_VARIANTS[PerpsHomeExploreVariant.Control],
      ).toEqual({ showExploreTable: false });
    });

    it('maps treatment to the explore table', () => {
      expect(
        PERPS_HOME_EXPLORE_VARIANTS[PerpsHomeExploreVariant.Treatment],
      ).toEqual({ showExploreTable: true });
    });
  });

  describe('PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING', () => {
    it('references the explore flag key', () => {
      expect(PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
        PERPS_HOME_EXPLORE_AB_TEST_KEY,
      );
    });

    it('declares control and treatment as valid variants', () => {
      expect(
        PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING.validVariants,
      ).toEqual([
        PerpsHomeExploreVariant.Control,
        PerpsHomeExploreVariant.Treatment,
      ]);
    });

    it('registers the home, trade, watchlist, and error events', () => {
      expect(PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING.eventNames).toEqual([
        EVENT_NAME.PERPS_SCREEN_VIEWED,
        EVENT_NAME.PERPS_UI_INTERACTION,
        EVENT_NAME.PERPS_TRANSACTION_CONSIDERED,
        EVENT_NAME.PERPS_TRADE_TRANSACTION,
        EVENT_NAME.PERPS_ERROR,
      ]);
    });

    it('is registered for shared-path active_ab_tests enrichment', () => {
      expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
        PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING,
      );
    });
  });

  describe('FEE_DISPLAY_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(FEE_DISPLAY_AB_TEST_KEY).toBe(
        'perpsTAT4046AbtestFeeDisplayFormat',
      );
      expect(FEE_DISPLAY_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('FEE_DISPLAY_VARIANTS', () => {
    it('includes a control variant', () => {
      expect(FEE_DISPLAY_VARIANTS).toHaveProperty(FeeDisplayVariant.Control);
    });

    it('maps control to the dollar fee amount', () => {
      expect(FEE_DISPLAY_VARIANTS[FeeDisplayVariant.Control]).toEqual({
        feeDisplayMode: 'dollar',
      });
    });

    it('maps treatment to the taker/maker percentage rates', () => {
      expect(FEE_DISPLAY_VARIANTS[FeeDisplayVariant.Treatment]).toEqual({
        feeDisplayMode: 'percentage',
      });
    });
  });

  describe('FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS', () => {
    it('names the experiment and both variations for exposure tracking', () => {
      expect(FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS).toEqual({
        experimentName: 'Perps Fee Display Format',
        variationNames: {
          control: 'Dollar fee amount',
          treatment: 'Taker/Maker percentage rates',
        },
      });
    });
  });

  describe('FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING', () => {
    it('references the fee display flag key', () => {
      expect(FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
        FEE_DISPLAY_AB_TEST_KEY,
      );
    });

    it('declares control and treatment as valid variants', () => {
      expect(FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING.validVariants).toEqual([
        FeeDisplayVariant.Control,
        FeeDisplayVariant.Treatment,
      ]);
    });

    it('registers the screen viewed and trade transaction events', () => {
      expect(FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING.eventNames).toEqual([
        EVENT_NAME.PERPS_SCREEN_VIEWED,
        EVENT_NAME.PERPS_TRADE_TRANSACTION,
      ]);
    });

    it('is registered for shared-path active_ab_tests enrichment', () => {
      expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
        FEE_DISPLAY_AB_TEST_ANALYTICS_MAPPING,
      );
    });
  });

  describe('PERPS_LIVE_TRADES_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_LIVE_TRADES_AB_TEST_KEY).toBe(
        'perpsTAT4267AbtestLiveTrades',
      );
      expect(PERPS_LIVE_TRADES_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('PERPS_LIVE_TRADES_VARIANTS', () => {
    it('maps control to the section without Live trades', () => {
      expect(
        PERPS_LIVE_TRADES_VARIANTS[PerpsLiveTradesVariant.Control],
      ).toEqual({ showLiveTrades: false });
    });

    it('maps treatment to Live trades', () => {
      expect(
        PERPS_LIVE_TRADES_VARIANTS[PerpsLiveTradesVariant.Treatment],
      ).toEqual({ showLiveTrades: true });
    });
  });

  describe('PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING', () => {
    it('references the live trades flag key', () => {
      expect(PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
        PERPS_LIVE_TRADES_AB_TEST_KEY,
      );
    });

    it('declares control and treatment as valid variants', () => {
      expect(PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING.validVariants).toEqual(
        [PerpsLiveTradesVariant.Control, PerpsLiveTradesVariant.Treatment],
      );
    });

    it('registers the home, trade, and error events', () => {
      expect(PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING.eventNames).toEqual([
        EVENT_NAME.PERPS_SCREEN_VIEWED,
        EVENT_NAME.PERPS_UI_INTERACTION,
        EVENT_NAME.PERPS_TRANSACTION_CONSIDERED,
        EVENT_NAME.PERPS_TRADE_TRANSACTION,
        EVENT_NAME.PERPS_ERROR,
      ]);
    });

    it('is registered for shared-path active_ab_tests enrichment', () => {
      expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
        PERPS_LIVE_TRADES_AB_TEST_ANALYTICS_MAPPING,
      );
    });
  });
});
