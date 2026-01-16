import React from 'react';
import { Linking, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import SettingsDrawer from '../../../UI/SettingsDrawer';
import styleSheet from './index.styles';

const DefaultSettings = () => {
  useOnboardingHeader(strings('default_settings.default_settings'));
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_BEST_PRACTICES);
  };

  return (
    <ScrollView style={styles.root}>
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodyMD}>
          {strings('default_settings.description')}
          <Text color={TextColor.Info} onPress={handleLink}>
            {' '}
            {strings('default_settings.learn_more_about_privacy')}
          </Text>
        </Text>
      </View>
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
