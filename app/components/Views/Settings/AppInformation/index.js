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
import { fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import AppConstants from '../../../../core/AppConstants';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const IS_QA = process.env['METAMASK_ENVIRONMENT'] === 'qa';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapperContent: {
      paddingLeft: 24,
      paddingRight: 24,
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

const foxImage = require('../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * View that contains app information
 */
export default class AppInformation extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
  };

  state = {
    appInfo: '',
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
    this.setState({ appInfo: `${appName} v${appVersion} (${buildNumber})` });
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
    const url =
      'https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/attribution.txt';
    this.goTo(url, strings('app_information.attributions'));
  };

  onSupportCenter = () => {
    const url = 'https://metamask.zendesk.com/hc/en-us';
    this.goTo(url, strings('drawer.metamask_support'));
  };

  onWebSite = () => {
    const url = 'https://metamask.io/';
    this.goTo(url, 'metamask.io');
  };

  onContactUs = () => {
    const url = 'https://metamask.zendesk.com/hc/en-us';
    this.goTo(url, strings('drawer.metamask_support'));
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.wrapper} testID={'app-settings-screen'}>
        <ScrollView contentContainerStyle={styles.wrapperContent}>
          <View style={styles.logoWrapper}>
            <Image
              source={foxImage}
              style={styles.image}
              resizeMethod={'auto'}
            />
            <Text style={styles.versionInfo}>{this.state.appInfo}</Text>
            {IS_QA ? (
              <Text style={styles.branchInfo}>
                {`Branch: ${process.env['GIT_BRANCH']}`}
              </Text>
            ) : null}
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
