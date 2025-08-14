import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
// import { PolymarketProvider } from '../../providers/PolymarketProvider';
import PredictTabView from './PredictTabView';

interface PredictTabViewWithProviderProps {
  navigation?: NavigationProp<ParamListBase>;
  tabLabel?: string;
}

/**
 * PredictTabView wrapped with PolymarketProvider (requires some refactoring)
 */
const PredictTabViewWithProvider: React.FC<PredictTabViewWithProviderProps> = (
  props,
) => (
  // <PolymarketProvider>
  <PredictTabView {...props} />
  // </PolymarketProvider>
);

// Export the wrapped version as default
export default PredictTabViewWithProvider;

// Also export the unwrapped version for use in contexts where provider is already present
export { default as PredictTabViewRaw } from './PredictTabView';
