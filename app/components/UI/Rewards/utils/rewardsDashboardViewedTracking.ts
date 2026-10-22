import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  moneyDashboardPersona,
  type MoneyDashboardPersona,
} from '../../../../reducers/rewardsMoney/selectors';
import type { AnalyticsTrackingEvent } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import type {
  IMetaMetricsEvent,
  JsonMap,
} from '../../../../util/analytics/analytics.types';

export const RewardsDashboardKind = {
  REWARDS: 'rewards',
  REWARDS_MONEY: 'rewards-money',
} as const;

export type RewardsDashboardKindValue =
  (typeof RewardsDashboardKind)[keyof typeof RewardsDashboardKind];

export interface RewardsDashboardViewedProperties extends JsonMap {
  dashboard: RewardsDashboardKindValue;
  has_subscription: boolean;
  persona?: MoneyDashboardPersona;
  roles?: string[];
}

const KNOWN_ROLES: Record<string, string> = {
  REFERRER: 'referrer',
  REFEREE: 'referee',
  CASHBACK_EXPERIMENT: 'cashback_experiment',
  COPY_TRADING: 'copy_trading',
};

/**
 * Maps a referral role to an open analytics value.
 *
 * @param role - Role from referral-me.
 * @returns Snake-case role value.
 */
export const toRewardsDashboardRole = (role: string): string =>
  KNOWN_ROLES[role] ?? role.toLowerCase();

/**
 * Builds properties for a Rewards dashboard visit.
 *
 * @param input - Dashboard and settled user context.
 * @returns The Dashboard Viewed property bag.
 */
export const buildRewardsDashboardViewedProperties = ({
  dashboard,
  hasSubscription,
  referralMe,
}: {
  dashboard: RewardsDashboardKindValue;
  hasSubscription: boolean;
  referralMe?: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null;
}): RewardsDashboardViewedProperties => {
  const properties: RewardsDashboardViewedProperties = {
    dashboard,
    has_subscription: hasSubscription,
  };
  if (!referralMe) {
    return properties;
  }
  return {
    ...properties,
    persona: moneyDashboardPersona(referralMe),
    roles: referralMe.roles.map(toRewardsDashboardRole),
  };
};

type RewardsDashboardViewedEventFactory<TEvent> = (
  event: IMetaMetricsEvent,
) => {
  addProperties: (properties: RewardsDashboardViewedProperties) => {
    build: () => TEvent;
  };
};

/**
 * Tracks a Rewards dashboard visit through the shared one-argument sender.
 *
 * Segment event version stays on the platform analytics path. This helper
 * only adds Rewards properties.
 *
 * @param createEventBuilder - Event builder from useAnalytics.
 * @param input - Dashboard and settled user context.
 */
export const trackRewardsDashboardViewed = (
  createEventBuilder: RewardsDashboardViewedEventFactory<AnalyticsTrackingEvent>,
  input: {
    dashboard: RewardsDashboardKindValue;
    hasSubscription: boolean;
    referralMe?: Pick<ReferralMeDto, 'roles' | 'ui_variant'> | null;
  },
): void => {
  analytics.trackEvent(
    createEventBuilder(MetaMetricsEvents.REWARDS_DASHBOARD_VIEWED)
      .addProperties(buildRewardsDashboardViewedProperties(input))
      .build(),
  );
};
