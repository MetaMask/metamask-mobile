import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import ManageNetworksComponent from '../../../UI/ManageNetworks/ManageNetworks';
import { useStyles } from '../../../../component-library/hooks';
import BackupAndSyncToggle from '../../../UI/Identity/BackupAndSyncToggle/BackupAndSyncToggle';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import { RootState } from '../../../../reducers';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import styleSheet from '../DefaultSettings/index.styles';

const GeneralSettings = () => {
  useOnboardingHeader(strings('default_settings.drawer_general_title'));
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const handleSwitchToggle = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
        .addProperties({
          settings_group: 'onboarding_advanced_configuration',
          settings_type: 'basic_functionality',
          old_value: isBasicFunctionalityEnabled,
          new_value: !isBasicFunctionalityEnabled,
          was_profile_syncing_on: isBackupAndSyncEnabled,
        })
        .build(),
    );
  };

  const trackBackupAndSyncToggleEvent = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
        .addProperties({
          settings_group: 'onboarding_advanced_configuration',
          settings_type: 'profile_syncing',
          old_value: isBackupAndSyncEnabled,
          new_value: !isBackupAndSyncEnabled,
        })
        .build(),
    );
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.root}>
      <ScrollView style={styles.scrollRoot}>
        <BasicFunctionalityComponent handleSwitchToggle={handleSwitchToggle} />
        <BackupAndSyncToggle
          trackBackupAndSyncToggleEventOverride={trackBackupAndSyncToggleEvent}
        />
        <ManageNetworksComponent />
      </ScrollView>
    </SafeAreaView>
  );
};

export default GeneralSettings;
