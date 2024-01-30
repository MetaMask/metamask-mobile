import React, { ComponentClass } from 'react';
import useMetrics from './useMetrics';
import { IMetaMetrics } from '../../../core/Analytics/MetaMetrics.types';

const withMetricsAwareness =
  (
    Children: ComponentClass<{
      metrics: IMetaMetrics;
    }>,
  ) =>
  (props: any) => {
    const metrics = useMetrics();
    return <Children {...props} {...(metrics && { metrics })} />;
  };

export default withMetricsAwareness;
