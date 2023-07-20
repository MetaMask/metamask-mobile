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
import StyledButton from '../../UI/StyledButton';
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
import { OutlinedTextField } from 'react-native-material-textfield';
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
import {
  trackErrorAsAnalytics,
  trackEventV2 as trackEvent,
} from '../../../util/analyticsV2';
import { toLowerCaseEquals } from '../../../util/general';
import DefaultPreference from 'react-native-default-preference';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
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
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectSelectedAddress } from '../../../selectors/preferencesController';

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
const VAULT_ERROR = 'Cannot unlock without a previous vault.';
const DENY_PIN_ERROR_ANDROID = 'Error: Error: Cancel';

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
     * Users current address
     */
    selectedAddress: PropTypes.string,

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
    trackEvent(MetaMetricsEvents.LOGIN_SCREEN_VIEWED);
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);

    const authData = await Authentication.getType();

    //Setup UI to handle Biometric
    const previouslyDisabled = await AsyncStorage.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await AsyncStorage.getItem(
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
      await Authentication.userEntryAuth(
        password,
        authType,
        this.props.selectedAddress,
      );

      // Get onboarding wizard state
      const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
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
      field.setValue('');
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
      } else if (containsErrorMessage(error, VAULT_ERROR)) {
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
      Logger.error(error, 'Failed to unlock');
    }
  };

  tryBiometric = async (e) => {
    if (e) e.preventDefault();
    const { current: field } = this.fieldRef;
    field?.blur();
    try {
      await Authentication.appTriggeredAuth(this.props.selectedAddress);
      const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
      if (!onboardingWizard) this.props.setOnboardingWizardStep(1);
      this.props.navigation.replace(Routes.ONBOARDING.HOME_NAV);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field.setValue('');
    } catch (error) {
      this.setState({ hasBiometricCredentials: true });
      Logger.log(error);
    }
    field?.blur();
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
                      hidden={shouldHideBiometricAccessoryButton}
                      biometryType={this.state.biometryType}
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
  selectedAddress: selectSelectedAddress(state),
  userLoggedIn: state.user.userLoggedIn,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  setAllowLoginWithRememberMe: (enabled) =>
    dispatch(setAllowLoginWithRememberMe(enabled)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
