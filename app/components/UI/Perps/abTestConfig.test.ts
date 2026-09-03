import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import {
  BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING,
  BUTTON_COLOR_VARIANTS,
  ButtonColorVariant,
  PERPS_BUTTON_COLOR_AB_TEST_KEY,
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
});
