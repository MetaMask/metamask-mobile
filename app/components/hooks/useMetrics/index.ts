import { MetaMetricsEvents } from '../../../core/Analytics';
import { IUseMetricsHook } from './useMetrics.types';
import withMetricsAwareness from './withMetricsAwareness';

/**
 * @deprecated Use useAnalytics from
 * app/components/hooks/useAnalytics/useAnalytics.
 */
export { default as useMetrics } from './useMetrics';

export { MetaMetricsEvents };

/**
 * @deprecated Use withAnalyticsAwareness from
 * app/components/hooks/useAnalytics/withAnalyticsAwareness.
 */
export { withMetricsAwareness };

export type { IUseMetricsHook };
