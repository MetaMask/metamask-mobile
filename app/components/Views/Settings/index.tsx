import React, { useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { getSettingsNavigationOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core/';
import { Colors } from '../../../util/theme/models';
import { SettingsViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SettingsView.selectors';
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import { createSnapsSettingsListNavDetails } from '../Snaps/SnapsSettingsList/SnapsSettingsList';
///: END:ONLY_INCLUDE_IF
import { TextColor } from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { isTest } from '../../../util/test/utils';
import {
  isMultichainVersion1Enabled,
  isPermissionsSettingsV1Enabled,
} from '../../../util/networks';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      zIndex: 99999999999999,
    },
  });

const Settings = () => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  const seedphraseBackedUp = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.user.seedphraseBackedUp,
  );

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getSettingsNavigationOptions(strings('app_settings.title'), colors),
    );
  }, [navigation, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const onPressGeneral = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_GENERAL).build());
    navigation.navigate('GeneralSettings');
  };

  const onPressAdvanced = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_ADVANCED).build());
    navigation.navigate('AdvancedSettings');
  };

  const onPressNotifications = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_NOTIFICATIONS).build(),
    );
    navigation.navigate(Routes.SETTINGS.NOTIFICATIONS);
  };

  const onPressSecurity = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SETTINGS_SECURITY_AND_PRIVACY,
      ).build(),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_SECURITY_SETTINGS).build(),
    );
    navigation.navigate('SecuritySettings');
  };

  const onPressNetworks = () => {
    navigation.navigate('NetworksSettings');
  };

  const onPressOnRamp = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONRAMP_SETTINGS_CLICKED).build(),
    );
    navigation.navigate(Routes.RAMP.SETTINGS);
  };

  const onPressExperimental = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_EXPERIMENTAL).build(),
    );
    navigation.navigate('ExperimentalSettings');
  };

  const onPressAesCryptoTestForm = () => {
    navigation.navigate('AesCryptoTestForm');
  };

  const onPressInfo = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_ABOUT).build());
    navigation.navigate('CompanySettings');
  };

  const onPressContacts = () => {
    navigation.navigate('ContactsSettings');
  };

  const onPressDeveloperOptions = () => {
    navigation.navigate('DeveloperOptions');
  };

  const goToManagePermissions = () => {
    navigation.navigate('PermissionsManager');
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

  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  const onPressSnaps = () => {
    navigation.navigate(...createSnapsSettingsListNavDetails());
  };
  ///: END:ONLY_INCLUDE_IF

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

  const showHelp = () => {
    goToBrowserUrl(
      'https://support.metamask.io',
      strings('app_settings.contact_support'),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  };

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

  let aboutMetaMaskTitle = strings('app_settings.info_title');

  ///: BEGIN:ONLY_INCLUDE_IF(flask)
  aboutMetaMaskTitle = strings('app_settings.info_title_flask');
  ///: END:ONLY_INCLUDE_IF

  return (
    <ScrollView
      style={styles.wrapper}
      testID={SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID}
    >
      <SettingsDrawer
        description={strings('app_settings.general_desc')}
        onPress={onPressGeneral}
        title={strings('app_settings.general_title')}
        testID={SettingsViewSelectorsIDs.GENERAL}
      />
      <SettingsDrawer
        description={strings('app_settings.security_desc')}
        onPress={onPressSecurity}
        title={strings('app_settings.security_title')}
        warning={!seedphraseBackedUp ? strings('drawer.settings_warning') : ''}
        testID={SettingsViewSelectorsIDs.SECURITY}
      />
      <SettingsDrawer
        description={strings('app_settings.advanced_desc')}
        onPress={onPressAdvanced}
        title={strings('app_settings.advanced_title')}
        testID={SettingsViewSelectorsIDs.ADVANCED}
      />
      {isNotificationsFeatureEnabled() && (
        <SettingsDrawer
          description={strings('app_settings.notifications_desc')}
          onPress={onPressNotifications}
          title={strings('app_settings.notifications_title')}
          testID={SettingsViewSelectorsIDs.NOTIFICATIONS}
        />
      )}
      {isMultichainVersion1Enabled && isPermissionsSettingsV1Enabled && (
        <SettingsDrawer
          description={strings('app_settings.permissions_desc')}
          onPress={goToManagePermissions}
          title={strings('app_settings.permissions_title')}
          testID={SettingsViewSelectorsIDs.PERMISSIONS}
        />
      )}
      <SettingsDrawer
        description={strings('app_settings.contacts_desc')}
        onPress={onPressContacts}
        title={strings('app_settings.contacts_title')}
        testID={SettingsViewSelectorsIDs.CONTACTS}
      />
      <SettingsDrawer
        title={strings('app_settings.networks_title')}
        description={strings('app_settings.networks_desc')}
        onPress={onPressNetworks}
        testID={SettingsViewSelectorsIDs.NETWORKS}
      />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
      }
      <SettingsDrawer
        title={strings('app_settings.snaps.title')}
        description={strings('app_settings.snaps.description')}
        onPress={onPressSnaps}
      />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      <SettingsDrawer
        title={strings('app_settings.fiat_on_ramp.title')}
        description={strings('app_settings.fiat_on_ramp.description')}
        onPress={onPressOnRamp}
        testID={SettingsViewSelectorsIDs.ON_RAMP}
      />
      <SettingsDrawer
        title={strings('app_settings.experimental_title')}
        description={strings('app_settings.experimental_desc')}
        onPress={onPressExperimental}
        testID={SettingsViewSelectorsIDs.EXPERIMENTAL}
      />
      {
        /**
         * This drawer is only visible in test mode.
         * It is used to test the AES crypto functions.
         *
         * If this is shown in production, it is a bug.
         */
        isTest && (
          <SettingsDrawer
            title={strings('app_settings.aes_crypto_test_form_title')}
            description={strings(
              'app_settings.aes_crypto_test_form_description',
            )}
            onPress={onPressAesCryptoTestForm}
            testID={SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM}
          />
        )
      }
      <SettingsDrawer
        title={aboutMetaMaskTitle}
        onPress={onPressInfo}
        testID={SettingsViewSelectorsIDs.ABOUT_METAMASK}
      />
      {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
        <SettingsDrawer
          title={strings('app_settings.developer_options.title')}
          onPress={onPressDeveloperOptions}
        />
      )}
      <SettingsDrawer
        title={strings('app_settings.request_feature')}
        onPress={submitFeedback}
        renderArrowRight={false}
        testID={SettingsViewSelectorsIDs.REQUEST}
      />
      <SettingsDrawer
        title={strings('app_settings.contact_support')}
        onPress={showHelp}
        renderArrowRight={false}
        testID={SettingsViewSelectorsIDs.CONTACT}
      />
      <SettingsDrawer
        title={strings('drawer.lock')}
        onPress={lock}
        renderArrowRight={false}
        testID={SettingsViewSelectorsIDs.LOCK}
        titleColor={TextColor.Primary}
      />
    </ScrollView>
  );
};

export default Settings;
