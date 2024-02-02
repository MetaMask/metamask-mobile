import React, { ComponentClass } from 'react';
import useMetrics from './useMetrics';
import { IWithMetricsAwarenessProps } from './withMetricsAwareness.types';

const withMetricsAwareness =
  (Children: ComponentClass<IWithMetricsAwarenessProps>) => (props: any) =>
    <Children {...props} metrics={useMetrics()} />;

export default withMetricsAwareness;
