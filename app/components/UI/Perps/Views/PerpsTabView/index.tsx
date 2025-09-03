import React, { useEffect, useState } from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import PerpsTabView from './PerpsTabView';

interface PerpsTabViewWithProviderProps {
  navigation?: NavigationProp<ParamListBase>;
  tabLabel?: string;
  isVisible?: boolean;
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

/**
 * PerpsTabView wrapped with both PerpsConnectionProvider and PerpsStreamProvider
 * This ensures the usePerpsConnection and usePerpsStream hooks work properly when used in the main wallet tab view
 * Visibility is managed internally with updates from parent via callback
 */
const PerpsTabViewWithProvider: React.FC<PerpsTabViewWithProviderProps> = (
  props,
) => {
  const { isVisible: initialVisible = false, onVisibilityChange } = props;
  const [isVisible, setIsVisible] = useState(initialVisible);

  // Register callback with parent
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange((visible: boolean) => {
        DevLogger.log('PerpsTabView: Visibility updated via callback', {
          visible,
          timestamp: new Date().toISOString(),
        });
        setIsVisible(visible);
      });
    }
  }, [onVisibilityChange]);

  return (
    <PerpsConnectionProvider isVisible={isVisible}>
      <PerpsStreamProvider>
        <PerpsTabView {...props} />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

// Export the wrapped version as default
export default PerpsTabViewWithProvider;

// Also export the unwrapped version for use in contexts where provider is already present
export { default as PerpsTabViewRaw } from './PerpsTabView';
