import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';
import PerpsTabView from './PerpsTabView';

interface PerpsTabViewWithProviderProps {
  navigation?: NavigationProp<ParamListBase>;
  tabLabel?: string;
}

/**
 * PerpsTabView wrapped with both PerpsConnectionProvider and PerpsStreamProvider
 * This ensures the usePerpsConnection and usePerpsStream hooks work properly when used in the main wallet tab view
 */
const PerpsTabViewWithProvider: React.FC<PerpsTabViewWithProviderProps> = (
  props,
) => (
  <PerpsConnectionProvider>
    <PerpsStreamProvider>
      <PerpsTabView {...props} />
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

// Export the wrapped version as default
export default PerpsTabViewWithProvider;

// Also export the unwrapped version for use in contexts where provider is already present
export { default as PerpsTabViewRaw } from './PerpsTabView';
