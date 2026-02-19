/* eslint-disable dot-notation */
import React, { PureComponent } from 'react';
import {
  SafeAreaView,
  StyleSheet,
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
import {
  channel,
  runtimeVersion,
  isEmbeddedLaunch,
  isEnabled as isOTAUpdatesEnabled,
  updateId,
  checkAutomatically,
} from 'expo-updates';
import { connect } from 'react-redux';
import { OTA_VERSION } from '../../../../constants/ota';
import { fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { isQa } from '../../../../util/test/utils';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { getPreinstalledSnapsMetadata } from '../../../../selectors/snaps';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapperContent: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    title: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    link: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.primary.default,
    },
    division: {
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
      width: '30%',
      marginBottom: 20,
    },
    image: {
      width: 100,
      height: 100,
    },
    logoWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
      top: 20,
      marginBottom: 40,
    },
    versionInfo: {
      marginTop: 20,
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    branchInfo: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
  });

const foxImage = require('../../../../images/branding/fox.png'); // eslint-disable-line import/no-commonjs

// Keys from builds.yml _public_envs (lines 25-43) - show first 3 chars of value
const PUBLIC_ENVS = [
  'PORTFOLIO_API_URL',
  'SECURITY_ALERTS_API_URL',
  'DECODING_API_URL',
  'AUTH_SERVICE_URL',
  'REWARDS_API_URL',
  'BAANX_API_URL',
  'RAMPS_ENVIRONMENT',
  'BRIDGE_USE_DEV_APIS',
  'RAMP_INTERNAL_BUILD',
  'IS_TEST',
  'SEEDLESS_ONBOARDING_ENABLED',
  'MM_NOTIFICATIONS_UI_ENABLED',
  'MM_PERMISSIONS_SETTINGS_V1_ENABLED',
  'MM_PERPS_BLOCKED_REGIONS',
  'MM_PERPS_HIP3_ALLOWLIST_MARKETS',
  'MM_PERPS_HIP3_BLOCKLIST_MARKETS',
  'MM_PERPS_HIP3_ENABLED',
];

// Keys from builds.yml _secrets (lines 46-88) - check presence only
const BUILD_SECRETS = [
  'MM_SENTRY_AUTH_TOKEN',
  'MM_SENTRY_DSN',
  'GOOGLE_SERVICES_B64_IOS',
  'GOOGLE_SERVICES_B64_ANDROID',
  'MM_INFURA_PROJECT_ID',
  'WALLET_CONNECT_PROJECT_ID',
  'MM_FOX_CODE',
  'MM_BRANCH_KEY_LIVE',
  'SEGMENT_WRITE_KEY',
  'SEGMENT_PROXY_URL',
  'SEGMENT_DELETE_API_SOURCE_ID',
  'SEGMENT_REGULATIONS_ENDPOINT',
  'FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN',
  'FEATURES_ANNOUNCEMENTS_SPACE_ID',
  'FCM_CONFIG_API_KEY',
  'FCM_CONFIG_AUTH_DOMAIN',
  'FCM_CONFIG_STORAGE_BUCKET',
  'FCM_CONFIG_PROJECT_ID',
  'FCM_CONFIG_MESSAGING_SENDER_ID',
  'FCM_CONFIG_APP_ID',
  'FCM_CONFIG_MEASUREMENT_ID',
  'QUICKNODE_MAINNET_URL',
  'QUICKNODE_ARBITRUM_URL',
  'QUICKNODE_AVALANCHE_URL',
  'QUICKNODE_BASE_URL',
  'QUICKNODE_LINEA_MAINNET_URL',
  'QUICKNODE_MONAD_URL',
  'QUICKNODE_OPTIMISM_URL',
  'QUICKNODE_POLYGON_URL',
  'IOS_GOOGLE_CLIENT_ID',
  'IOS_GOOGLE_REDIRECT_URI',
  'ANDROID_APPLE_CLIENT_ID',
  'ANDROID_GOOGLE_CLIENT_ID',
  'ANDROID_GOOGLE_SERVER_CLIENT_ID',
  'MM_CARD_BAANX_API_CLIENT_KEY',
];

/**
 * View that contains app information
 */
class AppInformation extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    preinstalledSnaps: PropTypes.array,
  };

  state = {
    appInfo: '',
    appVersion: '',
    showEnvironmentInfo: false,
  };

  componentDidMount = async () => {
    const appName = await getApplicationName();
    const appVersion = await getVersion();
    const buildNumber = await getBuildNumber();
    const appInfo = `${appName} v${appVersion} (${buildNumber})`;
    const appInfoOta = `${appName} ota ${OTA_VERSION} (${buildNumber})`;
    const versionDisplay = isEmbeddedLaunch || __DEV__ ? appInfo : appInfoOta;
    this.setState({
      appInfo: versionDisplay,
      appVersion,
    });
  };

  goTo = (url, title) => {
    InteractionManager.runAfterInteractions(() => {
      this.props.navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url,
          title,
        },
      });
    });
  };

  onPrivacyPolicy = () => {
    const url = AppConstants.URLS.PRIVACY_POLICY;
    this.goTo(url, strings('app_information.privacy_policy'));
  };

  onTermsOfUse = () => {
    const url = AppConstants.URLS.TERMS_AND_CONDITIONS;
    this.goTo(url, strings('app_information.terms_of_use'));
  };

  onAttributions = () => {
    const url = `https://raw.githubusercontent.com/MetaMask/metamask-mobile/v${this.state.appVersion}/attribution.txt`;
    this.goTo(url, strings('app_information.attributions'));
  };

  onSupportCenter = () => {
    const url = 'https://support.metamask.io';
    this.goTo(url, strings('drawer.metamask_support'));
  };

  onWebSite = () => {
    const url = 'https://metamask.io/';
    this.goTo(url, 'metamask.io');
  };

  onContactUs = () => {
    const url = 'https://support.metamask.io';
    this.goTo(url, strings('drawer.metamask_support'));
  };

  handleLongPressFox = () => {
    this.setState({ showEnvironmentInfo: true });
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const otaUpdateMessage =
      __DEV__ || isEmbeddedLaunch
        ? 'This app is running from built-in code or in development mode'
        : 'This app is running an update';

    const aboutTitle = strings('app_settings.info_title');

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={AboutMetaMaskSelectorsIDs.CONTAINER}
      >
        <HeaderCompactStandard
          title={aboutTitle}
          onBack={() => this.props.navigation.goBack()}
          backButtonProps={{ testID: AboutMetaMaskSelectorsIDs.BACK_BUTTON }}
        />
        <ScrollView contentContainerStyle={styles.wrapperContent}>
          <View style={styles.logoWrapper}>
            <TouchableOpacity
              delayLongPress={10 * 1000} // 10 seconds
              onLongPress={this.handleLongPressFox}
              activeOpacity={1}
            >
              <Image
                source={foxImage}
                style={styles.image}
                resizeMethod={'auto'}
              />
            </TouchableOpacity>
            <Text style={styles.versionInfo}>{this.state.appInfo}</Text>
            {isQa ? (
              <Text style={styles.branchInfo}>
                {`Branch: ${process.env['GIT_BRANCH']}`}
              </Text>
            ) : null}

            {this.state.showEnvironmentInfo && (
              <>
                <Text style={styles.branchInfo}>
                  public_envs (first 3 chars):
                </Text>
                {PUBLIC_ENVS.map((key) => (
                  <Text key={key} style={styles.branchInfo}>
                    {`  ${key}: ${String(process.env[key] ?? '').slice(0, 3)}`}
                  </Text>
                ))}
                <Text style={styles.branchInfo}>secrets (present):</Text>
                {BUILD_SECRETS.map((key) => (
                  <Text key={key} style={styles.branchInfo}>
                    {`  ${key}: ${process.env[key] ? 'yes' : 'no'}`}
                  </Text>
                ))}
                <Text style={styles.branchInfo}>
                  {`Environment: ${process.env.METAMASK_ENVIRONMENT}`}
                </Text>
                <Text style={styles.branchInfo}>
                  {`Remote Feature Flag Env: ${getFeatureFlagAppEnvironment()}`}
                </Text>
                <Text style={styles.branchInfo}>
                  {`Remote Feature Flag Distribution: ${getFeatureFlagAppDistribution()}`}
                </Text>
                <Text style={styles.branchInfo}>
                  {`OTA Updates enabled: ${String(isOTAUpdatesEnabled)}`}
                </Text>
                {isOTAUpdatesEnabled && (
                  <>
                    <Text style={styles.branchInfo}>
                      {`Update ID: ${updateId || 'N/A'}`}
                    </Text>
                    <Text style={styles.branchInfo}>
                      {`OTA Update Channel: ${channel}`}
                    </Text>
                    <Text style={styles.branchInfo}>
                      {`OTA Update runtime version: ${runtimeVersion}`}
                    </Text>
                    <Text style={styles.branchInfo}>
                      {`Check Automatically: ${checkAutomatically}`}
                    </Text>
                    <Text style={styles.branchInfo}>
                      {`OTA Update status: ${otaUpdateMessage}`}
                    </Text>
                  </>
                )}

                {this.props.preinstalledSnaps.map((snap) => (
                  <Text key={snap.name} style={styles.branchInfo}>
                    {snap.name}: {snap.version} ({snap.status})
                  </Text>
                ))}
              </>
            )}
          </View>
          <Text style={styles.title}>{strings('app_information.links')}</Text>
          <View style={styles.links}>
            <TouchableOpacity onPress={this.onPrivacyPolicy}>
              <Text style={styles.link}>
                {strings('app_information.privacy_policy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.onTermsOfUse}>
              <Text style={styles.link}>
                {strings('app_information.terms_of_use')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.onAttributions}>
              <Text style={styles.link}>
                {strings('app_information.attributions')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.division} />
          <View style={styles.links}>
            <TouchableOpacity onPress={this.onSupportCenter}>
              <Text style={styles.link}>
                {strings('app_information.support_center')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.onWebSite}>
              <Text style={styles.link}>
                {strings('app_information.web_site')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.onContactUs}>
              <Text style={styles.link}>
                {strings('app_information.contact_us')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };
}

AppInformation.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  preinstalledSnaps: getPreinstalledSnapsMetadata(state),
});

export default connect(mapStateToProps)(AppInformation);
