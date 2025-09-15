import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  View,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  InteractionManager,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { connect } from 'react-redux';
import { passwordSet, seedphraseNotBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import { fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import AppConstants from '../../../core/AppConstants';
import zxcvbn from 'zxcvbn';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  TRUE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  BIOMETRY_CHOICE,
} from '../../../constants/storage';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
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
import { recreateVaultsWithNewPassword } from '../../../core/Vault';
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
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import { MetaMetricsEvents, MetaMetrics } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Checkbox from '../../../component-library/components/Checkbox';
import fox from '../../../animations/Searching_Fox.json';
import LottieView from 'lottie-react-native';
import {
  selectSeedlessOnboardingLoginFlow,
  selectSeedlessOnboardingAuthConnection,
} from '../../../selectors/seedlessOnboardingController';
import {
  AuthConnection,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';

// Constants
const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const RESET_PASSWORD = 'reset_password';
const CONFIRM_PASSWORD = 'confirm_password';

// Common button props
const getCommonButtonProps = () => ({
  variant: ButtonVariants.Primary,
  size: ButtonSize.Lg,
  width: ButtonWidthTypes.Full,
});

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
      flexDirection: 'column',
    },
    scrollableWrapper: {
      flex: 1,
      paddingHorizontal: 16,
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
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      columnGap: 8,
      marginTop: 8,
      marginBottom: 16,
    },
    checkbox: {
      alignItems: 'flex-start',
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
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 1,
      flexWrap: 'wrap',
      width: '90%',
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
      width: '100%',
      flexDirection: 'column',
      rowGap: 18,
      marginTop: 'auto',
      marginBottom: Platform.select({
        ios: 16,
        android: 24,
        default: 16,
      }),
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
      flexDirection: 'column',
      rowGap: 16,
      flexGrow: 1,
      paddingTop: 16,
    },
    passwordLabel: {
      marginBottom: -4,
    },
    warningButtonsWrapper: {
      flexDirection: 'row',
      gap: 16,
      width: '100%',
      marginTop: 16,
    },
    warningButton: {
      flex: 1,
    },
  });

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
    /**
     * A boolean representing if the user is in the seedless onboarding login flow
     */
    isSeedlessOnboardingLoginFlow: PropTypes.bool,
    /**
     * A string representing the auth connection type i.e. Apple or Google
     */
    authConnection: PropTypes.string,
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

  // Helper method to get theme colors
  getThemeColors = () => this.context.colors || mockTheme.colors;

  // Helper method to get theme appearance
  getThemeAppearance = () => this.context.themeAppearance || 'light';

  // Helper method to get styles
  getStyles = () => createStyles(this.getThemeColors());

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.getThemeColors();
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('password_reset.change_password'),
        navigation,
        false,
        colors,
      ),
    );
  };

  unlockWithBiometrics = async () => {
    // Try to use biometrics to unlock
    const biometryChoice = await StorageWrapper.getItem(BIOMETRY_CHOICE);
    if (biometryChoice) {
      const credentials = await Authentication.getPassword();
      if (credentials) {
        this.tryUnlockWithPassword(credentials.password);
      }
    }
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
    else if (authData.availableBiometryType) {
      const biometryChoiceState = !(
        previouslyDisabled && previouslyDisabled === TRUE
      );
      this.setState({
        biometryType: authData.availableBiometryType,
        biometryChoice: biometryChoiceState,
      });
      this.unlockWithBiometrics();
    }

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

  handleSeedlessChangePasswordError = () => {
    // show seedless password error modal and redirect to security settings screen
    this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings(
          'reset_password.seedless_change_password_error_modal_title',
        ),
        description: strings(
          'reset_password.seedless_change_password_error_modal_content',
        ),
        primaryButtonLabel: strings(
          'reset_password.seedless_change_password_error_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          this.props.navigation.replace(Routes.SETTINGS.SECURITY_SETTINGS);
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  };

  handleSeedlessPasswordOutdated = () => {
    // show seedless password outdated modal and force user to lock app
    this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('login.seedless_password_outdated_modal_title'),
        description: strings('login.seedless_password_outdated_modal_content'),
        primaryButtonLabel: strings(
          'login.seedless_password_outdated_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          await Authentication.lockApp({ locked: true }).catch((error) => {
            Logger.error(error);
            this.handleSeedlessChangePasswordError();
          });
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  };

  onPressCreate = async () => {
    const { loading, password, confirmPassword } = this.state;

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

      const isGlobalPasswordOutdated =
        await Authentication.checkIsSeedlessPasswordOutdated();
      if (isGlobalPasswordOutdated) {
        this.handleSeedlessPasswordOutdated();
        return;
      }

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

      // Track password changed event
      const { biometryChoice, passwordStrength } = this.state;
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PASSWORD_CHANGED,
      ).addProperties({
        biometry_type: this.state.biometryType,
        biometrics_enabled: Boolean(biometryChoice),
      });
      MetaMetrics.getInstance().trackEvent(eventBuilder.build());

      this.setState({ loading: false });
      this.props.navigation.navigate('SecuritySettings');
      InteractionManager.runAfterInteractions(() => {
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
      } else if (error.message.includes('SeedlessOnboardingController')) {
        // handle Seedless Change Password error
        // prompt sheet
        Logger.error(error);
        const errorMessage = error.message;
        if (
          errorMessage ===
          SeedlessOnboardingControllerErrorMessage.OutdatedPassword
        ) {
          this.handleSeedlessPasswordOutdated();
        } else {
          this.handleSeedlessChangePasswordError();
        }
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
    await recreateVaultsWithNewPassword(
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

      this.updateBiometryChoice(true);
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

    this.setState((prevState) => ({
      password: val,
      passwordStrength: passInfo.score,
      confirmPassword: val === '' ? '' : prevState.confirmPassword,
    }));
  };

  learnMore = () => {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: this.props.isSeedlessOnboardingLoginFlow
          ? 'https://support.metamask.io/configure/wallet/passwords-and-metamask/'
          : 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  };

  renderLoader = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  setConfirmPassword = (val) => this.setState({ confirmPassword: val });

  // Helper method to render password strength text
  renderPasswordStrengthText = (password, passwordStrengthWord, styles) => {
    if (!password) return null;

    if (password.length < MIN_PASSWORD_LENGTH) {
      return (
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('reset_password.must_be_at_least', {
            number: MIN_PASSWORD_LENGTH,
          })}
        </Text>
      );
    }

    return (
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        testID={ChoosePasswordSelectorsIDs.PASSWORD_STRENGTH_ID}
      >
        {strings('reset_password.password_strength')}
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles[`strength_${passwordStrengthWord}`]}
        >
          {' '}
          {strings(`reset_password.strength_${passwordStrengthWord}`)}
        </Text>
      </Text>
    );
  };

  // Helper method to render error text
  renderErrorText = () => {
    if (!this.isError()) return null;

    return (
      <Text variant={TextVariant.BodySM} color={TextColor.Error}>
        {strings('choose_password.password_error')}
      </Text>
    );
  };

  // Helper method to render warning text
  renderWarningText = (warningText, styles) => {
    if (!warningText) return null;

    return (
      <Text color={TextColor.Error} style={styles.warningMessageText}>
        {warningText}
      </Text>
    );
  };

  // Helper method to render loading state
  renderLoadingState = (previousScreen, colors, styles) => (
    <View style={styles.loadingWrapper}>
      <View style={styles.foxWrapper}>
        <LottieView
          style={styles.image}
          autoPlay
          loop
          source={fox}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator size="large" color={colors.icon.default} />
      <Text variant={TextVariant.HeadingLG} style={styles.title}>
        {strings('reset_password.changing_password')}
      </Text>
      <Text variant={TextVariant.BodyLGMedium} style={styles.subtitle}>
        {strings('reset_password.changing_password_subtitle')}
      </Text>
    </View>
  );

  renderConfirmPassword() {
    const { warningIncorrectPassword } = this.state;
    const colors = this.getThemeColors();
    const themeAppearance = this.getThemeAppearance();
    const styles = this.getStyles();

    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <KeyboardAwareScrollView
          style={[baseStyles.flexGrow, styles.root]}
          enableOnAndroid
        >
          <View style={styles.confirmPasswordWrapper}>
            <View style={[styles.content, styles.passwordRequiredContent]}>
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
                autoComplete="current-password"
              />
              {this.renderWarningText(warningIncorrectPassword, styles)}
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                {...getCommonButtonProps()}
                label={strings('manual_backup_step_1.confirm')}
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
    this.setState((prevState) => ({
      showPasswordIndex: prevState.showPasswordIndex.includes(index)
        ? prevState.showPasswordIndex.filter((i) => i !== index)
        : [...prevState.showPasswordIndex, index],
    }));
  };

  learnMoreSocialLogin = () => {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/configure/wallet/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  };

  handleConfirmAction = () => {
    NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('reset_password.warning_password_change_title'),
        description: this.props.isSeedlessOnboardingLoginFlow ? (
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('reset_password.warning_password_change_description')}{' '}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Primary}
              onPress={this.learnMoreSocialLogin}
            >
              {strings('reset_password.learn_more')}
            </Text>
          </Text>
        ) : (
          `${strings('reset_password.warning_password_change_description')}.`
        ),
        type: 'error',
        icon: IconName.Danger,
        secondaryButtonLabel: strings(
          'reset_password.warning_password_cancel_button',
        ),
        primaryButtonLabel: strings(
          'reset_password.warning_password_change_button',
        ),
        onPrimaryButtonPress: this.onPressCreate,
        closeOnPrimaryButtonPress: true,
      },
    });
  };

  isError = () => {
    const { password, confirmPassword } = this.state;
    return (
      password !== '' && confirmPassword !== '' && password !== confirmPassword
    );
  };

  renderResetPassword() {
    const { isSelected, password, passwordStrength, confirmPassword, loading } =
      this.state;
    const colors = this.getThemeColors();
    const themeAppearance = this.getThemeAppearance();
    const styles = this.getStyles();
    const passwordsMatch = password !== '' && password === confirmPassword;
    const previousScreen = this.props.route.params?.[PREVIOUS_SCREEN];
    const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

    const canSubmit =
      passwordsMatch && isSelected && password.length >= MIN_PASSWORD_LENGTH;

    const isSrp =
      this.props.authConnection !== AuthConnection.Apple &&
      this.props.authConnection !== AuthConnection.Google;

    return (
      <SafeAreaView style={styles.mainWrapper}>
        {loading ? (
          this.renderLoadingState(previousScreen, colors, styles)
        ) : (
          <KeyboardAwareScrollView
            style={styles.scrollableWrapper}
            contentContainerStyle={styles.keyboardScrollableWrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View style={styles.wrapper}>
              <View
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
                style={styles.changePasswordContainer}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {isSrp
                    ? strings('choose_password.description')
                    : strings('choose_password.description_social_login')}
                </Text>

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
                    autoComplete="new-password"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(0)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => this.toggleShowPassword(0)}
                        testID={
                          ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID
                        }
                      />
                    }
                  />
                  {this.renderPasswordStrengthText(
                    password,
                    passwordStrengthWord,
                    styles,
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
                    returnKeyType={'done'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(1)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => this.toggleShowPassword(1)}
                        testID={
                          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID
                        }
                      />
                    }
                  />
                  {this.renderErrorText()}
                </View>

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    onPress={this.setSelection}
                    isChecked={isSelected}
                    testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                    }
                    style={styles.checkbox}
                  />
                  <Button
                    variant={ButtonVariants.Link}
                    onPress={this.setSelection}
                    style={styles.learnMoreTextContainer}
                    testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                    label={
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Default}
                      >
                        {isSrp
                          ? strings('reset_password.i_understand')
                          : strings('reset_password.checkbox_forgot_password')}
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Primary}
                          onPress={this.learnMore}
                          testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
                        >
                          {' ' + strings('reset_password.learn_more')}
                        </Text>
                      </Text>
                    }
                  />
                </View>

                <View style={styles.ctaWrapper}>
                  {this.renderSwitch()}
                  <Button
                    {...getCommonButtonProps()}
                    label={strings('reset_password.confirm_btn')}
                    onPress={() => {
                      if (this.props.isSeedlessOnboardingLoginFlow) {
                        this.handleConfirmAction();
                      } else {
                        this.onPressCreate();
                      }
                    }}
                    testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                    disabled={!canSubmit}
                    isDisabled={!canSubmit}
                  />
                </View>
              </View>
            </View>
          </KeyboardAwareScrollView>
        )}
      </SafeAreaView>
    );
  }

  render() {
    const { view, ready } = this.state;
    const styles = this.getStyles();

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
  isSeedlessOnboardingLoginFlow: selectSeedlessOnboardingLoginFlow(state),
  authConnection: selectSeedlessOnboardingAuthConnection(state),
});

const mapDispatchToProps = (dispatch) => ({
  passwordSet: () => dispatch(passwordSet()),
  setLockTime: (time) => dispatch(setLockTime(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ResetPassword);
