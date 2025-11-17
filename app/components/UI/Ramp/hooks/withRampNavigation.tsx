import React from 'react';
import { useRampNavigation, RampMode } from './useRampNavigation';
import { RampType as AggregatorRampType } from '../Aggregator/types';

export interface WithRampNavigationProps {
  goToBuy: ReturnType<typeof useRampNavigation>['goToBuy'];
  RampMode: typeof RampMode;
  AggregatorRampType: typeof AggregatorRampType;
}

export function withRampNavigation<P extends WithRampNavigationProps>(
  Component: React.ComponentType<P>,
): React.ComponentType<Omit<P, keyof WithRampNavigationProps>> {
  return function WithRampNavigationWrapper(
    props: Omit<P, keyof WithRampNavigationProps>,
  ) {
    const { goToBuy } = useRampNavigation();

    return (
      <Component
        {...(props as P)}
        goToBuy={goToBuy}
        RampMode={RampMode}
        AggregatorRampType={AggregatorRampType}
      />
    );
  };
}
