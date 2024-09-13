import React, { ComponentType } from 'react';
import useMetrics from './useMetrics';
import { IUseMetricsHook } from './useMetrics.types';

const withMetricsAwareness =
  <P extends { metrics: IUseMetricsHook }>(Children: ComponentType<P>) =>
  (props: Omit<P, 'metrics'>) =>
    <Children {...(props as P)} metrics={useMetrics()} />;

export default withMetricsAwareness;
