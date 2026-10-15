import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING,
  SCREEN_VS_BOTTOM_SHEET_VARIANTS,
  ScreenVsBottomSheetVariant,
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
});
