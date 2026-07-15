/**
 * POC analytics module. The canonical PredictNext design constructor-injects
 * an analytics helper into services so they can emit funnel events without
 * pulling in the global analytics module. The Kalshi POC ships a no-op so
 * the rest of the wiring stays honest; swap in a real helper later.
 */
export interface PredictAnalyticsEvent {
  name: string;
  props?: Record<string, unknown>;
}

export interface PredictAnalytics {
  track(event: PredictAnalyticsEvent): void;
}

export const noopAnalytics: PredictAnalytics = {
  track(event) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[predict-analytics]', event.name, event.props ?? {});
    }
  },
};
