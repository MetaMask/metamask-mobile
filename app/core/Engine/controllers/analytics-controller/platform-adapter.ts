import type {
  AnalyticsPlatformAdapter,
  AnalyticsEventProperties,
} from '@metamask/analytics-controller';

/**
 * Platform adapter for the AnalyticsController.
 * TODO: Implement the adapter to integrate with MetaMetrics.
 */
export const createPlatformAdapter = (): AnalyticsPlatformAdapter => ({
  trackEvent(_eventName: string, _properties: AnalyticsEventProperties): void {
    // TODO: Implement trackEvent integration with MetaMetrics
  },

  identify(_userId: string, _traits?: AnalyticsEventProperties): void {
    // TODO: Implement identify integration with MetaMetrics
  },

  trackPage(_pageName: string, _properties?: AnalyticsEventProperties): void {
    // TODO: Implement trackPage integration with MetaMetrics
  },
});
