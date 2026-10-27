import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AnalyticsTrackingEvent } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import type { IMetaMetricsEvent } from '../../../../util/analytics/analytics.types';
import {
  buildRewardsDashboardViewedProperties,
  RewardsDashboardKind,
  trackRewardsDashboardViewed,
  type RewardsDashboardViewedProperties,
} from './rewardsDashboardViewedTracking';

describe('rewardsDashboardViewedTracking', () => {
  describe('buildRewardsDashboardViewedProperties', () => {
    it('maps the Money dashboard referral payload', () => {
      const referralMe = {
        roles: ['REFERRER', 'COPY_TRADING'],
        ui_variant: 'REFERRER',
      } as Pick<ReferralMeDto, 'roles' | 'ui_variant'>;

      const properties = buildRewardsDashboardViewedProperties({
        dashboard: RewardsDashboardKind.REWARDS_MONEY,
        hasSubscription: true,
        referralMe,
      });

      expect(properties).toEqual({
        dashboard: 'rewards-money',
        has_subscription: true,
        persona: 'referrer',
        roles: ['referrer', 'copy_trading'],
      });
    });

    it('omits persona and roles when referral-me has not loaded', () => {
      const properties = buildRewardsDashboardViewedProperties({
        dashboard: RewardsDashboardKind.REWARDS,
        hasSubscription: true,
      });

      expect(properties).toEqual({
        dashboard: 'rewards',
        has_subscription: true,
      });
    });

    it('passes a new role through as a lowercase string', () => {
      const referralMe = {
        roles: ['FUTURE_ROLE'],
        ui_variant: 'NONE',
      } as unknown as Pick<ReferralMeDto, 'roles' | 'ui_variant'>;

      const properties = buildRewardsDashboardViewedProperties({
        dashboard: RewardsDashboardKind.REWARDS,
        hasSubscription: false,
        referralMe,
      });

      expect(properties.roles).toEqual(['future_role']);
    });
  });

  describe('trackRewardsDashboardViewed', () => {
    it('tracks Rewards Dashboard Viewed with the property bag', () => {
      const event = {
        name: 'Rewards Dashboard Viewed',
      } as AnalyticsTrackingEvent;
      const mockBuild = jest.fn((): AnalyticsTrackingEvent => event);
      const mockAddProperties = jest.fn(
        (_properties: RewardsDashboardViewedProperties) => ({
          build: mockBuild,
        }),
      );
      const mockCreateEventBuilder = jest.fn((_event: IMetaMetricsEvent) => ({
        addProperties: mockAddProperties,
      }));
      jest.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);

      trackRewardsDashboardViewed(
        (metricsEvent) => {
          const builder = mockCreateEventBuilder(metricsEvent);
          return {
            addProperties: (properties) => {
              const withBuild = builder.addProperties(properties);
              return { build: () => withBuild.build() };
            },
          };
        },
        {
          dashboard: RewardsDashboardKind.REWARDS,
          hasSubscription: true,
        },
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_DASHBOARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        dashboard: 'rewards',
        has_subscription: true,
      });
      expect(analytics.trackEvent).toHaveBeenCalledWith(event);
    });
  });
});
