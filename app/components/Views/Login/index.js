import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  ActivityIndicator,
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  Image,
  InteractionManager,
  BackHandler,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from 'react-native-button';
import Engine from '../../../core/Engine';
import StyledButton from '../../UI/StyledButton';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStep from '../../../actions/wizard';
import { logIn, logOut, checkedAuth } from '../../../actions/user';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import { OutlinedTextField } from 'react-native-material-textfield';
import BiometryButton from '../../UI/BiometryButton';
import { recreateVaultWithSamePassword } from '../../../core/Vault';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  ENCRYPTION_LIB,
  TRUE,
  ORIGINAL,
  EXISTING_USER,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { toLowerCaseEquals } from '../../../util/general';
import DefaultPreference from 'react-native-default-preference';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from 'react-native-animated-fox';
import {
  LOGIN_PASSWORD_ERROR,
  RESET_WALLET_ID,
} from '../../../constants/test-ids';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  LOGIN_VIEW_PASSWORD_INPUT_ID,
  LOGIN_VIEW_TITLE_ID,
  LOGIN_VIEW_UNLOCK_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/LoginScreen.testIds';

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
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      ...fontStyles.normal,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    footer: {
      marginVertical: 40,
    },
    errorMsg: {
      color: colors.error.default,
      ...fontStyles.normal,
      lineHeight: 20,
    },
    goBack: {
      marginVertical: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
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
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
    cant: {
      width: 280,
      alignSelf: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.default,
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
const VAULT_ERROR = 'Error: Cannot unlock without a previous vault.';

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
     * Temporary string that controls if componentDidMount should handle initial auth logic on mount
     */
    initialScreen: PropTypes.string,
    /**
     * A string representing the selected address => account
     */
    selectedAddress: PropTypes.string,
    logIn: PropTypes.func,
    logOut: PropTypes.func,
    /**
     * TEMPORARY state for animation control on Nav/App/index.js
     */
    checkedAuth: PropTypes.func,

    /**
     * Action to set if the user is using remember me
     */
    setAllowLoginWithRememberMe: PropTypes.func,
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

  async componentDidMount() {
    const { initialScreen } = this.props;
    const { KeyringController } = Engine.context;
    const shouldHandleInitialAuth = initialScreen !== 'onboarding';
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);

    // Lock keyring just in case
    if (KeyringController.isUnlocked()) {
      await KeyringController.setLocked();
    }

    const biometryType = await SecureKeychain.getSupportedBiometryType();
    if (biometryType) {
      const previouslyDisabled = await AsyncStorage.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const enabled = !(previouslyDisabled && previouslyDisabled === TRUE);

      this.setState({
        biometryType: Device.isAndroid() ? 'biometrics' : biometryType,
        biometryChoice: enabled,
        biometryPreviouslyDisabled: !!previouslyDisabled,
      });
      if (shouldHandleInitialAuth) {
        try {
          if (enabled && !previouslyDisabled) {
            await this.tryBiometric();
          }
        } catch (e) {
          console.warn(e);
        }
        if (!enabled) {
          await this.checkIfRememberMeEnabled();
        }
      }
    } else {
      shouldHandleInitialAuth && (await this.checkIfRememberMeEnabled());
    }

    this.props.checkedAuth();
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  handleBackPress = () => {
    this.props.logOut();
    return false;
  };

  /**
   * Checks to see if the user has enabled Remember Me and logs
   * into the application if it is enabled.
   */
  checkIfRememberMeEnabled = async () => {
    try {
      const credentials = await SecureKeychain.getGenericPassword();
      if (credentials) {
        this.setState({ rememberMe: true });
        this.props.setAllowLoginWithRememberMe(true);
        // Restore vault with existing credentials
        const { KeyringController } = Engine.context;
        try {
          await KeyringController.submitPassword(credentials.password);
          const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
          if (encryptionLib !== ORIGINAL) {
            await recreateVaultWithSamePassword(
              credentials.password,
              this.props.selectedAddress,
            );
            await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
          }
          // Get onboarding wizard state
          const onboardingWizard = await DefaultPreference.get(
            ONBOARDING_WIZARD,
          );
          if (!onboardingWizard) {
            this.props.setOnboardingWizardStep(1);
          }

          // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
          this.setState({ hasBiometricCredentials: false });
          delete credentials.password;
          this.props.logIn();
          this.props.navigation.replace('HomeNav');
        } catch (error) {
          this.setState({ rememberMe: false });
          Logger.error(error, 'Failed to login using Remember Me');
        }
      }
    } catch (error) {
      if (error.message === 'User canceled the operation.') {
        return;
      }
      Logger.error(error, 'Failed to access SecureKeychain');
    }
  };

  onLogin = async (hasCredentials = false) => {
    const { password } = this.state;
    const { current: field } = this.fieldRef;
    const locked = !passwordRequirementsMet(password);
    if (locked) this.setState({ error: strings('login.invalid_password') });
    if (this.state.loading || locked) return;
    try {
      this.setState({ loading: true, error: null });
      const { KeyringController } = Engine.context;
      // Restore vault with user entered password
      await KeyringController.submitPassword(this.state.password);
      const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      if (encryptionLib !== ORIGINAL && existingUser) {
        await recreateVaultWithSamePassword(
          this.state.password,
          this.props.selectedAddress,
        );
        await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
      }
      // If the tryBiometric has been called and they password was retrived don't set it again
      if (!hasCredentials) {
        if (this.state.biometryChoice && this.state.biometryType) {
          await SecureKeychain.setGenericPassword(
            this.state.password,
            SecureKeychain.TYPES.BIOMETRICS,
          );
        } else if (this.state.rememberMe) {
          await SecureKeychain.setGenericPassword(
            this.state.password,
            SecureKeychain.TYPES.REMEMBER_ME,
          );
        } else {
          await SecureKeychain.resetGenericPassword();
        }
      }

      this.props.logIn();

      // Get onboarding wizard state
      const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
      if (onboardingWizard) {
        this.props.navigation.replace('HomeNav');
      } else {
        this.props.setOnboardingWizardStep(1);
        this.props.navigation.replace('HomeNav');
      }
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field.setValue('');
    } catch (e) {
      // Should we force people to enable passcode / biometrics?
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
      } else if (toLowerCaseEquals(error, VAULT_ERROR)) {
        const vaultCorruptionError = new Error('Vault Corruption Error');
        Logger.error(vaultCorruptionError, strings('login.clean_vault_error'));
        this.setState({
          loading: false,
          error: strings('login.clean_vault_error'),
        });
      } else {
        this.setState({ loading: false, error });
      }
      Logger.error(error, 'Failed to unlock');
    }
  };

  triggerLogIn = () => {
    this.onLogin();
  };

  toggleWarningModal = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  updateBiometryChoice = async (biometryChoice) => {
    if (!biometryChoice) {
      await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    } else {
      await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
    }
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

  tryBiometric = async (e) => {
    if (e) e.preventDefault();
    const { current: field } = this.fieldRef;
    field.blur();
    try {
      const credentials = await SecureKeychain.getGenericPassword();
      if (!credentials) {
        this.setState({ hasBiometricCredentials: false });
        return;
      }
      field.blur();
      this.setState({ password: credentials.password });
      field.setValue(credentials.password);
      field.blur();
      await this.onLogin(true);
    } catch (error) {
      this.setState({ hasBiometricCredentials: true });
      Logger.log(error);
    }
    field.blur();
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <ErrorBoundary view="Login">
        <SafeAreaView style={styles.mainWrapper}>
          <KeyboardAwareScrollView
            style={styles.wrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View testID={'login'} {...generateTestId(Platform, 'login')}>
              <View style={styles.foxWrapper}>
                {Device.isAndroid() ? (
                  <Image
                    source={require('../../../images/fox.png')}
                    style={styles.image}
                    resizeMethod={'auto'}
                  />
                ) : (
                  <AnimatedFox bgColor={colors.background.default} />
                )}
              </View>
              <Text
                style={styles.title}
                {...generateTestId(Platform, LOGIN_VIEW_TITLE_ID)}
              >
                {strings('login.title')}
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>{strings('login.password')}</Text>
                <OutlinedTextField
                  style={styles.input}
                  placeholder={strings('login.password')}
                  placeholderTextColor={colors.text.muted}
                  testID={'login-password-input'}
                  {...generateTestId(Platform, LOGIN_VIEW_PASSWORD_INPUT_ID)}
                  returnKeyType={'done'}
                  autoCapitalize="none"
                  secureTextEntry
                  ref={this.fieldRef}
                  onChangeText={this.setPassword}
                  value={this.state.password}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                  onSubmitEditing={this.triggerLogIn}
                  renderRightAccessory={() => (
                    <BiometryButton
                      onPress={this.tryBiometric}
                      hidden={
                        !(
                          this.state.biometryChoice &&
                          this.state.biometryType &&
                          this.state.hasBiometricCredentials
                        )
                      }
                      type={this.state.biometryType}
                    />
                  )}
                  keyboardAppearance={themeAppearance}
                />
              </View>

              {this.renderSwitch()}

              {!!this.state.error && (
                <Text style={styles.errorMsg} testID={LOGIN_PASSWORD_ERROR}>
                  {this.state.error}
                </Text>
              )}
              <View
                style={styles.ctaWrapper}
                testID={'log-in-button'}
                {...generateTestId(Platform, LOGIN_VIEW_UNLOCK_BUTTON_ID)}
              >
                <StyledButton type={'confirm'} onPress={this.triggerLogIn}>
                  {this.state.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('login.unlock_button')
                  )}
                </StyledButton>
              </View>

              <View style={styles.footer}>
                <Text style={styles.cant}>{strings('login.go_back')}</Text>
                <Button
                  style={styles.goBack}
                  onPress={this.toggleWarningModal}
                  testID={RESET_WALLET_ID}
                  {...generateTestId(Platform, RESET_WALLET_ID)}
                >
                  {strings('login.reset_wallet')}
                </Button>
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
  selectedAddress:
    state.engine.backgroundState.PreferencesController?.selectedAddress,
  initialScreen: state.user.initialScreen,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  logIn: () => dispatch(logIn()),
  logOut: () => dispatch(logOut()),
  checkedAuth: () => dispatch(checkedAuth('login')),
  setAllowLoginWithRememberMe: (enabled) =>
    dispatch(setAllowLoginWithRememberMe(enabled)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
