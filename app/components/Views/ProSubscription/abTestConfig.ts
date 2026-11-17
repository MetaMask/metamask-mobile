import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}`.
 *
 * Gates the MetaMask Pro subscription flow (sign-up paywall, benefit sheets,
 * success screen, Pro landing page, plan management, and cancel flow).
 * Adjust the treatment rollout in LaunchDarkly without a code change
 * (e.g. 0% dark-launch → 25% → 50% → 100% full rollout).
 *
 * Flag key: `subSUB990AbtestProSubscriptionFlow`
 */
export const PRO_SUBSCRIPTION_FLOW_AB_KEY =
  'subSUB990AbtestProSubscriptionFlow';

export enum ProSubscriptionFlowVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface ProSubscriptionFlowVariantConfig {
  /** When true, Pro entry points render and the subscription flow is reachable. */
  isProSubscriptionEnabled: boolean;
}

export const PRO_SUBSCRIPTION_FLOW_VARIANTS: Record<
  ProSubscriptionFlowVariant,
  ProSubscriptionFlowVariantConfig
> = {
  [ProSubscriptionFlowVariant.Control]: {
    isProSubscriptionEnabled: false,
  },
  [ProSubscriptionFlowVariant.Treatment]: {
    isProSubscriptionEnabled: true,
  },
};

export const PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Pro Subscription Flow',
  variationNames: {
    control: 'Pro flow hidden',
    treatment: 'Pro flow enabled',
  },
} as const;

export const PRO_SUBSCRIPTION_FLOW_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: PRO_SUBSCRIPTION_FLOW_AB_KEY,
    validVariants: Object.values(ProSubscriptionFlowVariant),
    eventNames: [],
  };
