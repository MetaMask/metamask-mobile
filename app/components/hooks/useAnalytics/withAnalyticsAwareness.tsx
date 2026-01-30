import React, { ComponentType } from 'react';
import { useAnalytics } from './useAnalytics';
import { IWithAnalyticsAwarenessProps } from './withAnalyticsAwareness.types';

export const withAnalyticsAwareness = <P extends IWithAnalyticsAwarenessProps>(
  Child: ComponentType<P>,
) => {
  const ComponentWithAnalytics = (
    props: Omit<P, keyof IWithAnalyticsAwarenessProps>,
  ) => <Child {...(props as P)} metrics={useAnalytics()} />;

  return ComponentWithAnalytics;
};
