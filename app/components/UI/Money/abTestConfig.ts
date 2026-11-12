import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import { createActiveABTestAssignment } from '../../../util/analytics/activeABTestAssignments';
import type { TransactionActiveAbTestEntry } from '../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { MONEY_BUTTON_INTENTS } from './constants/moneyButtonEvents';
import { SCREEN_NAMES } from './constants/moneyEventLocations';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}`.
 *
 * Team token `earn` matches CODEOWNERS for the Money feature. No experiment
 * ticket existed when this test was added, so the ticket segment is the
 * placeholder `EARN0`. Create the LaunchDarkly flag with this exact key, or
 * rename this constant and the flag together before enabling it.
 *
 * "Withdraw" (the `withdraw` variant) needs legal/L&C sign-off before the
 * flag is enabled in production.
 */
export const MONEY_HOME_SEND_ACTION_AB_KEY =
  'earnEARN0AbtestMoneyHomeSendLabel';

export enum MoneyHomeSendActionVariant {
  Control = 'control',
  Withdraw = 'withdraw',
  MoveToWallet = 'moveToWallet',
}

interface MoneyHomeSendActionVariantConfig {
  /** i18n key for the Money home action button. */
  labelKey:
    | 'money.action.transfer'
    | 'money.action.withdraw'
    | 'money.action.move_to_wallet';
  /** i18n key for the transfer sheet title. */
  sheetTitleKey:
    | 'money.transfer_sheet.title'
    | 'money.transfer_sheet.title_withdraw'
    | 'money.transfer_sheet.title_move_to_wallet';
  /**
   * i18n key for the first destination row. Treatments lead with the user's
   * own wallet; control keeps "Another account".
   */
  destinationLabelKey:
    | 'money.transfer_sheet.between_accounts'
    | 'money.transfer_sheet.my_wallet';
}

export const MONEY_HOME_SEND_ACTION_VARIANTS: Record<
  MoneyHomeSendActionVariant,
  MoneyHomeSendActionVariantConfig
> = {
  [MoneyHomeSendActionVariant.Control]: {
    labelKey: 'money.action.transfer',
    sheetTitleKey: 'money.transfer_sheet.title',
    destinationLabelKey: 'money.transfer_sheet.between_accounts',
  },
  [MoneyHomeSendActionVariant.Withdraw]: {
    labelKey: 'money.action.withdraw',
    sheetTitleKey: 'money.transfer_sheet.title_withdraw',
    destinationLabelKey: 'money.transfer_sheet.my_wallet',
  },
  [MoneyHomeSendActionVariant.MoveToWallet]: {
    labelKey: 'money.action.move_to_wallet',
    sheetTitleKey: 'money.transfer_sheet.title_move_to_wallet',
    destinationLabelKey: 'money.transfer_sheet.my_wallet',
  },
};

export const MONEY_HOME_SEND_ACTION_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Money home send action label',
  variationNames: {
    control: 'Send',
    withdraw: 'Withdraw',
    moveToWallet: 'Move to wallet',
  },
} as const;

/**
 * Tags Money home Send taps. `label_en` still records the English label the
 * user saw; `active_ab_tests` records the assigned variant.
 */
export const MONEY_HOME_SEND_ACTION_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: MONEY_HOME_SEND_ACTION_AB_KEY,
    validVariants: Object.values(MoneyHomeSendActionVariant),
    eventNames: [EVENT_NAME.MONEY_BUTTON_CLICKED],
    eventPropertyRequirements: {
      [EVENT_NAME.MONEY_BUTTON_CLICKED]: {
        button_intent: MONEY_BUTTON_INTENTS.TRANSFER_MONEY,
        screen_name: SCREEN_NAMES.MONEY_HOME,
      },
    },
  };

/**
 * Staged onto the withdrawal transaction so Transaction Added and Transaction
 * Finalized carry the variant the user saw on Money home.
 */
export function getMoneyHomeSendActionTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }

  return [
    createActiveABTestAssignment(MONEY_HOME_SEND_ACTION_AB_KEY, variantName),
  ];
}
