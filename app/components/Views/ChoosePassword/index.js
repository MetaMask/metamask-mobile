import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Alert,
  Text,
  View,
  TextInput,
  SafeAreaView,
  StyleSheet,
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
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import Icon from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import OnboardingProgress from '../../UI/OnboardingProgress';
import zxcvbn from 'zxcvbn';
import Logger from '../../../util/Logger';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  EXISTING_USER,
  TRUE,
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';

import { CHOOSE_PASSWORD_STEPS } from '../../../constants/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from 'react-native-animated-fox';

import {
  CREATE_PASSWORD_CONTAINER_ID,
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_I_UNDERSTAND_BUTTON_ID,
} from '../../../constants/test-ids';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { scale } from 'react-native-size-matters';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
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
    content: {
      textAlign: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: Device.isAndroid() ? 20 : 25,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
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
      marginVertical: 5,
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
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    hintLabel: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      ...fontStyles.normal,
    },
    passwordStrengthLabel: {
      height: 20,
      marginTop: 10,
      fontSize: scale(10),
      color: colors.text.default,
      ...fontStyles.normal,
    },
    showPassword: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_weak: {
      color: colors.error.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_good: {
      color: colors.primary.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_strong: {
      color: colors.success.default,
    },
    showMatchingPasswords: {
      position: 'absolute',
      top: 52,
      right: 17,
      alignSelf: 'flex-end',
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set their password for the first time
 */
class ChoosePassword extends PureComponent {
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
     * The action to update the password set flag
     * in the redux store to false
     */
    passwordUnset: PropTypes.func,
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
     * Action to reset the flag seedphraseBackedUp in redux
     */
    seedphraseNotBackedUp: PropTypes.func,
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
  };

  mounted = true;

  confirmPasswordInput = React.createRef();
  // Flag to know if password in keyring was set or not
  keyringControllerPasswordSet = false;

  updateNavBar = () => {
    const { route, navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(getOnboardingNavbarOptions(route, {}, colors));
  };

  termsOfUse = async () => {
    if (this.props.navigation) {
      await navigateTermsOfUse(this.props.navigation.navigate);
    }
  };

  async componentDidMount() {
    const authData = await Authentication.getType();
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
      });
    } else if (authData.availableBiometryType) {
      this.setState({
        biometryType: authData.availableBiometryType,
        biometryChoice: !(previouslyDisabled && previouslyDisabled === TRUE),
      });
    }
    this.updateNavBar();
    setTimeout(() => {
      this.setState({
        inputWidth: { width: '100%' },
      });
    }, 100);
    this.termsOfUse();
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
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED);
    });

    try {
      this.setState({ loading: true });
      const previous_screen = this.props.route.params?.[PREVIOUS_SCREEN];

      const authType = await Authentication.componentAuthenticationType(
        this.state.biometryChoice,
        this.state.rememberMe,
      );

      if (previous_screen === ONBOARDING) {
        try {
          await Authentication.newWalletAndKeychain(password, authType);
        } catch (error) {
          if (Device.isIos) await this.handleRejectedOsBiometricPrompt();
        }
        this.keyringControllerPasswordSet = true;
        this.props.seedphraseNotBackedUp();
      } else {
        await this.recreateVault(password, authType);
      }

      this.props.passwordSet();
      this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
      this.setState({ loading: false });
      this.props.navigation.replace('AccountBackupStep1');
      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_CREATED, {
          biometrics_enabled: Boolean(this.state.biometryType),
        });
        AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
          wallet_setup_type: 'new',
          new_wallet: true,
        });
      });
    } catch (error) {
      try {
        await this.recreateVault('');
      } catch (e) {
        Logger.error(e);
      }
      // Set state in app as it was with no password
      await AsyncStorage.setItem(EXISTING_USER, TRUE);
      await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
      this.props.passwordUnset();
      this.props.setLockTime(-1);
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
      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'new',
          error_type: error.toString(),
        });
      });
    }
  };

  /**
   * This function handles the case when the user rejects the OS prompt for allowing use of biometrics.
   * If this occurs we will create the wallet automatically with password as the login method
   */
  handleRejectedOsBiometricPrompt = async () => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    try {
      await Authentication.newWalletAndKeychain(
        this.state.password,
        newAuthData,
      );
    } catch (err) {
      throw Error(strings('choose_password.disable_biometric_error'));
    }
    this.setState({
      biometryType: newAuthData.availableBiometryType,
      biometryChoice: false,
    });
  };

  /**
   * Recreates a vault
   *
   * @param password - Password to recreate and set the vault with
   */
  recreateVault = async (password, authType) => {
    const { KeyringController, PreferencesController } = Engine.context;
    const seedPhrase = await this.getSeedPhrase();
    let importedAccounts = [];
    try {
      const keychainPassword = this.keyringControllerPasswordSet
        ? this.state.password
        : '';
      // Get imported accounts
      const simpleKeyrings = KeyringController.state.keyrings.filter(
        (keyring) => keyring.type === 'Simple Key Pair',
      );
      for (let i = 0; i < simpleKeyrings.length; i++) {
        const simpleKeyring = simpleKeyrings[i];
        const simpleKeyringAccounts = await Promise.all(
          simpleKeyring.accounts.map((account) =>
            KeyringController.exportAccount(keychainPassword, account),
          ),
        );
        importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
      }
    } catch (e) {
      Logger.error(
        e,
        'error while trying to get imported accounts on recreate vault',
      );
    }

    // Recreate keyring with password given to this method
    await Authentication.newWalletAndRestore(
      password,
      authType,
      seedPhrase,
      true,
    );
    // Keyring is set with empty password or not
    this.keyringControllerPasswordSet = password !== '';

    // Get props to restore vault
    const hdKeyring = KeyringController.state.keyrings[0];
    const existingAccountCount = hdKeyring.accounts.length;
    const selectedAddress = this.props.selectedAddress;
    let preferencesControllerState = PreferencesController.state;

    // Create previous accounts again
    for (let i = 0; i < existingAccountCount - 1; i++) {
      await KeyringController.addNewAccount();
    }

    try {
      // Import imported accounts again
      for (let i = 0; i < importedAccounts.length; i++) {
        await KeyringController.importAccountWithStrategy('privateKey', [
          importedAccounts[i],
        ]);
      }
    } catch (e) {
      Logger.error(
        e,
        'error while trying to import accounts on recreate vault',
      );
    }

    // Reset preferencesControllerState
    preferencesControllerState = PreferencesController.state;

    // Set preferencesControllerState again
    await PreferencesController.update(preferencesControllerState);
    // Reselect previous selected account if still available
    if (hdKeyring.accounts.includes(selectedAddress)) {
      PreferencesController.setSelectedAddress(selectedAddress);
    } else {
      PreferencesController.setSelectedAddress(hdKeyring.accounts[0]);
    }
  };

  /**
   * Returns current vault seed phrase
   * It does it using an empty password or a password set by the user
   * depending on the state the app is currently in
   */
  getSeedPhrase = async () => {
    const { KeyringController } = Engine.context;
    const { password } = this.state;
    const keychainPassword = this.keyringControllerPasswordSet ? password : '';
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

  setConfirmPassword = (val) => this.setState({ confirmPassword: val });

  render() {
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
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = passwordsMatch && isSelected;
    const previousScreen = this.props.route.params?.[PREVIOUS_SCREEN];
    const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

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
            <ActivityIndicator size="large" color={colors.text.default} />
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
            <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} />
            <KeyboardAwareScrollView
              style={styles.scrollableWrapper}
              contentContainerStyle={styles.keyboardScrollableWrapper}
              resetScrollToCoords={{ x: 0, y: 0 }}
            >
              <View testID={CREATE_PASSWORD_CONTAINER_ID}>
                <View style={styles.content}>
                  <Text style={styles.title}>
                    {strings('choose_password.title')}
                  </Text>
                  <View style={styles.text}>
                    <Text style={styles.subtitle}>
                      {strings('choose_password.subtitle')}
                    </Text>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.hintLabel}>
                    {strings('choose_password.password')}
                  </Text>
                  <Text
                    onPress={this.toggleShowHide}
                    style={[styles.hintLabel, styles.showPassword]}
                  >
                    {strings(
                      `choose_password.${secureTextEntry ? 'show' : 'hide'}`,
                    )}
                  </Text>
                  <TextInput
                    style={[styles.input, inputWidth]}
                    value={password}
                    onChangeText={this.onPasswordChange}
                    secureTextEntry={secureTextEntry}
                    placeholder=""
                    placeholderTextColor={colors.text.muted}
                    {...generateTestId(Platform, CREATE_PASSWORD_INPUT_BOX_ID)}
                    onSubmitEditing={this.jumpToConfirmPassword}
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                  />
                  {(password !== '' && (
                    <Text style={styles.passwordStrengthLabel}>
                      {strings('choose_password.password_strength')}
                      <Text style={styles[`strength_${passwordStrengthWord}`]}>
                        {' '}
                        {strings(
                          `choose_password.strength_${passwordStrengthWord}`,
                        )}
                      </Text>
                    </Text>
                  )) || <Text style={styles.passwordStrengthLabel} />}
                </View>
                <View style={styles.field}>
                  <Text style={styles.hintLabel}>
                    {strings('choose_password.confirm_password')}
                  </Text>
                  <TextInput
                    ref={this.confirmPasswordInput}
                    style={[styles.input, inputWidth]}
                    value={confirmPassword}
                    onChangeText={this.setConfirmPassword}
                    secureTextEntry={secureTextEntry}
                    placeholder={''}
                    placeholderTextColor={colors.text.muted}
                    testID={CONFIRM_PASSWORD_INPUT_BOX_ID}
                    accessibilityLabel={CONFIRM_PASSWORD_INPUT_BOX_ID}
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
                  <Text style={styles.passwordStrengthLabel}>
                    {strings('choose_password.must_be_at_least', {
                      number: MIN_PASSWORD_LENGTH,
                    })}
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
                    accessibilityLabel={IOS_I_UNDERSTAND_BUTTON_ID}
                  />
                  <Text
                    style={styles.label}
                    onPress={this.setSelection}
                    testID={ANDROID_I_UNDERSTAND_BUTTON_ID}
                  >
                    {strings('choose_password.i_understand')}{' '}
                    <Text onPress={this.learnMore} style={styles.learnMore}>
                      {strings('choose_password.learn_more')}
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
                  {strings('choose_password.create_button')}
                </StyledButton>
              </View>
            </KeyboardAwareScrollView>
          </View>
        )}
      </SafeAreaView>
    );
  }
}

ChoosePassword.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController?.selectedAddress,
});

const mapDispatchToProps = (dispatch) => ({
  passwordSet: () => dispatch(passwordSet()),
  passwordUnset: () => dispatch(passwordUnset()),
  setLockTime: (time) => dispatch(setLockTime(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChoosePassword);
