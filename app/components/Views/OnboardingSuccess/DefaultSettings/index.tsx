import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import ManageNetworksComponent from '../../../UI/ManageNetworks/ManageNetworks';
import AppConstants from '../../../../core/AppConstants';
import styles from './index.styles';
import ProfileSyncingComponent from '../../../../components/UI/ProfileSyncing/ProfileSyncing';
import { useSelector } from 'react-redux';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications';
import { enableProfileSyncing } from '../../../../actions/notification/helpers';
import { RootState } from '../../../../reducers';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

const DefaultSettings = () => {
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
    [navigation],
  );
  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('onboarding_success.default_settings')}
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

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_BEST_PRACTICES);
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
      <Text variant={TextVariant.BodyMD}>
        {strings('default_settings.description')}
        <Text color={TextColor.Info} onPress={handleLink}>
          {' '}
          {strings('default_settings.learn_more_about_privacy')}
        </Text>
      </Text>
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

export default DefaultSettings;
