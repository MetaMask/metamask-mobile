import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';
import {
  BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING,
  BUTTON_COLOR_VARIANTS,
  ButtonColorVariant,
  PERPS_BUTTON_COLOR_AB_TEST_KEY,
  PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING,
  PERPS_HOME_EXPLORE_AB_TEST_KEY,
  PERPS_HOME_EXPLORE_VARIANTS,
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  PerpsHomeExploreVariant,
  SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING,
  SCREEN_VS_BOTTOM_SHEET_VARIANTS,
  ScreenVsBottomSheetVariant,
} from './abTestConfig';

describe('Perps abTestConfig', () => {
  describe('PERPS_BUTTON_COLOR_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_BUTTON_COLOR_AB_TEST_KEY).toBe(
        'perpsTAT1937AbtestButtonColor',
      );
      expect(PERPS_BUTTON_COLOR_AB_TEST_KEY).toMatch(
        /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
      );
    });
  });

  describe('BUTTON_COLOR_VARIANTS', () => {
    it('includes a control variant', () => {
      expect(BUTTON_COLOR_VARIANTS).toHaveProperty(ButtonColorVariant.Control);
    });

    it('maps control (default/fallback) to white/white', () => {
      expect(BUTTON_COLOR_VARIANTS[ButtonColorVariant.Control]).toEqual({
        long: 'white',
        short: 'white',
      });
    });

    it('maps colors to green/red', () => {
      expect(BUTTON_COLOR_VARIANTS[ButtonColorVariant.Colors]).toEqual({
        long: 'green',
        short: 'red',
      });
    });
  });

  describe('BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING', () => {
    it('references the button color flag key', () => {
      expect(BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING.flagKey).toBe(
        PERPS_BUTTON_COLOR_AB_TEST_KEY,
      );
    });

    it('declares control and colors as valid variants', () => {
      expect(BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING.validVariants).toEqual([
        ButtonColorVariant.Control,
        ButtonColorVariant.Colors,
      ]);
    });

    it('registers the screen viewed and UI interaction events', () => {
      expect(BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING.eventNames).toEqual([
        EVENT_NAME.PERPS_SCREEN_VIEWED,
        EVENT_NAME.PERPS_UI_INTERACTION,
      ]);
    });
  });

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

  describe('PERPS_HOME_EXPLORE_AB_TEST_KEY', () => {
    it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
      expect(PERPS_HOME_EXPLORE_AB_TEST_KEY).toBe(
        'tatTAT3793AbtestPerpsHomeExplore',
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
});
