/* eslint-disable dot-notation */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  SafeAreaView,
  Image,
  Text,
  InteractionManager,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import AppConstants from '../../../../core/AppConstants';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { AboutMetaMaskSelectorsIDs } from '../../../../../e2e/selectors/Settings/AboutMetaMask.selectors';
import { useSupportConsent } from '../../../hooks/useSupportConsent';
import { isQa } from '../../../../util/test/utils';
import { createStyles } from './index.styles';
import SupportConsentSheet from '../../../UI/SupportConsentSheet';

import foxImage from '../../../../images/branding/fox.png';

interface AppInformationProps {
  navigation: {
    navigate: (
      screen: string,
      params?: { screen: string; params: { url: string; title: string } },
    ) => void;
    setOptions: (options: { headerTitleAlign?: string }) => void;
  };
}

/**
 * View that contains app information
 */
const AppInformation = ({ navigation }: AppInformationProps) => {
  const colors = useContext(ThemeContext)?.colors || mockTheme.colors;
  const styles = createStyles(colors);

  const [appInfo, setAppInfo] = useState('');
  const [appVersion, setAppVersion] = useState('');

  const goTo = useCallback(
    (url: string, title: string) => {
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: {
            url,
            title,
          },
        });
      });
    },
    [navigation],
  );

  const {
    showConsentSheet,
    openSupportWebPage,
    handleConsent,
    handleDecline,
    closeConsentSheet,
  } = useSupportConsent(goTo, strings('drawer.metamask_support'));

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.info_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    const loadAppInfo = async () => {
      const appName = await getApplicationName();
      const version = await getVersion();
      const buildNumber = await getBuildNumber();
      setAppInfo(`${appName} v${version} (${buildNumber})`);
      setAppVersion(version);
    };

    loadAppInfo();
  }, []);

  const onPrivacyPolicy = useCallback(() => {
    const url = AppConstants.URLS.PRIVACY_POLICY;
    goTo(url, strings('app_information.privacy_policy'));
  }, [goTo]);

  const onTermsOfUse = useCallback(() => {
    const url = AppConstants.URLS.TERMS_AND_CONDITIONS;
    goTo(url, strings('app_information.terms_of_use'));
  }, [goTo]);

  const onAttributions = useCallback(() => {
    const url = `https://raw.githubusercontent.com/MetaMask/metamask-mobile/v${appVersion}/attribution.txt`;
    goTo(url, strings('app_information.attributions'));
  }, [goTo, appVersion]);

  const onSupportCenter = useCallback(() => {
    openSupportWebPage();
  }, [openSupportWebPage]);

  const onWebSite = useCallback(() => {
    const url = 'https://metamask.io/';
    goTo(url, 'metamask.io');
  }, [goTo]);

  const onContactUs = useCallback(() => {
    openSupportWebPage();
  }, [openSupportWebPage]);

  return (
    <>
      <SafeAreaView
        style={styles.wrapper}
        testID={AboutMetaMaskSelectorsIDs.CONTAINER}
      >
        <ScrollView contentContainerStyle={styles.wrapperContent}>
          <View style={styles.logoWrapper}>
            <Image
              source={foxImage}
              style={styles.image}
              resizeMethod={'auto'}
            />
            <Text style={styles.versionInfo}>{appInfo}</Text>
            {isQa ? (
              <Text style={styles.branchInfo}>
                {`Branch: ${process.env['GIT_BRANCH']}`}
              </Text>
            ) : null}
          </View>
          <Text style={styles.title}>{strings('app_information.links')}</Text>
          <View style={styles.links}>
            <TouchableOpacity onPress={onPrivacyPolicy}>
              <Text style={styles.link}>
                {strings('app_information.privacy_policy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onTermsOfUse}>
              <Text style={styles.link}>
                {strings('app_information.terms_of_use')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAttributions}>
              <Text style={styles.link}>
                {strings('app_information.attributions')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.division} />
          <View style={styles.links}>
            <TouchableOpacity onPress={onSupportCenter}>
              <Text style={styles.link}>
                {strings('app_information.support_center')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onWebSite}>
              <Text style={styles.link}>
                {strings('app_information.web_site')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onContactUs}>
              <Text style={styles.link}>
                {strings('app_information.contact_us')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <SupportConsentSheet
        isVisible={showConsentSheet}
        onConsent={handleConsent}
        onDecline={handleDecline}
        onClose={closeConsentSheet}
      />
    </>
  );
};

export default AppInformation;
