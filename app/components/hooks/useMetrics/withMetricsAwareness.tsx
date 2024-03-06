import React, { ComponentType } from 'react';
import useMetrics from './useMetrics';
import { IWithMetricsAwarenessProps } from './withMetricsAwareness.types';

const withMetricsAwareness =
  (Children: ComponentType<IWithMetricsAwarenessProps>) => (props: any) =>
    <Children {...props} metrics={useMetrics()} />;

export default withMetricsAwareness;
