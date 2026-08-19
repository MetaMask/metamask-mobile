import type { AnalyticsExpectations } from '../../../framework';

const ANALYTICS_PREFERENCE_SELECTED = 'Analytics Preference Selected';

export const optOutAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: [ANALYTICS_PREFERENCE_SELECTED],
  expectedTotalCount: 1,
  events: [
    {
      name: ANALYTICS_PREFERENCE_SELECTED,
      containProperties: {
        has_marketing_consent: false,
        is_metrics_opted_in: true,
        location: 'onboarding_metametrics',
        updated_after_onboarding: false,
      },
    },
  ],
};
