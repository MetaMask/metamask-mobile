import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import type { BenefitsContentVersion } from './screens/Benefits/Benefits.constants';

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

/**
 * SUB-1059: Join Pro paywall content experiment.
 *
 * This is separate from the Pro subscription flow gate above. LaunchDarkly
 * selects a content version while all user-facing copy remains in locales.
 */
export const JOIN_PRO_PAYWALL_AB_TEST_KEY =
  'subSUB1059AbtestJoinProPaywallCopy';

export enum JoinProPaywallVariant {
  Control = 'control',
  V2 = 'v2',
}

export interface JoinProPaywallVariantConfig {
  contentVersion: BenefitsContentVersion;
}

/**
 * Add future content versions here without changing the rendering flow.
 * `control` is required by `useABTest` and remains the safe fallback.
 */
export const JOIN_PRO_PAYWALL_VARIANTS = {
  [JoinProPaywallVariant.Control]: {
    contentVersion: JoinProPaywallVariant.Control,
  },
  [JoinProPaywallVariant.V2]: {
    contentVersion: JoinProPaywallVariant.V2,
  },
} as const satisfies Record<JoinProPaywallVariant, JoinProPaywallVariantConfig>;

export const JOIN_PRO_PAYWALL_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Join Pro Paywall Copy',
  variationNames: {
    control: 'Current paywall content',
    v2: 'V2 paywall content',
  },
} as const;

export const JOIN_PRO_PAYWALL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: JOIN_PRO_PAYWALL_AB_TEST_KEY,
    validVariants: Object.values(JoinProPaywallVariant),
    // No Join Pro business events exist yet. `useABTest` still records exposure.
    eventNames: [],
  };
