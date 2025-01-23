import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  ActivityIndicator,
  Keyboard,
  View,
  SafeAreaView,
  StyleSheet,
  Image,
  InteractionManager,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStep from '../../../actions/wizard';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { BiometryButton } from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { toLowerCaseEquals } from '../../../util/general';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from '../../Base/AnimatedFox';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';

const deviceHeight = Device.getDeviceHeight();
const breakPoint = deviceHeight < 700;

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    foxWrapper: {
      justifyContent: 'center',
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
      marginTop: 100,
    },
    image: {
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
    },
    title: {
      fontSize: Device.isAndroid() ? 30 : 35,
      lineHeight: Device.isAndroid() ? 35 : 40,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    field: {
      flex: 1,
      marginBottom: Device.isAndroid() ? 0 : 10,
      flexDirection: 'column',
    },
    label: {
      marginBottom: 12,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    footer: {
      marginVertical: 40,
      alignItems: 'center',
    },
    goBack: {
      marginVertical: 14,
    },
    biometrics: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      flex: 0,
    },
    cant: {
      width: 280,
      alignSelf: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    areYouSure: {
      width: '100%',
      padding: breakPoint ? 16 : 24,
      justifyContent: 'center',
      alignSelf: 'center',
    },
    heading: {
      marginHorizontal: 6,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 20,
      textAlign: 'center',
      lineHeight: breakPoint ? 24 : 26,
    },
    red: {
      marginHorizontal: 24,
      color: colors.error.default,
    },
    warningText: {
      ...fontStyles.normal,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: breakPoint ? 18 : 22,
      color: colors.text.default,
      marginTop: 20,
    },
    warningIcon: {
      alignSelf: 'center',
      color: colors.error.default,
      marginVertical: 10,
    },
    bold: {
      ...fontStyles.bold,
    },
    delete: {
      marginBottom: 20,
    },
    deleteWarningMsg: {
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 10,
      color: colors.error.default,
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
const WRONG_PASSWORD_ERROR_ANDROID =
  'Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT';
const VAULT_ERROR = 'Cannot unlock without a previous vault.';
const DENY_PIN_ERROR_ANDROID = 'Error: Error: Cancel';
const JSON_PARSE_ERROR_UNEXPECTED_TOKEN = 'Error: JSON Parse error';

/**
 * View where returning users can authenticate
 */
class Login extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Route passed in props from navigation
     */
    route: PropTypes.object,
    /**
     * Action to set if the user is using remember me
     */
    setAllowLoginWithRememberMe: PropTypes.func,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Full state of the app
     */
    fullState: PropTypes.object,
  };

  state = {
    password: '',
    biometryType: null,
    rememberMe: false,
    biometryChoice: false,
    loading: false,
    error: null,
    biometryPreviouslyDisabled: false,
    warningModalVisible: false,
    deleteModalVisible: false,
    disableDelete: true,
    deleteText: '',
    showDeleteWarning: false,
    hasBiometricCredentials: false,
  };

  fieldRef = React.createRef();

  parentSpan = trace({
    name: TraceName.Login,
    op: TraceOperation.Login,
    tags: getTraceTags(store.getState()),
  });

  async componentDidMount() {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
      parentContext: this.parentSpan,
    });

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.LOGIN_SCREEN_VIEWED)
        .build(),
    );
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);

    const authData = await Authentication.getType();

    //Setup UI to handle Biometric
    const previouslyDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await StorageWrapper.getItem(
      PASSCODE_DISABLED,
    );

    if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
      this.setState({
        biometryType: passcodeType(authData.currentAuthType),
        biometryChoice: !(
          passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
        ),
        biometryPreviouslyDisabled: !!passcodePreviouslyDisabled,
        hasBiometricCredentials: !this.props.route?.params?.locked,
      });
    } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
      this.setState({
        hasBiometricCredentials: false,
        rememberMe: true,
      });
      this.props.setAllowLoginWithRememberMe(true);
    } else if (authData.availableBiometryType) {
      this.setState({
        biometryType: authData.availableBiometryType,
        biometryChoice: !(previouslyDisabled && previouslyDisabled === TRUE),
        biometryPreviouslyDisabled: !!previouslyDisabled,
        hasBiometricCredentials:
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC &&
          !this.props.route?.params?.locked,
      });
    }
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  handleBackPress = async () => {
    await Authentication.lockApp();
    return false;
  };

  handleVaultCorruption = async () => {
    // This is so we can log vault corruption error in sentry
    const vaultCorruptionError = new Error('Vault Corruption Error');
    Logger.error(vaultCorruptionError, strings('login.clean_vault_error'));

    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';
    const { navigation } = this.props;
    if (!passwordRequirementsMet(this.state.password)) {
      this.setState({
        error: strings('login.invalid_password'),
      });
      return;
    }
    try {
      this.setState({ loading: true });
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(
          this.state.password,
          backupResult.vault,
        );
        if (vaultSeed) {
          // get authType
          const authData = await Authentication.componentAuthenticationType(
            this.state.biometryChoice,
            this.state.rememberMe,
          );
          try {
            await Authentication.storePassword(
              this.state.password,
              authData.currentAuthType,
            );
            navigation.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            );
            this.setState({
              loading: false,
              error: null,
            });
            return;
          } catch (e) {
            throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${e}`);
          }
        } else {
          throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} Invalid Password`);
        }
      } else if (backupResult.error) {
        throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${backupResult.error}`);
      }
    } catch (e) {
      Logger.error(e);
      this.setState({
        loading: false,
        error: strings('login.invalid_password'),
      });
    }
  };

  onLogin = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    const { password } = this.state;
    const { current: field } = this.fieldRef;
    const locked = !passwordRequirementsMet(password);
    if (locked) this.setState({ error: strings('login.invalid_password') });
    if (this.state.loading || locked) return;

    this.setState({ loading: true, error: null });
    const authType = await Authentication.componentAuthenticationType(
      this.state.biometryChoice,
      this.state.rememberMe,
    );

    try {
      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
          parentContext: this.parentSpan,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );
      Keyboard.dismiss();

      // Get onboarding wizard state
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (onboardingWizard) {
        this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
      } else {
        this.props.setOnboardingWizardStep(1);
        this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
      }
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field?.clear();
    } catch (e) {
      const error = e.toString();
      if (
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR_ANDROID)
      ) {
        this.setState({
          loading: false,
          error: strings('login.invalid_password'),
        });

        trackErrorAsAnalytics('Login: Invalid Password', error);

        return;
      } else if (error === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
        this.setState({ loading: false });
      } else if (
        containsErrorMessage(error, VAULT_ERROR) ||
        containsErrorMessage(error, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        try {
          await this.handleVaultCorruption();
        } catch (e) {
          // we only want to display this error to the user IF we fail to handle vault corruption
          Logger.error(e, 'Failed to handle vault corruption');
          this.setState({
            loading: false,
            error: strings('login.clean_vault_error'),
          });
        }
      } else if (toLowerCaseEquals(error, DENY_PIN_ERROR_ANDROID)) {
        this.setState({ loading: false });
        this.updateBiometryChoice(false);
      } else {
        this.setState({ loading: false, error });
      }
      Logger.error(e, 'Failed to unlock');
    }
    endTrace({ name: TraceName.Login });
  };

  tryBiometric = async (e) => {
    if (e) e.preventDefault();
    endTrace({ name: TraceName.LoginUserInteraction });
    const { current: field } = this.fieldRef;
    field?.blur();
    try {
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
          parentContext: this.parentSpan,
        },
        async () => {
          await Authentication.appTriggeredAuth();
        },
      );
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (!onboardingWizard) this.props.setOnboardingWizardStep(1);
      this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field?.clear();
    } catch (error) {
      this.setState({ hasBiometricCredentials: true });
      Logger.log(error);
    }
    field?.blur();
  };

  toggleWarningModal = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  updateBiometryChoice = async (biometryChoice) => {
    await updateAuthTypeStorageFlags(biometryChoice);
    this.setState({ biometryChoice });
  };

  renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMe) => {
      this.setState({ rememberMe });
    };
    const shouldRenderBiometricLogin =
      this.state.biometryType && !this.state.biometryPreviouslyDisabled
        ? this.state.biometryType
        : null;
    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={shouldRenderBiometricLogin}
        biometryChoiceState={this.state.biometryChoice}
        onUpdateBiometryChoice={this.updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  setPassword = (val) => this.setState({ password: val });

  onCancelPress = () => {
    this.toggleWarningModal();
    InteractionManager.runAfterInteractions(this.toggleDeleteModal);
  };

  handleDownloadStateLogs = () => {
    const { fullState } = this.props;
    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS)
        .build(),
    );
    downloadStateLogs(fullState, false);
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);
    const shouldHideBiometricAccessoryButton = !(
      this.state.biometryChoice &&
      this.state.biometryType &&
      this.state.hasBiometricCredentials
    );

    return (
      <ErrorBoundary navigation={this.props.navigation} view="Login">
        <SafeAreaView style={styles.mainWrapper}>
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            resetScrollToCoords={{ x: 0, y: 0 }}
            style={styles.wrapper}
          >
            <View testID={LoginViewSelectors.CONTAINER}>
              <TouchableOpacity
                style={styles.foxWrapper}
                delayLongPress={10 * 1000} // 10 seconds
                onLongPress={this.handleDownloadStateLogs}
                activeOpacity={1}
              >
                {Device.isAndroid() ? (
                  <Image
                    source={require('../../../images/fox.png')}
                    style={styles.image}
                    resizeMethod={'auto'}
                  />
                ) : (
                  <AnimatedFox bgColor={colors.background.default} />
                )}
              </TouchableOpacity>

              <Text style={styles.title} testID={LoginViewSelectors.TITLE_ID}>
                {strings('login.title')}
              </Text>
              <View style={styles.field}>
                <Label
                  variant={TextVariant.HeadingSMRegular}
                  style={styles.label}
                >
                  {strings('login.password')}
                </Label>
                <TextField
                  size={TextFieldSize.Lg}
                  placeholder={strings('login.password')}
                  placeholderTextColor={colors.text.muted}
                  testID={LoginViewSelectors.PASSWORD_INPUT}
                  returnKeyType={'done'}
                  autoCapitalize="none"
                  secureTextEntry
                  ref={this.fieldRef}
                  onChangeText={this.setPassword}
                  value={this.state.password}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                  onSubmitEditing={this.onLogin}
                  endAccessory={
                    <BiometryButton
                      onPress={this.tryBiometric}
                      hidden={shouldHideBiometricAccessoryButton}
                      biometryType={this.state.biometryType}
                    />
                  }
                  keyboardAppearance={themeAppearance}
                />
              </View>

              {this.renderSwitch()}

              {!!this.state.error && (
                <HelpText
                  severity={HelpTextSeverity.Error}
                  variant={TextVariant.BodyMD}
                  testID={LoginViewSelectors.PASSWORD_ERROR}
                >
                  {this.state.error}
                </HelpText>
              )}
              <View
                style={styles.ctaWrapper}
                testID={LoginViewSelectors.LOGIN_BUTTON_ID}
              >
                <Button
                  variant={ButtonVariants.Primary}
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  onPress={this.onLogin}
                  label={
                    this.state.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary.inverse}
                      />
                    ) : (
                      strings('login.unlock_button')
                    )
                  }
                />
              </View>

              <View style={styles.footer}>
                <Text
                  variant={TextVariant.HeadingSMRegular}
                  style={styles.cant}
                >
                  {strings('login.go_back')}
                </Text>
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={this.toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.reset_wallet')}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
          <FadeOutOverlay />
        </SafeAreaView>
      </ErrorBoundary>
    );
  };
}

Login.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  userLoggedIn: state.user.userLoggedIn,
  fullState: state,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  setAllowLoginWithRememberMe: (enabled) =>
    dispatch(setAllowLoginWithRememberMe(enabled)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Login));
