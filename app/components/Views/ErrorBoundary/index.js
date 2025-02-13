import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  DevSettings,
  Image,
  TextInput,
} from 'react-native';
import PropTypes from 'prop-types';
import { lastEventId as getLatestSentryId } from '@sentry/react-native';
import { captureSentryFeedback } from '../../../util/sentry/utils';
import { RevealPrivateCredential } from '../RevealPrivateCredential';
import Logger from '../../../util/Logger';
import { fontStyles } from '../../../styles/common';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import CLIcon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { mockTheme, ThemeContext, useTheme } from '../../../util/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import CLText, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  MetaMetricsEvents,
  withMetricsAwareness,
} from '../../../components/hooks/useMetrics';
import AppConstants from '../../../core/AppConstants';
import { useSelector } from 'react-redux';
import { isE2E } from '../../../util/test/utils';
// eslint-disable-next-line import/no-commonjs
const WarningIcon = require('./warning-icon.png');

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 8,
      backgroundColor: colors.background.default,
    },
    header: {
      alignItems: 'center',
      paddingTop: 20,
    },
    errorImage: {
      width: 32,
      height: 32,
    },
    title: {
      color: colors.text.default,
      fontSize: 24,
      paddingTop: 10,
      paddingBottom: 20,
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
    errorMessageContainer: {
      flexShrink: 1,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      marginTop: 10,
      padding: 10,
    },
    error: {
      color: colors.error.default,
      padding: 8,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyles.normal,
    },
    button: {
      marginTop: 16,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 48,
      height: 48,
      padding: 12,
      paddingHorizontal: 34,
    },
    blueButton: {
      marginTop: 16,
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 48,
      height: 48,
      padding: 12,
      paddingHorizontal: 34,
    },
    buttonText: {
      color: colors.primary.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    blueButtonText: {
      color: colors.background.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    submitButton: {
      width: '45%',
      backgroundColor: colors.primary.default,
      marginTop: 24,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 48,
      height: 48,
      padding: 12,
      paddingHorizontal: 34,
    },
    cancelButton: {
      width: '45%',
      marginTop: 24,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 48,
      height: 48,
      padding: 12,
      paddingHorizontal: 34,
    },
    buttonsContainer: {
      flexGrow: 1,
      bottom: 10,
      justifyContent: 'flex-end',
    },
    modalButtonsWrapper: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      bottom: 24,
      paddingHorizontal: 10,
    },
    feedbackInput: {
      borderColor: colors.primary.default,
      minHeight: 175,
      minWidth: '100%',
      paddingHorizontal: 16,
      paddingTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 20,
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
    banner: {
      width: '100%',
      marginTop: 20,
      paddingHorizontal: 16,
    },
    keyboardViewContainer: { flex: 1, justifyContent: 'flex-end' },
    modalWrapper: { flex: 1, justifyContent: 'space-between' },
    modalTopContainer: { flex: 1, paddingTop: '20%', paddingHorizontal: 16 },
    closeIconWrapper: {
      position: 'absolute',
      right: 0,
      top: 2,
      bottom: 0,
    },
    modalTitleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitleText: { paddingTop: 0 },
    errorBoxTitle: { fontWeight: '600' },
    contentContainer: {
      justifyContent: 'space-between',
      flex: 1,
      paddingHorizontal: 16,
    },
    errorContentWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    row: { flexDirection: 'row' },
    copyText: {
      color: colors.primary.default,
      fontSize: 14,
      paddingLeft: 5,
      fontWeight: '500',
    },
    infoBanner: { marginBottom: 20 },
    hitSlop: { top: 50, right: 50, bottom: 50, left: 50 },
  });

export const Fallback = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');
  const dataCollectionForMarketing = useSelector(
    (state) => state.security.dataCollectionForMarketing,
  );

  const toggleModal = () => {
    setModalVisible((visible) => !visible);
    setFeedback('');
  };
  const handleContactSupport = () =>
    Linking.openURL(AppConstants.REVIEW_PROMPT.SUPPORT);
  const handleTryAgain = () => DevSettings.reload();

  const handleSubmit = () => {
    toggleModal();
    captureSentryFeedback({ sentryId: props.sentryId, comments: feedback });
    Alert.alert(strings('error_screen.bug_report_thanks'));
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={WarningIcon} style={styles.errorImage} />
        <Text style={styles.title}>{strings('error_screen.title')}</Text>
      </View>
      <BannerAlert
        severity={BannerAlertSeverity.Info}
        style={styles.infoBanner}
        description={<CLText>{strings('error_screen.subtitle')}</CLText>}
      />
      <BannerAlert
        severity={BannerAlertSeverity.Warning}
        description={
          <Text style={styles.text}>
            {strings('error_screen.save_seedphrase_1')}{' '}
            <Text onPress={props.showExportSeedphrase} style={styles.link}>
              {strings('error_screen.save_seedphrase_2')}
            </Text>{' '}
            {strings('error_screen.save_seedphrase_3')}
          </Text>
        }
      />

      {isE2E && (
        <Text style={styles.text}>
          <Text onPress={props.showExportSeedphrase} style={styles.link}>
            {strings('error_screen.save_seedphrase_2')}
          </Text>
        </Text>
      )}
      <View style={styles.errorContentWrapper}>
        <Text style={styles.errorBoxTitle}>
          {strings('error_screen.error_message')}
        </Text>
        <TouchableOpacity
          style={styles.row}
          onPress={props.copyErrorToClipboard}
        >
          <CLIcon
            name={IconName.Copy}
            size={IconSize.Sm}
            color={IconColor.Primary}
          />
          <Text style={styles.copyText}>{strings('error_screen.copy')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.errorMessageContainer}>
        <ScrollView>
          <Text style={styles.error}>{props.errorMessage}</Text>
        </ScrollView>
      </View>
      <View style={styles.buttonsContainer}>
        {dataCollectionForMarketing && (
          <TouchableOpacity style={styles.blueButton} onPress={toggleModal}>
            <Text style={styles.blueButtonText}>
              {strings('error_screen.describe')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={dataCollectionForMarketing ? styles.button : styles.blueButton}
          onPress={handleContactSupport}
        >
          <Text
            style={
              dataCollectionForMarketing
                ? styles.buttonText
                : styles.blueButtonText
            }
          >
            {strings('error_screen.contact_support')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleTryAgain}>
          <Text style={styles.buttonText}>
            {strings('error_screen.try_again')}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={toggleModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardViewContainer}
        >
          <View style={styles.modalWrapper}>
            <View style={styles.modalTopContainer}>
              <View style={styles.modalTitleWrapper}>
                <CLText
                  onPress={toggleModal}
                  variant={TextVariant.HeadingMD}
                  style={styles.modalTitleText}
                >
                  {strings('error_screen.modal_title')}
                </CLText>
                <TouchableOpacity
                  onPress={toggleModal}
                  style={styles.closeIconWrapper}
                  hitSlop={styles.hitSlop}
                >
                  <CLIcon
                    name={IconName.Close}
                    size={IconSize.Md}
                    color={IconColor.Default}
                    onPress={toggleModal}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                autoFocus
                value={feedback}
                onChangeText={setFeedback}
                placeholder={strings('error_screen.modal_placeholder')}
                style={styles.feedbackInput}
                multiline
                numberOfLines={10}
              />
            </View>
            <View style={styles.modalButtonsWrapper}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={toggleModal}
              >
                <Text style={styles.buttonText}>
                  {strings('error_screen.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!feedback}
                // eslint-disable-next-line react-native/no-inline-styles
                style={[styles.submitButton, { opacity: feedback ? 1 : 0.5 }]}
                onPress={handleSubmit}
              >
                <Text style={styles.blueButtonText}>
                  {strings('error_screen.submit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

Fallback.propTypes = {
  errorMessage: PropTypes.string,
  showExportSeedphrase: PropTypes.func,
  copyErrorToClipboard: PropTypes.func,
  sentryId: PropTypes.string,
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
    metrics: PropTypes.object,
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  generateErrorReport = (error, errorInfo = '') => {
    const {
      view,
      metrics: { trackEvent, createEventBuilder },
    } = this.props;
    const analyticsParams = { error: error?.toString(), boundary: view };
    // Organize stack trace
    const stackList = (errorInfo.split('\n') || []).map((stack) =>
      stack.trim(),
    );
    // Limit to 5 levels
    analyticsParams.stack = stackList.slice(1, 5).join(', ');

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ERROR_SCREEN_VIEWED)
        .addProperties(analyticsParams)
        .build(),
    );
  };

  componentDidCatch(error, errorInfo) {
    // Note: Sentry briefly removed this in the next version but eventually added it back in later versions.
    // Read more here - https://github.com/getsentry/sentry-javascript/issues/11951
    const sentryId = getLatestSentryId();
    this.setState({ sentryId });
    this.generateErrorReport(error, errorInfo?.componentStack);
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
    const url = 'https://support.metamask.io';
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
            sentryId={this.state.sentryId}
          />,
        )
      : this.props.children;
  }
}

ErrorBoundary.contextType = ThemeContext;

export default withMetricsAwareness(ErrorBoundary);
