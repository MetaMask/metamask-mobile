import { MetaMetricsEvents } from '../../../core/Analytics';
import { IUseMetricsHook } from './useMetrics.types';
import withMetricsAwareness from './withMetricsAwareness';

export { default as useMetrics } from './useMetrics';

export { MetaMetricsEvents, withMetricsAwareness };

export type { IUseMetricsHook };
