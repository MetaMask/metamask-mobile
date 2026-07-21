import { EVENT_NAME } from '../../../../../../core/Analytics/MetaMetrics.events';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../../../../util/analytics/abTestAnalyticsRegistry';
import {
  SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_TEST_ANALYTICS_MAPPING,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS,
  SocialAiQuickBuyKeyboardVariant,
} from './abTestConfig';

describe('Quick Buy keyboard A/B config', () => {
  it('uses the LaunchDarkly flag key created for the experiment', () => {
    expect(SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY).toBe(
      'socialAiTSA905AbtestQuickBuyKeyboard',
    );
  });

  it('maps control to the slider and treatment to the keypad', () => {
    expect(
      SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS[
        SocialAiQuickBuyKeyboardVariant.Control
      ].useKeyboard,
    ).toBe(false);
    expect(
      SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS[
        SocialAiQuickBuyKeyboardVariant.Treatment
      ].useKeyboard,
    ).toBe(true);
  });

  it('enriches only the trade conversion events with no source exclusion', () => {
    expect(SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_TEST_ANALYTICS_MAPPING).toEqual({
      flagKey: SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
      validVariants: ['control', 'treatment'],
      eventNames: [
        EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
        EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
      ],
    });
  });

  it('is registered in the shared A/B analytics registry', () => {
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_TEST_ANALYTICS_MAPPING,
    );
  });
});
