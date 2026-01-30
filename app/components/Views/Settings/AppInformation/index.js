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
import { getFullVersion, OTA_VERSION } from '../../../../constants/ota';
import { fontStyles } from '../../../../styles/common';
import { captureExceptionForced } from '../../../../util/sentry/utils';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import AppConstants from '../../../../core/AppConstants';
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

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.info_title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = async () => {
    this.updateNavBar();
    const appName = await getApplicationName();
    const appVersion = await getVersion();
    const buildNumber = await getBuildNumber();
    this.setState({
      appInfo: `${appName} v${appVersion} (${buildNumber})`,
      appVersion,
    });
  };

  componentDidUpdate = () => {
    this.updateNavBar();
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

  onSendSentryTestError = async () => {
    try {
      await captureExceptionForced(
        new Error(`OTA update Sentry test error production ${OTA_VERSION}`),
        {
          otaVersion: OTA_VERSION,
          channel,
          environment: process.env.METAMASK_ENVIRONMENT,
          timestamp: new Date().toISOString(),
        },
      );

      alert('Sentry test error sent successfully');
    } catch (error) {
      alert(`Failed to send Sentry test error: ${error.message}`);
    }
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const otaUpdateMessage =
      __DEV__ || isEmbeddedLaunch
        ? 'This app is running from built-in code or in development mode'
        : 'This app is running an update';

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={AboutMetaMaskSelectorsIDs.CONTAINER}
      >
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
            <Text style={styles.versionInfo}>
              {getFullVersion(this.state.appInfo)}
            </Text>
            {isQa ? (
              <Text style={styles.branchInfo}>
                {`Branch: ${process.env['GIT_BRANCH']}`}
              </Text>
            ) : null}

            {this.state.showEnvironmentInfo && (
              <>
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
          <TouchableOpacity onPress={this.onSendSentryTestError}>
            <Text style={styles.link}>
              Send Sentry test error production {OTA_VERSION}
            </Text>
          </TouchableOpacity>
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
