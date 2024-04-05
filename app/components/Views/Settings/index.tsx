import React, { useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { createSnapsSettingsListNavDetails } from '../Snaps/SnapsSettingsList/SnapsSettingsList';
///: END:ONLY_INCLUDE_IF
import { TextColor } from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';

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
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();

  const seedphraseBackedUp = useSelector(
    (state: any) => state.user.seedphraseBackedUp,
  );
  const passwordSet = useSelector((state: any) => state.user.passwordSet);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getSettingsNavigationOptions(strings('app_settings.title'), colors),
    );
  }, [navigation, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const onPressGeneral = () => {
    trackEvent(MetaMetricsEvents.SETTINGS_GENERAL);
    navigation.navigate('GeneralSettings');
  };

  const onPressAdvanced = () => {
    trackEvent(MetaMetricsEvents.SETTINGS_ADVANCED);
    navigation.navigate('AdvancedSettings');
  };

  const onPressSecurity = () => {
    trackEvent(MetaMetricsEvents.SETTINGS_SECURITY_AND_PRIVACY);
    navigation.navigate('SecuritySettings');
  };

  const onPressNetworks = () => {
    navigation.navigate('NetworksSettings');
  };

  const onPressOnRamp = () => {
    trackEvent(MetaMetricsEvents.ONRAMP_SETTINGS_CLICKED);
    navigation.navigate(Routes.RAMP.SETTINGS);
  };

  const onPressExperimental = () => {
    trackEvent(MetaMetricsEvents.SETTINGS_EXPERIMENTAL);
    navigation.navigate('ExperimentalSettings');
  };

  const onPressInfo = () => {
    trackEvent(MetaMetricsEvents.SETTINGS_ABOUT);
    navigation.navigate('CompanySettings');
  };

  const onPressContacts = () => {
    navigation.navigate('ContactsSettings');
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

  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  const onPressSnaps = () => {
    navigation.navigate(...createSnapsSettingsListNavDetails());
  };
  ///: END:ONLY_INCLUDE_IF

  const submitFeedback = () => {
    trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SEND_FEEDBACK);
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
    trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP);
  };

  const onPressLock = async () => {
    await Authentication.lockApp();
    if (!passwordSet) {
      navigation.navigate('OnboardingRootNav', {
        screen: Routes.ONBOARDING.NAV,
        params: { screen: 'Onboarding' },
      });
    } else {
      // TODO: Consolidate navigation action for locking app
      const resetAction = CommonActions.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked: true } }],
      });
      navigation.dispatch(resetAction);
    }
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
    trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_LOGOUT);
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
        ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
      <SettingsDrawer
        title={aboutMetaMaskTitle}
        onPress={onPressInfo}
        testID={SettingsViewSelectorsIDs.ABOUT_METAMASK}
      />
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
