import React, { useEffect, useState } from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import PerpsTabView from './PerpsTabView';
import PerpsStreamBridge from '../../components/PerpsStreamBridge';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '@metamask/design-system-react-native';

interface PerpsTabViewWithProviderProps {
  navigation?: NavigationProp<ParamListBase>;
  tabLabel?: string;
  isVisible?: boolean;
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

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
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

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

  if (!isBasicFunctionalityEnabled) {
    return (
      <View style={styles.container}>
        <BasicFunctionalityEmptyState
          title={strings('perps.basic_functionality_disabled_title')}
          iconName={IconName.Warning}
        />
      </View>
    );
  }

  return (
    <PerpsConnectionProvider isVisible={isVisible}>
      <PerpsStreamProvider>
        <PerpsStreamBridge />
        <PerpsTabView />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

// Export the wrapped version as default
export default PerpsTabViewWithProvider;

// Also export the unwrapped version for use in contexts where provider is already present
export { default as PerpsTabViewRaw } from './PerpsTabView';
