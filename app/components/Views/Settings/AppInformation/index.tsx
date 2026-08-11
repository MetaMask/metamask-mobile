/* eslint-disable dot-notation */
import React, { useEffect, useState } from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { Image, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';
import {
  isEmbeddedLaunch,
  isEnabled as isOTAUpdatesEnabled,
} from 'expo-updates';
import { connect } from 'react-redux';
import { OTA_RC_AUTO_LABEL, OTA_VERSION } from '../../../../constants/ota';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { useTheme } from '../../../../util/theme';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import { navigateToSupportConsent } from '../../../../util/support';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { isProduction } from '../../../../util/environment';
import { getPreinstalledSnapsMetadata } from '../../../../selectors/snaps';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import foxImage from '../../../../images/branding/fox.png';
import { createStyles } from './AppInformation.styles';
import { EnvironmentInfo } from './EnvironmentInfo';

interface Props {
  navigation: AppNavigationProp;
  preinstalledSnaps: ReturnType<typeof getPreinstalledSnapsMetadata>;
}

/**
 * View that contains app information
 */
const AppInformation = ({ navigation, preinstalledSnaps }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [showEnvironmentInfo, setShowEnvironmentInfo] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAppInformation = async () => {
      const [name, version, build] = await Promise.all([
        getApplicationName(),
        getVersion(),
        getBuildNumber(),
      ]);

      if (active) {
        setAppName(name);
        setAppVersion(version);
        setBuildNumber(build);
      }
    };

    loadAppInformation();

    return () => {
      active = false;
    };
  }, []);

  const goTo = (url: string, title: string) => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  };

  const onPrivacyPolicy = () => {
    const url = AppConstants.URLS.PRIVACY_POLICY;
    goTo(url, strings('app_information.privacy_policy'));
  };

  const onTermsOfUse = () => {
    const url = AppConstants.URLS.TERMS_AND_CONDITIONS;
    goTo(url, strings('app_information.terms_of_use'));
  };

  const onAttributions = () => {
    const url = `https://raw.githubusercontent.com/MetaMask/metamask-mobile/v${appVersion}/attribution.txt`;
    goTo(url, strings('app_information.attributions'));
  };

  // Shows the consent sheet on every tap (choice is not persisted, mirroring
  // the extension's behavior) before opening the support URL.
  const openSupportWithConsent = (title: string) => {
    navigateToSupportConsent(
      navigation,
      (url) => goTo(url, title),
      METAMASK_SUPPORT_URL,
    );
  };

  const onSupportCenter = () => {
    openSupportWithConsent(strings('drawer.metamask_support'));
  };

  const onWebSite = () => {
    const url = 'https://metamask.io/';
    goTo(url, 'metamask.io');
  };

  const onContactUs = () => {
    openSupportWithConsent(strings('drawer.metamask_support'));
  };

  const handleLongPressFox = () => {
    setShowEnvironmentInfo(true);
  };

  /**
   * Returns the version string to display (native app version or OTA version).
   * When OTA is disabled we're always on embedded code; native isEmbeddedLaunch can be false in that case.
   * On the RC channel, an Auto RC OTA revision label (e.g. 8.0.1.2) takes precedence over
   * OTA_VERSION so testers can tell which OTA revision they are running.
   */
  const getVersionDisplay = () => {
    const appInfo = `${appName} v${appVersion} (${buildNumber})`;
    const otaLabel = OTA_RC_AUTO_LABEL || OTA_VERSION;
    const appInfoOta = `${appName} ota ${otaLabel} (${buildNumber})`;
    const isRunningEmbedded = isEmbeddedLaunch || !isOTAUpdatesEnabled;
    return __DEV__ || isRunningEmbedded ? appInfo : appInfoOta;
  };

  const aboutTitle = strings('app_settings.info_title');

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={styles.wrapper}
      testID={AboutMetaMaskSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={aboutTitle}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: AboutMetaMaskSelectorsIDs.BACK_BUTTON }}
      />
      <ScrollView contentContainerStyle={styles.wrapperContent}>
        <View style={styles.logoWrapper}>
          <TouchableOpacity
            delayLongPress={10 * 1000} // 10 seconds
            onLongPress={handleLongPressFox}
            activeOpacity={1}
          >
            <Image
              source={foxImage}
              style={styles.image}
              resizeMethod={'auto'}
            />
          </TouchableOpacity>
          <Text style={styles.versionInfo}>{getVersionDisplay()}</Text>
          {!isProduction() ? (
            <Text style={styles.branchInfo}>
              {`${process.env.METAMASK_ENVIRONMENT?.toUpperCase() ?? 'DEV'} | Branch: ${process.env['GIT_BRANCH']}`}
            </Text>
          ) : null}

          {showEnvironmentInfo && (
            <EnvironmentInfo
              preinstalledSnaps={preinstalledSnaps}
              styles={styles}
            />
          )}
        </View>
        <Text style={styles.title}>{strings('app_information.links')}</Text>
        <View>
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
        <View>
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
  );
};

const mapStateToProps = (state: RootState) => ({
  preinstalledSnaps: getPreinstalledSnapsMetadata(state),
});

export default connect(mapStateToProps)(AppInformation);
