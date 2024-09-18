// Third party dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';

// Internal dependencies
import styles from './index.styles';
import SettingsDrawer from '../../../UI/SettingsDrawer';

const DefaultSettings = () => {
  const navigation = useNavigation();
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

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_BEST_PRACTICES);
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
      <SettingsDrawer
        title={strings('default_settings.drawer_general_title')}
        description={strings('default_settings.drawer_general_title_desc')}
        onPress={() => navigation.navigate(Routes.ONBOARDING.GENERAL_SETTINGS)}
      />
      <SettingsDrawer
        title={strings('default_settings.drawer_assets_title')}
        description={strings('default_settings.drawer_assets_desc')}
        onPress={() => navigation.navigate(Routes.ONBOARDING.ASSETS_SETTINGS)}
      />
      <SettingsDrawer
        title={strings('default_settings.drawer_security_title')}
        description={strings('default_settings.drawer_security_desc')}
        onPress={() => navigation.navigate(Routes.ONBOARDING.SECURITY_SETTINGS)}
      />
    </ScrollView>
  );
};

export default DefaultSettings;
