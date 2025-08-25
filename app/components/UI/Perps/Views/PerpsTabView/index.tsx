import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import PerpsTabView from './PerpsTabView';

interface PerpsTabViewWithProviderProps {
  navigation?: NavigationProp<ParamListBase>;
  tabLabel?: string;
}

/**
 * PerpsTabView wrapped with PerpsConnectionProvider
 * This ensures the usePerpsConnection hook works properly when used in the main wallet tab view
 */
const PerpsTabViewWithProvider: React.FC<PerpsTabViewWithProviderProps> = (
  props,
) => (
  <PerpsConnectionProvider>
    <PerpsTabView {...props} />
  </PerpsConnectionProvider>
);

// Export the wrapped version as default
export default PerpsTabViewWithProvider;

// Also export the unwrapped version for use in contexts where provider is already present
export { default as PerpsTabViewRaw } from './PerpsTabView';
