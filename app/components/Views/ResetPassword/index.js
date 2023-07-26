import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Text,
  View,
  TextInput,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Image,
  InteractionManager,
  Platform,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connect } from 'react-redux';
import {
  passwordSet,
  passwordUnset,
  seedphraseNotBackedUp,
} from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import { fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import Icon from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import zxcvbn from 'zxcvbn';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  TRUE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
} from '../../../util/password';
import NotificationManager from '../../../core/NotificationManager';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from 'react-native-animated-fox';
import {
  CREATE_PASSWORD_CONTAINER_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
} from '../../../constants/test-ids';
import {
  RESET_PASSWORD_INPUT_ID,
  RESET_PASSWORD_INPUT_BOX_ID,
  RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
  RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { recreateVaultWithNewPassword } from '../../../core/Vault';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Logger from '../../../util/Logger';
import { selectSelectedAddress } from '../../../selectors/preferencesController';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollviewWrapper: {
      flexGrow: 1,
    },
    confirm_title: {
      fontSize: 32,
      marginTop: 10,
      marginBottom: 10,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
    },
    confirm_input: {
      borderWidth: 2,
      borderRadius: 5,
      width: '100%',
      borderColor: colors.border.default,
      padding: 10,
      height: 40,
      color: colors.text.default,
    },
    confirm_label: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    wrapper: {
      flex: 1,
      marginBottom: 10,
    },
    scrollableWrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    keyboardScrollableWrapper: {
      flexGrow: 1,
    },
    loadingWrapper: {
      paddingHorizontal: 40,
      paddingBottom: 30,
      alignItems: 'center',
      flex: 1,
    },
    foxWrapper: {
      width: Device.isIos() ? 90 : 80,
      height: Device.isIos() ? 90 : 80,
      marginTop: 30,
      marginBottom: 30,
    },
    image: {
      alignSelf: 'center',
      width: 80,
      height: 80,
    },
    passwordRequiredContent: {
      marginBottom: 20,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 24,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      width: '100%',
      ...fontStyles.normal,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    text: {
      marginBottom: 10,
      justifyContent: 'center',
      ...fontStyles.normal,
    },
    checkboxContainer: {
      marginTop: 10,
      marginHorizontal: 10,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    checkbox: {
      width: 18,
      height: 18,
      margin: 10,
      marginTop: -5,
    },
    label: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
      paddingHorizontal: 10,
      lineHeight: 18,
    },
    learnMore: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
      textDecorationColor: colors.primary.default,
    },
    field: {
      position: 'relative',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: 10,
      borderRadius: 6,
      fontSize: 14,
      height: 50,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    ctaWrapper: {
      flex: 1,
      marginTop: 20,
      paddingHorizontal: 10,
    },
    errorMsg: {
      color: colors.error.default,
      ...fontStyles.normal,
    },
    biometrics: {
      position: 'relative',
      marginTop: 20,
      marginBottom: 30,
    },
    biometryLabel: {
      fontSize: 14,
      color: colors.text.default,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    biometrySwitch: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    hintLabel: {
      height: 20,
      marginTop: 14,
      fontSize: 12,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    showPassword: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    strength_weak: {
      color: colors.error.default,
    },
    strength_good: {
      color: colors.primary.default,
    },
    strength_strong: {
      color: colors.success.default,
    },
    showMatchingPasswords: {
      position: 'absolute',
      top: 50,
      right: 17,
      alignSelf: 'flex-end',
    },
    confirmPasswordWrapper: {
      flex: 1,
      padding: 30,
      paddingTop: 0,
    },
    buttonWrapper: {
      flex: 1,
      marginTop: 20,
      justifyContent: 'flex-end',
    },
    warningMessageText: {
      paddingVertical: 10,
      color: colors.error.default,
      ...fontStyles.normal,
    },
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const RESET_PASSWORD = 'reset_password';
const CONFIRM_PASSWORD = 'confirm_password';

/**
 * View where users can set their password for the first time
 */
class ResetPassword extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * The action to update the password set flag
     * in the redux store
     */
    passwordSet: PropTypes.func,
    /**
     * The action to update the lock time
     * in the redux store
     */
    setLockTime: PropTypes.func,
    /**
     * A string representing the selected address => account
     */
    selectedAddress: PropTypes.string,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  state = {
    isSelected: false,
    password: '',
    confirmPassword: '',
    secureTextEntry: true,
    biometryType: null,
    biometryChoice: false,
    rememberMe: false,
    loading: false,
    error: null,
    inputWidth: { width: '99%' },
    view: RESET_PASSWORD,
    originalPassword: null,
    ready: true,
  };

  mounted = true;

  confirmPasswordInput = React.createRef();

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('password_reset.change_password'),
        navigation,
        false,
        colors,
      ),
    );
  };

  async componentDidMount() {
    this.updateNavBar();

    const state = { view: CONFIRM_PASSWORD };
    const authData = await Authentication.getType();
    const previouslyDisabled = await AsyncStorage.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await AsyncStorage.getItem(
      PASSCODE_DISABLED,
    );
    if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE)
      this.setState({
        biometryType: passcodeType(authData.currentAuthType),
        biometryChoice: !(
          passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
        ),
      });
    else if (authData.availableBiometryType)
      this.setState({
        biometryType: authData.availableBiometryType,
        biometryChoice: !(previouslyDisabled && previouslyDisabled === TRUE),
      });

    this.setState(state);

    setTimeout(() => {
      this.setState({
        inputWidth: { width: '100%' },
      });
    }, 100);
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateNavBar();
    const prevLoading = prevState.loading;
    const { loading } = this.state;
    const { navigation } = this.props;
    if (!prevLoading && loading) {
      // update navigationOptions
      navigation.setParams({
        headerLeft: () => <View />,
      });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  setSelection = () => {
    const { isSelected } = this.state;
    this.setState(() => ({ isSelected: !isSelected }));
  };

  onPressCreate = async () => {
    const { loading, isSelected, password, confirmPassword } = this.state;
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = passwordsMatch && isSelected;

    if (!canSubmit) return;
    if (loading) return;
    if (!passwordRequirementsMet(password)) {
      Alert.alert('Error', strings('choose_password.password_length_error'));
      return;
    } else if (password !== confirmPassword) {
      Alert.alert('Error', strings('choose_password.password_dont_match'));
      return;
    }
    try {
      this.setState({ loading: true });

      await this.recreateVault();
      // Set biometrics for new password
      await Authentication.resetPassword();
      try {
        // compute and store the new authentication method
        const authData = await Authentication.componentAuthenticationType(
          this.state.biometryChoice,
          this.state.rememberMe,
        );
        await Authentication.storePassword(password, authData.currentAuthType);
      } catch (error) {
        Logger.error(error);
      }

      this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
      this.props.passwordSet();
      this.setState({ loading: false });
      InteractionManager.runAfterInteractions(() => {
        this.props.navigation.navigate('SecuritySettings');
        NotificationManager.showSimpleNotification({
          status: 'success',
          duration: 5000,
          title: strings('reset_password.password_updated'),
          description: strings('reset_password.successfully_changed'),
        });
      });
    } catch (error) {
      // Should we force people to enable passcode / biometrics?
      if (error.toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
        this.setState({ loading: false });
      } else {
        this.setState({ loading: false, error: error.toString() });
      }
    }
  };

  /**
   * Recreates a vault
   *
   */
  recreateVault = async () => {
    const { originalPassword, password: newPassword } = this.state;
    // Recreate keyring with password
    await recreateVaultWithNewPassword(
      originalPassword,
      newPassword,
      this.props.selectedAddress,
    );
  };

  /**
   * Returns current vault seed phrase
   * It does it using an empty password or a password set by the user
   * depending on the state the app is currently in
   */
  getSeedPhrase = async () => {
    const { KeyringController } = Engine.context;
    const { originalPassword } = this.state;
    const keychainPassword = originalPassword;
    const mnemonic = await KeyringController.exportSeedPhrase(
      keychainPassword,
    ).toString();
    return JSON.stringify(mnemonic).replace(/"/g, '');
  };

  jumpToConfirmPassword = () => {
    const { current } = this.confirmPasswordInput;
    current && current.focus();
  };

  updateBiometryChoice = async (biometryChoice) => {
    await updateAuthTypeStorageFlags(biometryChoice);
    this.setState({ biometryChoice });
  };

  renderSwitch = () => {
    const { biometryType, biometryChoice } = this.state;
    const handleUpdateRememberMe = (rememberMe) => {
      this.setState({ rememberMe });
    };
    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={biometryType}
        biometryChoiceState={biometryChoice}
        onUpdateBiometryChoice={this.updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  tryExportSeedPhrase = async (password) => {
    // const { originalPassword } = this.state;
    const { KeyringController } = Engine.context;
    await KeyringController.exportSeedPhrase(password);
  };

  tryUnlockWithPassword = async (password) => {
    this.setState({ ready: false });
    try {
      // Just try
      await this.tryExportSeedPhrase(password);
      this.setState({
        password: null,
        originalPassword: password,
        ready: true,
        view: RESET_PASSWORD,
      });
    } catch (e) {
      const msg = strings('reveal_credential.warning_incorrect_password');
      this.setState({
        warningIncorrectPassword: msg,
        ready: true,
      });
    }
  };

  tryUnlock = () => {
    const { password } = this.state;
    this.tryUnlockWithPassword(password);
  };

  onPasswordChange = (val) => {
    const passInfo = zxcvbn(val);

    this.setState({ password: val, passwordStrength: passInfo.score });
  };

  toggleShowHide = () => {
    this.setState((state) => ({ secureTextEntry: !state.secureTextEntry }));
  };

  learnMore = () => {
    this.props.navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://metamask.zendesk.com/hc/en-us/articles/360039616872-How-can-I-reset-my-password-',
        title: 'metamask.zendesk.com',
      },
    });
  };

  renderLoader = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  setConfirmPassword = (val) => this.setState({ confirmPassword: val });

  renderConfirmPassword() {
    const { warningIncorrectPassword } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={'padding'}
      >
        <KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
          <View style={styles.confirmPasswordWrapper}>
            <View style={[styles.content, styles.passwordRequiredContent]}>
              <Text style={styles.confirm_title}>
                {strings('manual_backup_step_1.confirm_password')}
              </Text>
              <View style={styles.text}>
                <Text style={styles.confirm_label}>
                  {strings('manual_backup_step_1.before_continiuing')}
                </Text>
              </View>
              <TextInput
                style={styles.confirm_input}
                placeholder={'Password'}
                placeholderTextColor={colors.text.muted}
                onChangeText={this.onPasswordChange}
                secureTextEntry
                onSubmitEditing={this.tryUnlock}
                {...generateTestId(Platform, RESET_PASSWORD_INPUT_ID)}
                keyboardAppearance={themeAppearance}
              />
              {warningIncorrectPassword && (
                <Text style={styles.warningMessageText}>
                  {warningIncorrectPassword}
                </Text>
              )}
            </View>
            <View style={styles.buttonWrapper}>
              <StyledButton
                containerStyle={styles.button}
                type={'confirm'}
                onPress={this.tryUnlock}
                testID={'submit-button'}
              >
                {strings('manual_backup_step_1.confirm')}
              </StyledButton>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    );
  }

  renderResetPassword() {
    const {
      isSelected,
      inputWidth,
      password,
      passwordStrength,
      confirmPassword,
      secureTextEntry,
      error,
      loading,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = passwordsMatch && isSelected;
    const previousScreen = this.props.route.params?.[PREVIOUS_SCREEN];
    const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

    return (
      <SafeAreaView style={styles.mainWrapper}>
        {loading ? (
          <View style={styles.loadingWrapper}>
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
            <ActivityIndicator size="large" color={colors.icon.default} />
            <Text style={styles.title}>
              {strings(
                previousScreen === ONBOARDING
                  ? 'create_wallet.title'
                  : 'secure_your_wallet.creating_password',
              )}
            </Text>
            <Text style={styles.subtitle}>
              {strings('create_wallet.subtitle')}
            </Text>
          </View>
        ) : (
          <View style={styles.wrapper} testID={'choose-password-screen'}>
            <KeyboardAwareScrollView
              style={styles.scrollableWrapper}
              contentContainerStyle={styles.keyboardScrollableWrapper}
              resetScrollToCoords={{ x: 0, y: 0 }}
            >
              <View testID={CREATE_PASSWORD_CONTAINER_ID}>
                <View style={styles.content}>
                  <Text style={styles.title}>
                    {strings('reset_password.title')}
                  </Text>
                  <View style={styles.text}>
                    <Text style={styles.subtitle}>
                      {strings('reset_password.subtitle')}
                    </Text>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.hintLabel}>
                    {strings('reset_password.password')}
                  </Text>
                  <Text
                    onPress={this.toggleShowHide}
                    style={[styles.hintLabel, styles.showPassword]}
                  >
                    {strings(
                      `reset_password.${secureTextEntry ? 'show' : 'hide'}`,
                    )}
                  </Text>
                  <TextInput
                    style={[styles.input, inputWidth]}
                    value={password}
                    onChangeText={this.onPasswordChange}
                    secureTextEntry={secureTextEntry}
                    placeholder=""
                    placeholderTextColor={colors.text.muted}
                    {...generateTestId(Platform, RESET_PASSWORD_INPUT_BOX_ID)}
                    onSubmitEditing={this.jumpToConfirmPassword}
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                  />
                  {(password !== '' && (
                    <Text style={styles.hintLabel}>
                      {strings('reset_password.password_strength')}
                      <Text style={styles[`strength_${passwordStrengthWord}`]}>
                        {' '}
                        {strings(
                          `reset_password.strength_${passwordStrengthWord}`,
                        )}
                      </Text>
                    </Text>
                  )) || <Text style={styles.hintLabel} />}
                </View>
                <View style={styles.field}>
                  <Text style={styles.hintLabel}>
                    {strings('reset_password.confirm_password')}
                  </Text>
                  <TextInput
                    ref={this.confirmPasswordInput}
                    style={[styles.input, inputWidth]}
                    value={confirmPassword}
                    onChangeText={this.setConfirmPassword}
                    secureTextEntry={secureTextEntry}
                    placeholder={''}
                    placeholderTextColor={colors.text.muted}
                    {...generateTestId(
                      Platform,
                      RESET_PASSWORD_CONFIRM_INPUT_BOX_ID,
                    )}
                    zasdfasfasf
                    onSubmitEditing={this.onPressCreate}
                    returnKeyType={'done'}
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                  />
                  <View style={styles.showMatchingPasswords}>
                    {passwordsMatch ? (
                      <Icon
                        name="check"
                        size={16}
                        color={colors.success.default}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.hintLabel}>
                    {strings('reset_password.must_be_at_least', { number: 8 })}
                  </Text>
                </View>
                <View>{this.renderSwitch()}</View>
                <View style={styles.checkboxContainer}>
                  <CheckBox
                    value={isSelected}
                    onValueChange={this.setSelection}
                    style={styles.checkbox}
                    tintColors={{
                      true: colors.primary.default,
                      false: colors.border.default,
                    }}
                    boxType="square"
                    testID={IOS_I_UNDERSTAND_BUTTON_ID}
                  />
                  <Text
                    style={styles.label}
                    onPress={this.setSelection}
                    {...generateTestId(
                      Platform,
                      RESET_PASSWORD_ANDROID_TERM_CHECKBOX_ID,
                    )}
                  >
                    {strings('reset_password.i_understand')}{' '}
                    <Text onPress={this.learnMore} style={styles.learnMore}>
                      {strings('reset_password.learn_more')}
                    </Text>
                  </Text>
                </View>

                {!!error && <Text style={styles.errorMsg}>{error}</Text>}
              </View>

              <View style={styles.ctaWrapper}>
                <StyledButton
                  type={'blue'}
                  onPress={this.onPressCreate}
                  testID={'submit-button'}
                  disabled={!canSubmit}
                >
                  {strings('reset_password.reset_button')}
                </StyledButton>
              </View>
            </KeyboardAwareScrollView>
          </View>
        )}
      </SafeAreaView>
    );
  }

  render() {
    const { view, ready } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!ready) return this.renderLoader();
    return (
      <SafeAreaView style={styles.mainWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollviewWrapper}
          style={styles.mainWrapper}
          testID={'account-backup-step-4-screen'}
        >
          {view === RESET_PASSWORD
            ? this.renderResetPassword()
            : this.renderConfirmPassword()}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

ResetPassword.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  selectedAddress: selectSelectedAddress(state),
});

const mapDispatchToProps = (dispatch) => ({
  passwordSet: () => dispatch(passwordSet()),
  passwordUnset: () => dispatch(passwordUnset()),
  setLockTime: (time) => dispatch(setLockTime(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ResetPassword);
