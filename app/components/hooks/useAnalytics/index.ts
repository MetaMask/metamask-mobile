import { MetaMetricsEvents } from '../../../core/Analytics';
import type { IUseAnalyticsHook } from './useAnalytics.types';
import withAnalyticsAwareness from './withAnalyticsAwareness';

export { default as useAnalytics } from './useAnalytics';

export { MetaMetricsEvents, withAnalyticsAwareness };

export type { IUseAnalyticsHook };
