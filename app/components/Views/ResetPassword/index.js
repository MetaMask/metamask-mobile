import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  View,
  TextInput,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Image,
  InteractionManager,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { connect } from 'react-redux';
import { passwordSet, seedphraseNotBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import { fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
// import Icon from 'react-native-vector-icons/FontAwesome';
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
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { recreateVaultWithNewPassword } from '../../../core/Vault';
import Logger from '../../../util/Logger';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Label from '../../../component-library/components/Form/Label';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ErrorSheet from '../ErrorSheet';

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
      marginTop: 10,
      marginBottom: 10,
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
      marginBottom: 4,
    },
    wrapper: {
      flex: 1,
    },
    scrollableWrapper: {
      flex: 1,
      padding: 16,
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
      flex: 1,
      height: '100%',
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      marginTop: 20,
      marginBottom: 20,
      justifyContent: 'center',
      textAlign: 'center',
      width: '100%',
      ...fontStyles.normal,
    },
    subtitle: {
      lineHeight: 23,
      textAlign: 'center',
      fontWeight: '400',
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
      textDecorationLine: 'underline',
      textDecorationColor: colors.primary.default,
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
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
      marginTop: 14,
      textAlign: 'left',
    },
    showPassword: {
      marginTop: 14,
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
      padding: 16,
      flexDirection: 'column',
      rowGap: 32,
      justifyContent: 'space-between',
      height: '100%',
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    warningMessageText: {
      paddingVertical: 10,
    },
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
      height: '100%',
    },
    root: {
      flex: 1,
      height: '100%',
    },
    changePasswordContainer: {
      width: '100%',
      flexDirection: 'column',
      gap: 16,
    },
    passwordLabel: {
      marginBottom: -8,
    },
    warningButtonsWrapper: {
      flexDirection: 'row',
      gap: 16,
      width: '100%',
    },
    warningButton: {
      flex: 1,
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
    showPasswordIndex: [0, 1],
    showPasswordChangeWarning: false,
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
    const previouslyDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await StorageWrapper.getItem(
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

  componentDidUpdate(_, prevState) {
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

    // if (!canSubmit) return;
    if (loading) return;
    if (!passwordRequirementsMet(password)) {
      Alert.alert('Error', strings('choose_password.password_length_error'));
      return;
    } else if (password !== confirmPassword) {
      Alert.alert('Error', strings('choose_password.password_dont_match'));
      return;
    }
    try {
      this.setState({ loading: true, showPasswordChangeWarning: false });

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
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
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
        <KeyboardAwareScrollView
          style={[baseStyles.flexGrow, styles.root]}
          enableOnAndroid
        >
          <View style={styles.confirmPasswordWrapper}>
            <View style={[styles.content, styles.passwordRequiredContent]}>
              {/* <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
                {strings('manual_backup_step_1.confirm_password')}
              </Text> */}

              <Label
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
                style={styles.confirm_label}
              >
                {strings('manual_backup_step_1.enter_current_password')}
              </Label>
              <TextField
                size={TextFieldSize.Lg}
                placeholder={'Password'}
                placeholderTextColor={colors.text.muted}
                onChangeText={this.onPasswordChange}
                secureTextEntry
                value={this.state.password}
                onSubmitEditing={this.tryUnlock}
                testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                keyboardAppearance={themeAppearance}
              />
              {warningIncorrectPassword && (
                <Text color={TextColor.Error} style={styles.warningMessageText}>
                  {warningIncorrectPassword}
                </Text>
              )}
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                label={strings('manual_backup_step_1.confirm')}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={this.tryUnlock}
                testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                isDisabled={!this.state.password}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    );
  }

  toggleShowPassword = (index) => {
    const newShowPasswordIndex = this.state.showPasswordIndex.includes(index)
      ? this.state.showPasswordIndex.filter((i) => i !== index)
      : [...this.state.showPasswordIndex, index];
    this.setState({ showPasswordIndex: newShowPasswordIndex });
  };

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

    const isBtnDisabled =
      password === '' ||
      confirmPassword === '' ||
      password !== confirmPassword ||
      password.length < 8;

    return (
      <SafeAreaView style={styles.mainWrapper}>
        {loading ? (
          <View style={styles.loadingWrapper}>
            <View style={styles.foxWrapper}>
              <Image
                source={require('../../../images/branding/fox.png')}
                style={styles.image}
                resizeMethod={'auto'}
              />
            </View>
            <ActivityIndicator size="large" color={colors.icon.default} />
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {strings(
                previousScreen === ONBOARDING
                  ? 'create_wallet.title'
                  : 'secure_your_wallet.creating_password',
              )}
            </Text>
            <Text variant={TextVariant.BodyLGMedium} style={styles.subtitle}>
              {strings('create_wallet.subtitle')}
            </Text>
          </View>
        ) : (
          <View style={styles.wrapper}>
            <KeyboardAwareScrollView
              style={styles.scrollableWrapper}
              contentContainerStyle={styles.keyboardScrollableWrapper}
              resetScrollToCoords={{ x: 0, y: 0 }}
            >
              <View
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
                style={styles.changePasswordContainer}
              >
                {/* <View style={styles.content}>
                  <Text variant={TextVariant.HeadingLG} style={styles.title}>
                    {strings('reset_password.title')}
                  </Text>
                  <View style={styles.text}>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      style={styles.subtitle}
                    >
                      {strings('reset_password.subtitle')}
                    </Text>
                  </View>
                </View> */}
                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.passwordLabel}
                  >
                    {strings('reset_password.password')}
                  </Label>
                  <TextField
                    size={TextFieldSize.Lg}
                    value={password}
                    onChangeText={this.onPasswordChange}
                    secureTextEntry={this.state.showPasswordIndex.includes(0)}
                    placeholder={strings(
                      'reset_password.new_password_placeholder',
                    )}
                    placeholderTextColor={colors.text.muted}
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                    onSubmitEditing={this.jumpToConfirmPassword}
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(0)
                            ? IconName.EyeSolid
                            : IconName.EyeSlashSolid
                        }
                        size={IconSize.Lg}
                        color={colors.icon.default}
                        onPress={() => this.toggleShowPassword(0)}
                      />
                    }
                  />
                  {password !== '' && (
                    <Text variant={TextVariant.BodySM}>
                      {strings('reset_password.password_strength')}
                      <Text
                        variant={TextVariant.BodySM}
                        style={styles[`strength_${passwordStrengthWord}`]}
                      >
                        {' '}
                        {strings(
                          `reset_password.strength_${passwordStrengthWord}`,
                        )}
                      </Text>
                    </Text>
                  )}
                </View>
                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.passwordLabel}
                  >
                    {strings('reset_password.confirm_password')}
                  </Label>
                  <TextField
                    size={TextFieldSize.Lg}
                    ref={this.confirmPasswordInput}
                    value={confirmPassword}
                    onChangeText={this.setConfirmPassword}
                    secureTextEntry={this.state.showPasswordIndex.includes(1)}
                    placeholder={strings(
                      'reset_password.confirm_password_placeholder',
                    )}
                    placeholderTextColor={colors.text.muted}
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    onSubmitEditing={this.onPressCreate}
                    returnKeyType={'done'}
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(1)
                            ? IconName.EyeSolid
                            : IconName.EyeSlashSolid
                        }
                        size={IconSize.Lg}
                        color={colors.icon.default}
                        onPress={() => this.toggleShowPassword(1)}
                      />
                    }
                  />
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('reset_password.must_be_at_least', { number: 8 })}
                  </Text>
                </View>

                {/* <View>{this.renderSwitch()}</View> */}

                {/* <View style={styles.checkboxContainer}>
                  <CheckBox
                    value={isSelected}
                    onValueChange={this.setSelection}
                    style={styles.checkbox}
                    tintColors={{
                      true: colors.primary.default,
                      false: colors.border.default,
                    }}
                    boxType="square"
                    testID={
                      ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID
                    }
                  />
                  <Text
                    variant={TextVariant.BodyMD}
                    style={styles.label}
                    onPress={this.setSelection}
                    testID={
                      ChoosePasswordSelectorsIDs.ANDROID_I_UNDERSTAND_BUTTON_ID
                    }
                  >
                    {strings('reset_password.i_understand')}{' '}
                    <Text
                      color={TextColor.Info}
                      onPress={this.learnMore}
                      style={styles.learnMore}
                    >
                      {strings('reset_password.learn_more')}
                    </Text>
                  </Text>
                </View> */}

                {!!error && <Text color={TextColor.Error}>{error}</Text>}
              </View>

              <View style={styles.ctaWrapper}>
                <Button
                  label={strings('reset_password.confirm_btn')}
                  variant={ButtonVariants.Primary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  onPress={() =>
                    this.setState({ showPasswordChangeWarning: true })
                  }
                  testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                  disabled={isBtnDisabled}
                  isDisabled={isBtnDisabled}
                />
              </View>
            </KeyboardAwareScrollView>
          </View>
        )}
        <ErrorSheet
          open={this.state.showPasswordChangeWarning}
          onClose={() => this.setState({ showPasswordChangeWarning: false })}
          errorTitle={strings('reset_password.warning_password_change_title')}
          errorDescription={strings(
            'reset_password.warning_password_change_description',
          )}
          buttonLabel={
            <View style={styles.warningButtonsWrapper}>
              <Button
                label={strings('reset_password.warning_password_cancel_button')}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={styles.warningButton}
                onPress={() =>
                  this.setState({ showPasswordChangeWarning: false })
                }
              />
              <Button
                label={strings('reset_password.warning_password_change_button')}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={styles.warningButton}
                onPress={this.onPressCreate}
              />
            </View>
          }
        />
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
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
});

const mapDispatchToProps = (dispatch) => ({
  passwordSet: () => dispatch(passwordSet()),
  setLockTime: (time) => dispatch(setLockTime(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ResetPassword);
