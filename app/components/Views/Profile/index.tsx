import React, { useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import createStyles from './index.styles';
import {
  default as Text,
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { IconName } from '../../../component-library/components/Icons/Icon';
import SettingsDrawer from '../../../components/UI/SettingsDrawer';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core/';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { SettingsViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SettingsView.selectors';
import routes from '../../../constants/navigation/Routes';
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import { createSnapsSettingsListNavDetails } from '../Snaps/SnapsSettingsList/SnapsSettingsList';
///: END:ONLY_INCLUDE_IF

const Profile = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerTitleAlign: 'left',
      headerTitle: (
        <Text variant={TextVariant.HeadingLG} style={styles.headerTitle}>
          Profile
        </Text>
      ),
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [colors, navigation, styles.headerTitle]);

  const onPressLock = async () => {
    await Authentication.lockApp({ locked: true });
  };

  const lock = () => {
    Alert.alert(
      strings('drawer.lock_title'),
      '',
      [
        {
          text: strings('drawer.lock_cancel'),
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: strings('drawer.lock_ok'),
          onPress: onPressLock,
        },
      ],
      { cancelable: false },
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_LOGOUT).build(),
    );
  };

  const goToBrowserUrl = (url: string, title: string) => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const showHelp = () => {
    goToBrowserUrl(
      'https://support.metamask.io',
      strings('app_settings.contact_support'),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  };

  const submitFeedback = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NAVIGATION_TAPS_SEND_FEEDBACK,
      ).build(),
    );
    goToBrowserUrl(
      'https://community.metamask.io/c/feature-requests-ideas/',
      strings('app_settings.request_feature'),
    );
  };

  const onPressInfo = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_ABOUT).build());
    navigation.navigate('CompanySettings');
  };

  const onPressSettings = () => {
    navigation.navigate(routes.SETTINGS.SETTINGS);
  };

  const onPressSnaps = () => {
    navigation.navigate(...createSnapsSettingsListNavDetails());
  };

  let aboutMetaMaskTitle = strings('app_settings.info_title');

  ///: BEGIN:ONLY_INCLUDE_IF(flask)
  aboutMetaMaskTitle = strings('app_settings.info_title_flask');
  ///: END:ONLY_INCLUDE_IF

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <SettingsDrawer
          onPress={() => navigation.navigate(routes.SETTINGS.CONTACTS)}
          title="Contacts"
          iconName={IconName.Contacts}
          isFirst
        />
        <SettingsDrawer
          onPress={() => navigation.navigate('PermissionsManager')}
          title="Permissions"
          iconName={IconName.Permissions}
        />
        <SettingsDrawer
          onPress={() => navigation.navigate('NetworksSettings')}
          title="Networks"
          iconName={IconName.Network}
        />
        <SettingsDrawer
          onPress={onPressSnaps}
          title="Snaps"
          iconName={IconName.Snaps}
          isLast
        />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title="Settings"
          iconName={IconName.Setting}
          onPress={onPressSettings}
          isFirst
          isLast
        />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title={aboutMetaMaskTitle}
          onPress={onPressInfo}
          testID={SettingsViewSelectorsIDs.ABOUT_METAMASK}
          iconName={IconName.Info}
          isFirst
        />
        <SettingsDrawer
          title={strings('app_settings.request_feature')}
          onPress={submitFeedback}
          renderArrowRight={false}
          testID={SettingsViewSelectorsIDs.REQUEST}
          iconName={IconName.Paper}
        />
        <SettingsDrawer
          title={strings('app_settings.contact_support')}
          onPress={showHelp}
          renderArrowRight={false}
          testID={SettingsViewSelectorsIDs.CONTACT}
          iconName={IconName.MessageQuestion}
        />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title={strings('drawer.lock')}
          onPress={lock}
          titleColor={TextColor.Primary}
          iconName={IconName.Lock}
          iconColor={colors.primary.default}
          isFirst
          isLast
          renderArrowRight={false}
          testID={SettingsViewSelectorsIDs.LOCK}
        />
      </View>
    </ScrollView>
  );
};

export default Profile;
