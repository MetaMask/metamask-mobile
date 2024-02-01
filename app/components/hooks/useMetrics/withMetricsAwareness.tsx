import React, { ComponentClass } from 'react';
import useMetrics from './useMetrics';
import { IUseMetricsHook } from './useMetrics.types';

const withMetricsAwareness =
  (
    Children: ComponentClass<{
      metrics: IUseMetricsHook;
    }>,
  ) =>
  (props: any) => {
    const metrics = useMetrics();
    return <Children {...props} {...(metrics && { metrics })} />;
  };

export default withMetricsAwareness;
