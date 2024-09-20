// Third party dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// External dependencies
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
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

// Internal dependencies
import styleSheet from './index.styles';

const GeneralSettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const renderBackButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    [navigation, styles.backButton],
  );
  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_general_title')}
      </Text>
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  const handleSwitchToggle = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
    trackEvent(MetaMetricsEvents.SETTINGS_UPDATED, {
      settings_group: 'onboarding_advanced_configuration',
      settings_type: 'basic_functionality',
      old_value: isBasicFunctionalityEnabled,
      new_value: !isBasicFunctionalityEnabled,
      was_profile_syncing_on: isProfileSyncingEnabled,
    });
  };

  const toggleProfileSyncing = async () => {
    if (isProfileSyncingEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      await enableProfileSyncing();
    }
    trackEvent(MetaMetricsEvents.SETTINGS_UPDATED, {
      settings_group: 'onboarding_advanced_configuration',
      settings_type: 'profile_syncing',
      old_value: isProfileSyncingEnabled,
      new_value: !isProfileSyncingEnabled,
    });
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
