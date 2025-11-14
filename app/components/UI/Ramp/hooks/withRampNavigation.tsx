import React from 'react';
import { useRampNavigation, RampMode } from './useRampNavigation';
import { RampType as AggregatorRampType } from '../Aggregator/types';

export interface WithRampNavigationProps {
  goToRamps: ReturnType<typeof useRampNavigation>['goToRamps'];
  RampMode: typeof RampMode;
  AggregatorRampType: typeof AggregatorRampType;
}

export function withRampNavigation<P extends WithRampNavigationProps>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, keyof WithRampNavigationProps>> {
  return function WithRampNavigationWrapper(
    props: Omit<P, keyof WithRampNavigationProps>,
  ) {
    const { goToRamps } = useRampNavigation();

    return (
      <Component
        {...(props as P)}
        goToRamps={goToRamps}
        RampMode={RampMode}
        AggregatorRampType={AggregatorRampType}
      />
    );
  };
}
