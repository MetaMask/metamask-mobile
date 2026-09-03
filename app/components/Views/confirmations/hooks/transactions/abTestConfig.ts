import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `confirmations`, ticket CONF-1775).
 *
 * @see https://consensyssoftware.atlassian.net/browse/CONF-1775
 */
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY =
  'confirmationsCONF1775AbtestMoneyAccountDepositPrefill';

export enum MoneyAccountDepositPrefillVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface MoneyAccountDepositPrefillVariantConfig {
  /** When true, money account deposit amount is prefilled. */
  prefillEnabled: boolean;
}

export const MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS: Record<
  MoneyAccountDepositPrefillVariant,
  MoneyAccountDepositPrefillVariantConfig
> = {
  [MoneyAccountDepositPrefillVariant.Control]: {
    prefillEnabled: false,
  },
  [MoneyAccountDepositPrefillVariant.Treatment]: {
    prefillEnabled: true,
  },
};

/**
 * Shared third argument for `useABTest` on this experiment (exposure +
 * consistent variation labels).
 */
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Money Account Deposit Prefill',
  variationNames: {
    control: 'Deposit amount not prefilled',
    treatment: 'Deposit amount prefilled',
  },
} as const;

/** Location property on Confirmation Screen Viewed for Money Account deposit Info. */
export const MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION =
  'money_account_deposit' as const;

/**
 * Auto-enrich Confirmation Screen Viewed from MoneyAccountDepositInfo with
 * `active_ab_tests` for this experiment.
 */
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
    validVariants: Object.values(MoneyAccountDepositPrefillVariant),
    // Confirmation events live outside MetaMetrics EVENT_NAME; use the emitted name.
    eventNames: ['Confirmation Screen Viewed'],
    eventPropertyRequirements: {
      'Confirmation Screen Viewed': {
        location: MONEY_ACCOUNT_DEPOSIT_CONFIRMATION_LOCATION,
      },
    },
  };

// Keep RAMPS funnel events in sync when the amount Info is shown (same surface).
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_RAMPS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
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
  };
