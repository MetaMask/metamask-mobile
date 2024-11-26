import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import ManageNetworksComponent from '../../../UI/ManageNetworks/ManageNetworks';
import { useStyles } from '../../../../component-library/hooks';
import ProfileSyncingComponent from '../../../UI/ProfileSyncing/ProfileSyncing';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications';
import { enableProfileSyncing } from '../../../../actions/notification/helpers';
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
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

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
          was_profile_syncing_on: isProfileSyncingEnabled,
        })
        .build(),
    );
  };

  const toggleProfileSyncing = async () => {
    if (isProfileSyncingEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      await enableProfileSyncing();
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
        .addProperties({
          settings_group: 'onboarding_advanced_configuration',
          settings_type: 'profile_syncing',
          old_value: isProfileSyncingEnabled,
          new_value: !isProfileSyncingEnabled,
        })
        .build(),
    );
  };

  return (
    <ScrollView style={styles.root}>
      <BasicFunctionalityComponent handleSwitchToggle={handleSwitchToggle} />
      {isNotificationsFeatureEnabled() && (
        <ProfileSyncingComponent
          handleSwitchToggle={toggleProfileSyncing}
          isBasicFunctionalityEnabled={isBasicFunctionalityEnabled}
          isProfileSyncingEnabled={isProfileSyncingEnabled}
        />
      )}
      <ManageNetworksComponent />
    </ScrollView>
  );
};

export default GeneralSettings;
