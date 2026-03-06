import React from 'react';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';
import PerpsTabView from './PerpsTabView';
import PerpsStreamBridge from '../../components/PerpsStreamBridge';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '@metamask/design-system-react-native';

interface PerpsTabViewWithProviderProps {
  tabLabel?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * PerpsTabView wrapped with PerpsConnectionProvider (context only) and PerpsStreamProvider.
 * Connection lifecycle is managed by the top-level PerpsAlwaysOnProvider.
 */
const PerpsTabViewWithProvider: React.FC<
  PerpsTabViewWithProviderProps
> = () => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

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
    <PerpsConnectionProvider manageLifecycle={false}>
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
