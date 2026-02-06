import React, { ComponentType } from 'react';
import useMetrics from './useMetrics';
import { IWithMetricsAwarenessProps } from './withMetricsAwareness.types';

/**
 * @deprecated Use withAnalyticsAwareness from
 * app/components/hooks/useAnalytics/withAnalyticsAwareness
 * to stop new MetaMetrics usage.
 */
const withMetricsAwareness =
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Children: ComponentType<IWithMetricsAwarenessProps>) => (props: any) => (
    <Children {...props} metrics={useMetrics()} />
  );

export default withMetricsAwareness;
