import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import {
  ActionButtonType,
  ActionLocation,
} from '../../../util/analytics/actionButtonTracking';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import {
  WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
  WalletHomeOnboardingChecklistSectionName,
} from './walletHomeOnboardingChecklistAnalytics';

// ─── Wallet home onboarding: Fund step Receive button (TMCU-1939) ────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-1939).
 */
export const FUND_STEP_RECEIVE_AB_KEY =
  'homeTMCU1939AbtestFundStepReceiveButton';

export enum FundStepReceiveVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface FundStepReceiveVariantConfig {
  /** When true, the fund step shows a Receive button next to Add funds. */
  showReceiveButton: boolean;
}

export const FUND_STEP_RECEIVE_VARIANTS: Record<
  FundStepReceiveVariant,
  FundStepReceiveVariantConfig
> = {
  [FundStepReceiveVariant.Control]: { showReceiveButton: false },
  [FundStepReceiveVariant.Treatment]: { showReceiveButton: true },
};

export const FUND_STEP_RECEIVE_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Wallet home onboarding fund step Receive button',
  variationNames: {
    control: 'Add funds only',
    treatment: 'Receive and Add funds',
  },
} as const;

/**
 * Only fund-step traffic is tagged: the same events fire from other surfaces
 * (other checklist steps, home action buttons, the main ramps entry points).
 */
export const FUND_STEP_RECEIVE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: FUND_STEP_RECEIVE_AB_KEY,
    validVariants: Object.values(FundStepReceiveVariant),
    eventNames: [
      EVENT_NAME.HOME_VIEWED,
      EVENT_NAME.RAMPS_BUTTON_CLICKED,
      EVENT_NAME.ACTION_BUTTON_CLICKED,
      EVENT_NAME.ADDRESS_LIST_VIEWED,
    ],
    eventPropertyRequirements: {
      [EVENT_NAME.HOME_VIEWED]: {
        interaction_type: WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
        section_name: WalletHomeOnboardingChecklistSectionName.ON_RAMP,
      },
      [EVENT_NAME.RAMPS_BUTTON_CLICKED]: {
        location: ActionLocation.ONBOARDING_CHECKLIST,
      },
      [EVENT_NAME.ACTION_BUTTON_CLICKED]: {
        location: ActionLocation.ONBOARDING_CHECKLIST,
        action_name: ActionButtonType.RECEIVE,
      },
      [EVENT_NAME.ADDRESS_LIST_VIEWED]: {
        // Same value as AddressListViewedSource.ONBOARDING_CHECKLIST. Kept as a
        // literal: importing addressListViewedTracking here creates an import
        // cycle through constants/network when analytics.ts loads this registry.
        source: 'onboarding_checklist',
      },
    },
  };
