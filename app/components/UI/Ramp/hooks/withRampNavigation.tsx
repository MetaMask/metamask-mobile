import React from 'react';
import { useRampNavigation } from './useRampNavigation';

export interface WithRampNavigationProps {
  goToBuy: ReturnType<typeof useRampNavigation>['goToBuy'];
}

export function withRampNavigation<P extends WithRampNavigationProps>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, keyof WithRampNavigationProps>> {
  return function WithRampNavigationWrapper(
    props: Omit<P, keyof WithRampNavigationProps>,
  ) {
    const { goToBuy } = useRampNavigation();

    return <Component {...(props as P)} goToBuy={goToBuy} />;
  };
}
