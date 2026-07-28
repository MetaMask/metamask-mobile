import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}`.
 *
 * Controls the percentage of new users who see the onboarding interest
 * questionnaire screen. Adjust the treatment rollout in LaunchDarkly
 * without a code change (e.g. 25%, 50%, 100%).
 *
 * Flag key: `tradeTO880AbtestOnboardingInterestQuestion`
 */
export const ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY =
  'tradeTO880AbtestOnboardingInterestQuestion';

export enum OnboardingInterestQuestionnaireVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface OnboardingInterestQuestionnaireVariantConfig {
  /** When true, show the interest questionnaire during onboarding. */
  showQuestionnaire: boolean;
}

export const ONBOARDING_INTEREST_QUESTIONNAIRE_VARIANTS: Record<
  OnboardingInterestQuestionnaireVariant,
  OnboardingInterestQuestionnaireVariantConfig
> = {
  [OnboardingInterestQuestionnaireVariant.Control]: {
    showQuestionnaire: false,
  },
  [OnboardingInterestQuestionnaireVariant.Treatment]: {
    showQuestionnaire: true,
  },
};

export const ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Onboarding Interest Questionnaire',
  variationNames: {
    control: 'No questionnaire',
    treatment: 'Show questionnaire',
  },
} as const;

export const ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY,
    validVariants: Object.values(OnboardingInterestQuestionnaireVariant),
    eventNames: [
      EVENT_NAME.ONBOARDING_QUESTION_VIEWED,
      EVENT_NAME.ONBOARDING_QUESTION_SUBMITTED,
    ],
  };
