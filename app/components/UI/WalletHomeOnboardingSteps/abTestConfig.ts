import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import { WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE } from './walletHomeOnboardingChecklistAnalytics';

// ─── Onboarding checklist stepper (TMCU-828) ────────────────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-828).
 *
 * Layered on top of eligible checklist users (`selectShouldShowWalletHomeOnboardingSteps`);
 * only users who already see the checklist are evaluated for this experiment.
 */
export const ONBOARDING_CHECKLIST_STEPPER_AB_KEY =
  'homeTMCU828AbtestOnboardingChecklistStepper';

export enum OnboardingChecklistStepperVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface OnboardingChecklistStepperVariantConfig {
  /** When true, render the discrete-segment stepper instead of the continuous fill bar. */
  useDiscreteStepper: boolean;
}

export const ONBOARDING_CHECKLIST_STEPPER_VARIANTS: Record<
  OnboardingChecklistStepperVariant,
  OnboardingChecklistStepperVariantConfig
> = {
  [OnboardingChecklistStepperVariant.Control]: { useDiscreteStepper: false },
  [OnboardingChecklistStepperVariant.Treatment]: { useDiscreteStepper: true },
};

/**
 * Shared third argument for `useABTest` on this experiment (exposure +
 * consistent variation labels).
 */
export const ONBOARDING_CHECKLIST_STEPPER_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Onboarding Checklist Stepper',
  variationNames: {
    control: 'Continuous progress bar',
    treatment: 'Discrete stepper',
  },
} as const;

/**
 * `Home Viewed` (onboarding checklist) auto-enrichment with `active_ab_tests`.
 * Scoped to the checklist surface so unrelated `Home Viewed` events are untouched.
 */
export const ONBOARDING_CHECKLIST_STEPPER_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: ONBOARDING_CHECKLIST_STEPPER_AB_KEY,
    validVariants: Object.values(OnboardingChecklistStepperVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
    injectWhenPropertiesMatch: {
      interaction_type: WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
    },
  };
