import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { resolveABTestAssignment } from '../../../util/abTest';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../util/analytics/abTestAnalyticsRegistry';
import { createActiveABTestAssignment } from '../../../util/analytics/activeABTestAssignments';
import { MONEY_BUTTON_INTENTS } from './constants/moneyButtonEvents';
import { SCREEN_NAMES } from './constants/moneyEventLocations';
import {
  MONEY_HOME_SEND_ACTION_AB_KEY,
  MONEY_HOME_SEND_ACTION_AB_TEST_ANALYTICS_MAPPING,
  MONEY_HOME_SEND_ACTION_VARIANTS,
  MoneyHomeSendActionVariant,
  getMoneyHomeSendActionTransactionActiveAbTests,
} from './abTestConfig';

describe('Money home send action A/B test', () => {
  it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
    expect(MONEY_HOME_SEND_ACTION_AB_KEY).toBe(
      'earnEARN0AbtestMoneyHomeSendLabel',
    );
    expect(MONEY_HOME_SEND_ACTION_AB_KEY).toMatch(
      /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
    );
  });

  it('defines control and withdraw copy', () => {
    expect(Object.keys(MONEY_HOME_SEND_ACTION_VARIANTS)).toEqual([
      MoneyHomeSendActionVariant.Control,
      MoneyHomeSendActionVariant.Withdraw,
    ]);
    expect(MONEY_HOME_SEND_ACTION_VARIANTS.control).toEqual({
      labelKey: 'money.action.transfer',
      sheetTitleKey: 'money.transfer_sheet.title',
      destinationLabelKey: 'money.transfer_sheet.between_accounts',
    });
    expect(MONEY_HOME_SEND_ACTION_VARIANTS.withdraw).toEqual({
      labelKey: 'money.action.withdraw',
      sheetTitleKey: 'money.transfer_sheet.title_withdraw',
      destinationLabelKey: 'money.transfer_sheet.wallet',
    });
  });

  it('falls back to control when the flag is absent or invalid', () => {
    const validVariants = Object.values(MoneyHomeSendActionVariant);

    expect(
      resolveABTestAssignment({}, MONEY_HOME_SEND_ACTION_AB_KEY, validVariants),
    ).toEqual({ variantName: 'control', isActive: false });

    expect(
      resolveABTestAssignment(
        { [MONEY_HOME_SEND_ACTION_AB_KEY]: 'not-a-variant' },
        MONEY_HOME_SEND_ACTION_AB_KEY,
        validVariants,
      ),
    ).toEqual({ variantName: 'control', isActive: false });

    expect(
      resolveABTestAssignment(
        { [MONEY_HOME_SEND_ACTION_AB_KEY]: 'moveToWallet' },
        MONEY_HOME_SEND_ACTION_AB_KEY,
        validVariants,
      ),
    ).toEqual({ variantName: 'control', isActive: false });

    expect(
      resolveABTestAssignment(
        { [MONEY_HOME_SEND_ACTION_AB_KEY]: 'withdraw' },
        MONEY_HOME_SEND_ACTION_AB_KEY,
        validVariants,
      ),
    ).toEqual({ variantName: 'withdraw', isActive: true });
  });

  it('tags the Money home send tap and is registered for enrichment', () => {
    expect(MONEY_HOME_SEND_ACTION_AB_TEST_ANALYTICS_MAPPING).toEqual({
      flagKey: MONEY_HOME_SEND_ACTION_AB_KEY,
      validVariants: Object.values(MoneyHomeSendActionVariant),
      eventNames: [EVENT_NAME.MONEY_BUTTON_CLICKED],
      eventPropertyRequirements: {
        [EVENT_NAME.MONEY_BUTTON_CLICKED]: {
          button_intent: MONEY_BUTTON_INTENTS.TRANSFER_MONEY,
          screen_name: SCREEN_NAMES.MONEY_HOME,
        },
      },
    });
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      MONEY_HOME_SEND_ACTION_AB_TEST_ANALYTICS_MAPPING,
    );
  });

  it('stages transaction attribution only while the assignment is active', () => {
    expect(
      getMoneyHomeSendActionTransactionActiveAbTests(false, 'withdraw'),
    ).toBeUndefined();
    expect(
      getMoneyHomeSendActionTransactionActiveAbTests(true, 'withdraw'),
    ).toEqual([
      createActiveABTestAssignment(MONEY_HOME_SEND_ACTION_AB_KEY, 'withdraw'),
    ]);
  });
});
