import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_ANALYTICS_MAPPING,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_RAMPS_AB_TEST_ANALYTICS_MAPPING,
  MoneyAccountDepositPrefillVariant,
} from './abTestConfig';

describe('money account deposit prefill abTestConfig', () => {
  it('maps Confirmation Screen Viewed for the money account deposit Info location', () => {
    expect(MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_ANALYTICS_MAPPING).toEqual({
      flagKey: MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
      validVariants: Object.values(MoneyAccountDepositPrefillVariant),
      eventNames: ['Confirmation Screen Viewed'],
      eventPropertyRequirements: {
        'Confirmation Screen Viewed': {
          location: MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION,
        },
      },
    });
  });

  it('maps money_account ramps funnel events for the same experiment', () => {
    expect(
      MONEY_ACCOUNT_DEPOSIT_PREFILL_RAMPS_AB_TEST_ANALYTICS_MAPPING,
    ).toEqual({
      flagKey: MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
      validVariants: Object.values(MoneyAccountDepositPrefillVariant),
      eventNames: [
        EVENT_NAME.RAMPS_SCREEN_VIEWED,
        EVENT_NAME.RAMPS_ORDER_PROPOSED,
        EVENT_NAME.RAMPS_CONTINUE_BUTTON_CLICKED,
      ],
      injectWhenPropertiesMatch: {
        ramp_surface: 'money_account',
      },
    });
  });
});
