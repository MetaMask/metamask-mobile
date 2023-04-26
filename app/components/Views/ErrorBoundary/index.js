import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Linking,
  Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import { RevealPrivateCredential } from '../RevealPrivateCredential';
import Logger from '../../../util/Logger';
import { fontStyles } from '../../../styles/common';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import ClipboardManager from '../../../core/ClipboardManager';
import { mockTheme, ThemeContext, useTheme } from '../../../util/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line import/no-commonjs
const metamaskErrorImage = require('../../../images/metamask-error.png');

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      paddingHorizontal: 24,
      flex: 1,
    },
    header: {
      alignItems: 'center',
    },
    errorImage: {
      width: 50,
      height: 50,
      marginTop: 24,
    },
    title: {
      color: colors.text.default,
      fontSize: 24,
      lineHeight: 34,
      ...fontStyles.bold,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.alternative,
      marginTop: 8,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    errorContainer: {
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      marginTop: 24,
    },
    error: {
      color: colors.text.default,
      padding: 8,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyles.normal,
    },
    button: {
      marginTop: 24,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 50,
      padding: 12,
      paddingHorizontal: 34,
    },
    buttonText: {
      color: colors.primary.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    textContainer: {
      marginTop: 24,
    },
    text: {
      color: colors.text.default,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyles.normal,
    },
    link: {
      color: colors.primary.default,
    },
    reportTextContainer: {
      paddingLeft: 14,
      marginTop: 16,
      marginBottom: 24,
    },
    reportStep: {
      marginTop: 14,
    },
  });

const Fallback = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Image source={metamaskErrorImage} style={styles.errorImage} />
        <Text style={styles.title}>{strings('error_screen.title')}</Text>
        <Text style={styles.subtitle}>{strings('error_screen.subtitle')}</Text>
      </View>
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{props.errorMessage}</Text>
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.button} onPress={props.resetError}>
          <Text style={styles.buttonText}>
            <Icon name="refresh" size={15} />
            {'  '}
            {strings('error_screen.try_again_button')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          <Text>{strings('error_screen.submit_ticket_1')}</Text>
        </Text>
        <View style={styles.reportTextContainer}>
          <Text style={styles.text}>
            <Icon name="mobile-phone" size={20} />
            {'  '}
            {strings('error_screen.submit_ticket_2')}
          </Text>

          <Text style={[styles.reportStep, styles.text]}>
            <Icon name="copy" size={14} />
            {'  '}
            <Text onPress={props.copyErrorToClipboard} style={styles.link}>
              {strings('error_screen.submit_ticket_3')}
            </Text>{' '}
            {strings('error_screen.submit_ticket_4')}
          </Text>

          <Text style={[styles.reportStep, styles.text]}>
            <Icon name="send-o" size={14} />
            {'  '}
            {strings('error_screen.submit_ticket_5')}{' '}
            <Text onPress={props.openTicket} style={styles.link}>
              {strings('error_screen.submit_ticket_6')}
            </Text>{' '}
            {strings('error_screen.submit_ticket_7')}
          </Text>
        </View>
        <Text style={styles.text}>
          {strings('error_screen.save_seedphrase_1')}{' '}
          <Text onPress={props.showExportSeedphrase} style={styles.link}>
            {strings('error_screen.save_seedphrase_2')}
          </Text>{' '}
          {strings('error_screen.save_seedphrase_3')}
        </Text>
      </View>
    </ScrollView>
  );
};

Fallback.propTypes = {
  errorMessage: PropTypes.string,
  resetError: PropTypes.func,
  showExportSeedphrase: PropTypes.func,
  copyErrorToClipboard: PropTypes.func,
  openTicket: PropTypes.func,
};

class ErrorBoundary extends Component {
  state = { error: null };

  static propTypes = {
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]),
    view: PropTypes.string.isRequired,
    navigation: PropTypes.object,
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    Logger.error(error, { View: this.props.view, ...errorInfo });
  }

  resetError = () => {
    this.setState({ error: null });
  };

  showExportSeedphrase = () => {
    this.setState({ backupSeedphrase: true });
  };

  cancelExportSeedphrase = () => {
    this.setState({ backupSeedphrase: false });
  };

  getErrorMessage = () =>
    `View: ${this.props.view}\n${this.state?.error?.toString()}`;

  copyErrorToClipboard = async () => {
    await ClipboardManager.setString(this.getErrorMessage());
    Alert.alert(
      strings('error_screen.copied_clipboard'),
      '',
      [{ text: strings('error_screen.ok') }],
      {
        cancelable: true,
      },
    );
  };

  openTicket = () => {
    const url = 'https://metamask.zendesk.com/hc/en-us';
    Linking.openURL(url);
  };

  renderWithSafeArea = (children) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
  };

  render() {
    return this.state.backupSeedphrase
      ? this.renderWithSafeArea(
          <RevealPrivateCredential
            credentialName={'seed_phrase'}
            cancel={this.cancelExportSeedphrase}
            navigation={this.props.navigation}
          />,
        )
      : this.state.error
      ? this.renderWithSafeArea(
          <Fallback
            errorMessage={this.getErrorMessage()}
            resetError={this.resetError}
            showExportSeedphrase={this.showExportSeedphrase}
            copyErrorToClipboard={this.copyErrorToClipboard}
            openTicket={this.openTicket}
          />,
        )
      : this.props.children;
  }
}

ErrorBoundary.contextType = ThemeContext;

export default ErrorBoundary;
