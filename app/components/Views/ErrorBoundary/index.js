import React, { Component, useState } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Linking,
  Alert,
  Modal,
  KeyboardAvoidingView,
  DevSettings,
  TextInput,
} from 'react-native';
import PropTypes from 'prop-types';
import { lastEventId as getLatestSentryId } from '@sentry/react-native';
import {
  captureSentryFeedback,
  captureExceptionForced,
} from '../../../util/sentry/utils';
import { RevealPrivateCredential } from '../RevealPrivateCredential';
import Logger from '../../../util/Logger';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { mockTheme, ThemeContext, useTheme } from '../../../util/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  MetaMetricsEvents,
  withMetricsAwareness,
} from '../../../components/hooks/useMetrics';
import AppConstants from '../../../core/AppConstants';
import { useSelector } from 'react-redux';
import { isTest } from '../../../util/test/utils';
import { useSupportConsent } from '../../hooks/useSupportConsent';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      rowGap: 16,
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 20,
      rowGap: 16,
    },
    errorMessageContainer: {
      flexShrink: 1,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      padding: 16,
      marginTop: 8,
    },
    buttonsContainer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      flexDirection: 'column',
      rowGap: 16,
    },
    modalButtonsWrapper: {
      flexDirection: 'row',
      gap: 16,
      width: '100%',
      marginBottom: 16,
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
    keyboardViewContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.background.default,
    },
    modalWrapper: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 16,
    },
    modalTopContainer: { flex: 1, marginTop: 24 },
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
    errorContentWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    row: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGapgap: 4,
    },
    hitSlop: { top: 50, right: 50, bottom: 50, left: 50 },
    fullWidthButton: { flex: 1 },
  });

export const Fallback = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const isOnboardingError = Boolean(props.onboardingErrorConfig);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state) => state.security.dataCollectionForMarketing,
  );
  const dataCollectionForMarketing =
    isDataCollectionForMarketingEnabled && !isOnboardingError;

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const goToBrowserUrl = (url, title) => {
    Linking.openURL(url);
  };

  const { openSupportWebPage } = useSupportConsent(
    goToBrowserUrl,
    strings('error_screen.contact_support'),
  );

  const handleContactSupport = () => openSupportWebPage();

  const handleTryAgain = () => DevSettings.reload();

  const handleSubmit = () => {
    toggleModal();
    captureSentryFeedback({ sentryId: props.sentryId, comments: feedback });
    Alert.alert(strings('error_screen.bug_report_thanks'));
  };

  const forceSentryReport = async (error) => {
    try {
      await captureExceptionForced(error, {
        view: props.onboardingErrorConfig?.view || 'Unknown',
        context: 'ErrorBoundary forced report',
      });
    } catch (sentryError) {
      console.error('Failed to force report error to Sentry:', sentryError);
    }
  };

  // Use onboarding-specific text if onboardingErrorConfig is provided
  const title = isOnboardingError
    ? strings('onboarding_error_fallback.title')
    : strings('error_screen.title');
  const description = isOnboardingError
    ? strings('onboarding_error_fallback.description')
    : strings('error_screen.subtitle');
  const primaryButtonText = isOnboardingError
    ? strings('onboarding_error_fallback.send_report')
    : strings('error_screen.contact_support');
  const secondaryButtonText = isOnboardingError
    ? strings('onboarding_error_fallback.try_again')
    : strings('error_screen.try_again');
  const errorMessage = isOnboardingError
    ? strings('onboarding_error_fallback.error_message_report')
    : strings('error_screen.error_message');

  const navigateToOnboarding = () => {
    props.onboardingErrorConfig?.navigation?.reset({
      routes: [{ name: 'OnboardingRootNav' }],
    });
  };

  const onPrimary = isOnboardingError
    ? async () => {
        await forceSentryReport(props.onboardingErrorConfig.error);
        navigateToOnboarding();
      }
    : handleContactSupport;

  const onSecondary = isOnboardingError ? navigateToOnboarding : handleTryAgain;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.Warning}
        />
        <Text variant={TextVariant.HeadingLG} color={colors.text.default}>
          {title}
        </Text>
      </View>

      <BannerAlert
        severity={BannerAlertSeverity.Info}
        description={
          <Text variant={TextVariant.BodyMD} color={colors.text.default}>
            {description}
          </Text>
        }
      />

      {!isOnboardingError && (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={
            <Text variant={TextVariant.BodyMD} color={colors.text.default}>
              {strings('error_screen.save_seedphrase_1')}{' '}
              <Text
                onPress={props.showExportSeedphrase}
                variant={TextVariant.BodyMD}
                color={colors.primary.default}
              >
                {strings('error_screen.save_seedphrase_2')}
              </Text>{' '}
              {strings('error_screen.save_seedphrase_3')}
            </Text>
          }
        />
      )}

      {isTest && !isOnboardingError && (
        <Text
          onPress={props.showExportSeedphrase}
          variant={TextVariant.BodyMD}
          color={colors.primary.default}
        >
          {strings('error_screen.save_seedphrase_2')}
        </Text>
      )}

      <View>
        <View style={styles.errorContentWrapper}>
          <Text variant={TextVariant.BodyMDMedium} color={colors.text.default}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={styles.row}
            onPress={props.copyErrorToClipboard}
          >
            <Icon
              name={IconName.Copy}
              size={IconSize.Sm}
              color={IconColor.Primary}
            />
            <Text
              variant={TextVariant.BodyMDMedium}
              color={colors.primary.default}
            >
              {strings('error_screen.copy')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorMessageContainer}>
          <ScrollView>
            <Text variant={TextVariant.BodyMD} color={colors.error.default}>
              {props.errorMessage}
            </Text>
          </ScrollView>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        {dataCollectionForMarketing && (
          <Button
            onPress={toggleModal}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('error_screen.describe')}
          />
        )}

        <Button
          onPress={onPrimary}
          variant={
            dataCollectionForMarketing
              ? ButtonVariants.Secondary
              : ButtonVariants.Primary
          }
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={primaryButtonText}
        />

        <Button
          onPress={onSecondary}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={secondaryButtonText}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={toggleModal}
      >
        <KeyboardAvoidingView
          behavior={'padding'}
          style={styles.keyboardViewContainer}
        >
          <View style={styles.modalWrapper}>
            <View style={styles.modalTopContainer}>
              <View style={styles.modalTitleWrapper}>
                <Text onPress={toggleModal} variant={TextVariant.HeadingMD}>
                  {strings('error_screen.modal_title')}
                </Text>
                <TouchableOpacity
                  onPress={toggleModal}
                  style={styles.closeIconWrapper}
                  hitSlop={styles.hitSlop}
                >
                  <Icon
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
              <Button
                onPress={toggleModal}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('error_screen.cancel')}
                style={styles.fullWidthButton}
              />
              <Button
                onPress={handleSubmit}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('error_screen.submit')}
                isDisabled={!feedback}
                style={styles.fullWidthButton}
              />
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
  onboardingErrorConfig: PropTypes.shape({
    navigation: PropTypes.object,
    error: PropTypes.object,
    view: PropTypes.string,
  }),
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
    useOnboardingErrorHandling: PropTypes.bool,
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
    Logger.error(error, {
      View: this.props.view,
      ErrorBoundary: true,
      ...errorInfo,
    });
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
    const { useOnboardingErrorHandling } = this.props;
    const onboardingErrorConfig = useOnboardingErrorHandling
      ? {
          navigation: this.props.navigation,
          error: this.state.error,
          view: this.props.view,
        }
      : undefined;

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
            onboardingErrorConfig={onboardingErrorConfig}
          />,
        )
      : this.props.children;
  }
}

ErrorBoundary.contextType = ThemeContext;

export default withMetricsAwareness(ErrorBoundary);
