import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  InteractionManager,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { getSettingsNavigationOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import Analytics from '../../../core/Analytics/Analytics';
import { IMetaMetricsEvent, MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core/';
import { Colors } from '../../../util/theme/models';
import {
  ABOUT_METAMASK_SETTINGS,
  ADVANCED_SETTINGS,
  CONTACT_SETTINGS,
  CONTACTS_SETTINGS,
  EXPERIMENTAL_SETTINGS,
  GENERAL_SETTINGS,
  LOCK_SETTINGS,
  NETWORKS_SETTINGS,
  ON_RAMP_SETTINGS,
  REQUEST_SETTINGS,
  SECURITY_SETTINGS,
} from '../../../../wdio/screen-objects/testIDs/Screens/Settings.testIds';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingLeft: 18,
      zIndex: 99999999999999,
    },
  });

const Settings = () => {
  const { colors } = useTheme();
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

  const trackEvent = (event: IMetaMetricsEvent) => {
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(event);
    });
  };

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
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.SETTINGS);
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
      navigation.replace(Routes.ONBOARDING.LOGIN, { locked: true });
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

  return (
    <ScrollView style={styles.wrapper}>
      <SettingsDrawer
        description={strings('app_settings.general_desc')}
        onPress={onPressGeneral}
        title={strings('app_settings.general_title')}
        testID={GENERAL_SETTINGS}
      />
      <SettingsDrawer
        description={strings('app_settings.security_desc')}
        onPress={onPressSecurity}
        title={strings('app_settings.security_title')}
        warning={!seedphraseBackedUp}
        testID={SECURITY_SETTINGS}
      />
      <SettingsDrawer
        description={strings('app_settings.advanced_desc')}
        onPress={onPressAdvanced}
        title={strings('app_settings.advanced_title')}
        testID={ADVANCED_SETTINGS}
      />
      <SettingsDrawer
        description={strings('app_settings.contacts_desc')}
        onPress={onPressContacts}
        title={strings('app_settings.contacts_title')}
        testID={CONTACTS_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.networks_title')}
        description={strings('app_settings.networks_desc')}
        onPress={onPressNetworks}
        testID={NETWORKS_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.fiat_on_ramp.title')}
        description={strings('app_settings.fiat_on_ramp.description')}
        onPress={onPressOnRamp}
        testID={ON_RAMP_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.experimental_title')}
        description={strings('app_settings.experimental_desc')}
        onPress={onPressExperimental}
        testID={EXPERIMENTAL_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.info_title')}
        onPress={onPressInfo}
        testID={ABOUT_METAMASK_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.request_feature')}
        onPress={submitFeedback}
        renderArrowRight={false}
        testID={REQUEST_SETTINGS}
      />
      <SettingsDrawer
        title={strings('app_settings.contact_support')}
        onPress={showHelp}
        renderArrowRight={false}
        testID={CONTACT_SETTINGS}
      />
      <SettingsDrawer
        title={strings('drawer.lock')}
        onPress={lock}
        renderArrowRight={false}
        testID={LOCK_SETTINGS}
        titleColor={colors.primary.default}
      />
    </ScrollView>
  );
};

export default Settings;
