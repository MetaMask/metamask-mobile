import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  SafeAreaView,
  StyleSheet,
  InteractionManager,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { connect } from 'react-redux';
import { logIn, passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import AppConstants from '../../../core/AppConstants';
import setOnboardingWizardStep from '../../../actions/wizard';
import TermsAndConditions from '../TermsAndConditions';
import zxcvbn from 'zxcvbn';
import Icon from 'react-native-vector-icons/FontAwesome';
import Device from '../../../util/device';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
  parseSeedPhrase,
  parseVaultValue,
} from '../../../util/validators';
import { OutlinedTextField } from 'react-native-material-textfield';
import {
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  NEXT_MAKER_REMINDER,
  ONBOARDING_WIZARD,
  EXISTING_USER,
  TRUE,
} from '../../../constants/storage';
import Logger from '../../../util/Logger';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import AnalyticsV2 from '../../../util/analyticsV2';
import DefaultPreference from 'react-native-default-preference';
import Clipboard from '@react-native-clipboard/clipboard';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  CREATE_PASSWORD_INPUT_BOX_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IMPORT_PASSWORD_CONTAINER_ID,
  SECRET_RECOVERY_PHRASE_INPUT_BOX_ID,
} from '../../../constants/test-ids';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';

const MINIMUM_SUPPORTED_CLIPBOARD_VERSION = 9;

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
    title: {
      fontSize: Device.isAndroid() ? 20 : 25,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    field: {
      marginVertical: 5,
      position: 'relative',
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    fieldCol: {
      width: '70%',
    },
    fieldColRight: {
      flexDirection: 'row-reverse',
      width: '30%',
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
    errorMsg: {
      color: colors.error.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    seedPhrase: {
      marginBottom: 10,
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      fontSize: 20,
      borderRadius: 10,
      minHeight: 110,
      height: 'auto',
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    padding: {
      paddingRight: 46,
    },
    biometrics: {
      alignItems: 'flex-start',
      marginTop: 10,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      marginTop: 10,
      flex: 0,
    },
    termsAndConditions: {
      paddingVertical: 10,
    },
    passwordStrengthLabel: {
      height: 20,
      fontSize: 15,
      color: colors.text.default,
      ...fontStyles.normal,
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
    qrCode: {
      marginRight: 10,
      borderWidth: 1,
      borderRadius: 6,
      borderColor: colors.text.muted,
      paddingVertical: 4,
      paddingHorizontal: 6,
      marginTop: -50,
      marginBottom: 30,
      alignSelf: 'flex-end',
    },
    inputFocused: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set restore their account
 * using a seed phrase
 */
class ImportFromSeed extends PureComponent {
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
     * The action to set the locktime
     * in the redux store
     */
    setLockTime: PropTypes.func,
    /**
     * The action to update the seedphrase backed up flag
     * in the redux store
     */
    seedphraseBackedUp: PropTypes.func,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    logIn: PropTypes.func,
    route: PropTypes.object,
  };

  state = {
    password: '',
    confirmPassword: '',
    seed: '',
    biometryType: null,
    rememberMe: false,
    secureTextEntry: true,
    biometryChoice: false,
    loading: false,
    error: null,
    seedphraseInputFocused: false,
    inputWidth: { width: '99%' },
    hideSeedPhraseInput: true,
  };

  passwordInput = React.createRef();
  confirmPasswordInput = React.createRef();

  updateNavBar = () => {
    const { route, navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(getOnboardingNavbarOptions(route, {}, colors));
  };

  async componentDidMount() {
    this.updateNavBar();
    const biometryType = await SecureKeychain.getSupportedBiometryType();
    if (biometryType) {
      let enabled = true;
      const previouslyDisabled = await AsyncStorage.removeItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      if (previouslyDisabled && previouslyDisabled === TRUE) {
        enabled = false;
      }
      this.setState({
        biometryType: Device.isAndroid() ? 'biometrics' : biometryType,
        biometryChoice: enabled,
      });
    }
    // Workaround https://github.com/facebook/react-native/issues/9958
    setTimeout(() => {
      this.setState({ inputWidth: { width: '100%' } });
    }, 100);
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  onPressImport = async () => {
    const { loading, seed, password, confirmPassword } = this.state;

    const vaultSeed = await parseVaultValue(password, seed);
    const parsedSeed = parseSeedPhrase(vaultSeed || seed);
    //Set the seed state with a valid parsed seed phrase (handle vault scenario)
    this.setState({ seed: parsedSeed });

    if (loading) return;
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.WALLET_IMPORT_ATTEMPTED,
      );
    });
    let error = null;
    if (!passwordRequirementsMet(password)) {
      error = strings('import_from_seed.password_length_error');
    } else if (password !== confirmPassword) {
      error = strings('import_from_seed.password_dont_match');
    }

    if (failedSeedPhraseRequirements(parsedSeed)) {
      error = strings('import_from_seed.seed_phrase_requirements');
    } else if (!isValidMnemonic(parsedSeed)) {
      error = strings('import_from_seed.invalid_seed_phrase');
    }

    if (error) {
      Alert.alert(strings('import_from_seed.error'), error);
      InteractionManager.runAfterInteractions(() => {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_FAILURE,
          {
            wallet_setup_type: 'import',
            error_type: error,
          },
        );
      });
    } else {
      try {
        this.setState({ loading: true });

        const { KeyringController } = Engine.context;
        await Engine.resetState();
        await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
        await KeyringController.createNewVaultAndRestore(password, parsedSeed);

        if (this.state.biometryType && this.state.biometryChoice) {
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.BIOMETRICS,
          );
        } else if (this.state.rememberMe) {
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.REMEMBER_ME,
          );
        } else {
          await SecureKeychain.resetGenericPassword();
        }
        // Get onboarding wizard state
        const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
        // mark the user as existing so it doesn't see the create password screen again
        await AsyncStorage.setItem(EXISTING_USER, TRUE);
        await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
        this.setState({ loading: false });
        this.props.passwordSet();
        this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
        this.props.seedphraseBackedUp();
        this.props.logIn();
        InteractionManager.runAfterInteractions(() => {
          AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.WALLET_IMPORTED, {
            biometrics_enabled: Boolean(this.state.biometryType),
          });
          AnalyticsV2.trackEvent(
            AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_COMPLETED,
            {
              wallet_setup_type: 'import',
              new_wallet: false,
            },
          );
        });
        if (onboardingWizard) {
          this.props.navigation.replace('ManualBackupStep3');
        } else {
          this.props.setOnboardingWizardStep(1);
          this.props.navigation.replace('HomeNav', { screen: 'WalletView' });
        }
        await importAdditionalAccounts();
      } catch (error) {
        // Should we force people to enable passcode / biometrics?
        if (error.toString() === PASSCODE_NOT_SET_ERROR) {
          Alert.alert(
            'Security Alert',
            'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)',
          );
          this.setState({ loading: false });
        } else {
          this.setState({ loading: false, error: error.toString() });
          Logger.log('Error with seed phrase import', error);
        }
        InteractionManager.runAfterInteractions(() => {
          AnalyticsV2.trackEvent(
            AnalyticsV2.ANALYTICS_EVENTS.WALLET_SETUP_FAILURE,
            {
              wallet_setup_type: 'import',
              error_type: error.toString(),
            },
          );
        });
      }
    }
  };

  onBiometryChoiceChange = (value) => {
    this.setState({ biometryChoice: value });
  };

  clearSecretRecoveryPhrase = async (seed) => {
    // get clipboard contents
    const clipboardContents = await Clipboard.getString();
    const parsedClipboardContents = parseSeedPhrase(clipboardContents);
    if (
      // only clear clipboard if contents isValidMnemonic
      !failedSeedPhraseRequirements(parsedClipboardContents) &&
      isValidMnemonic(parsedClipboardContents) &&
      // only clear clipboard if the seed phrase entered matches what's in the clipboard
      parseSeedPhrase(seed) === parsedClipboardContents
    ) {
      await Clipboard.clearString();
    }
  };

  onSeedWordsChange = async (seed) => {
    this.setState({ seed });
    // Only clear on android since iOS will notify users when we getString()
    if (Device.isAndroid()) {
      const androidOSVersion = parseInt(Platform.constants.Release, 10);
      // This conditional is necessary to avoid an error in Android 8.1.0 or lower
      if (androidOSVersion >= MINIMUM_SUPPORTED_CLIPBOARD_VERSION) {
        await this.clearSecretRecoveryPhrase(seed);
      }
    }
  };

  onPasswordChange = (val) => {
    const passInfo = zxcvbn(val);

    this.setState({ password: val, passwordStrength: passInfo.score });
  };

  onPasswordConfirmChange = (val) => {
    this.setState({ confirmPassword: val });
  };

  jumpToPassword = () => {
    const { current } = this.passwordInput;
    current && current.focus();
  };

  jumpToConfirmPassword = () => {
    const { current } = this.confirmPasswordInput;
    current && current.focus();
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
    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={this.state.biometryType}
        onUpdateBiometryChoice={this.updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  toggleShowHide = () => {
    this.setState({ secureTextEntry: !this.state.secureTextEntry });
  };

  toggleHideSeedPhraseInput = () => {
    this.setState(({ hideSeedPhraseInput }) => ({
      hideSeedPhraseInput: !hideSeedPhraseInput,
    }));
  };

  onQrCodePress = () => {
    setTimeout(this.toggleHideSeedPhraseInput, 100);
    this.props.navigation.navigate('QRScanner', {
      onScanSuccess: ({ seed = undefined }) => {
        if (seed) {
          this.setState({ seed });
        } else {
          Alert.alert(
            strings('import_from_seed.invalid_qr_code_title'),
            strings('import_from_seed.invalid_qr_code_message'),
          );
        }
        this.toggleHideSeedPhraseInput();
      },
      onScanError: (error) => {
        this.toggleHideSeedPhraseInput();
      },
    });
  };

  seedphraseInputFocused = () =>
    this.setState({
      seedphraseInputFocused: !this.state.seedphraseInputFocused,
    });

  render() {
    const {
      password,
      passwordStrength,
      confirmPassword,
      seed,
      seedphraseInputFocused,
      inputWidth,
      secureTextEntry,
      error,
      loading,
      hideSeedPhraseInput,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

    return (
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          style={styles.wrapper}
          resetScrollToCoords={{ x: 0, y: 0 }}
        >
          <View testID={IMPORT_PASSWORD_CONTAINER_ID}>
            <Text style={styles.title}>
              {strings('import_from_seed.title')}
            </Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>
                  {strings('choose_password.seed_phrase')}
                </Text>
              </View>
              <View style={[styles.fieldCol, styles.fieldColRight]}>
                <TouchableOpacity onPress={this.toggleHideSeedPhraseInput}>
                  <Text style={styles.label}>
                    {strings(
                      `choose_password.${
                        hideSeedPhraseInput ? 'show' : 'hide'
                      }`,
                    )}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {hideSeedPhraseInput ? (
              <OutlinedTextField
                style={styles.input}
                containerStyle={inputWidth}
                inputContainerStyle={styles.padding}
                placeholder={strings(
                  'import_from_seed.seed_phrase_placeholder',
                )}
                placeholderTextColor={colors.text.muted}
                testID={SECRET_RECOVERY_PHRASE_INPUT_BOX_ID}
                returnKeyType="next"
                autoCapitalize="none"
                secureTextEntry={hideSeedPhraseInput}
                onChangeText={this.onSeedWordsChange}
                value={seed}
                baseColor={colors.border.default}
                tintColor={colors.primary.default}
                onSubmitEditing={this.jumpToPassword}
                keyboardAppearance={themeAppearance}
              />
            ) : (
              <TextInput
                value={seed}
                numberOfLines={3}
                style={[
                  styles.seedPhrase,
                  inputWidth,
                  seedphraseInputFocused && styles.inputFocused,
                ]}
                secureTextEntry
                multiline={!hideSeedPhraseInput}
                placeholder={strings(
                  'import_from_seed.seed_phrase_placeholder',
                )}
                placeholderTextColor={colors.text.muted}
                onChangeText={this.onSeedWordsChange}
                testID={SECRET_RECOVERY_PHRASE_INPUT_BOX_ID}
                blurOnSubmit
                onSubmitEditing={this.jumpToPassword}
                returnKeyType="next"
                keyboardType={
                  (!hideSeedPhraseInput &&
                    Device.isAndroid() &&
                    'visible-password') ||
                  'default'
                }
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={
                  (!hideSeedPhraseInput && this.seedphraseInputFocused) || null
                }
                onBlur={
                  (!hideSeedPhraseInput && this.seedphraseInputFocused) || null
                }
                keyboardAppearance={themeAppearance}
              />
            )}
            <TouchableOpacity
              style={styles.qrCode}
              onPress={this.onQrCodePress}
            >
              <Icon name="qrcode" size={20} color={colors.icon.default} />
            </TouchableOpacity>
            <View style={styles.field}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>
                    {strings('import_from_seed.new_password')}
                  </Text>
                </View>
                <View style={[styles.fieldCol, styles.fieldColRight]}>
                  <TouchableOpacity onPress={this.toggleShowHide}>
                    <Text style={styles.label}>
                      {strings(
                        `choose_password.${secureTextEntry ? 'show' : 'hide'}`,
                      )}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <OutlinedTextField
                style={styles.input}
                containerStyle={inputWidth}
                // ref={this.passwordInput}
                placeholder={strings('import_from_seed.new_password')}
                placeholderTextColor={colors.text.muted}
                testID={CREATE_PASSWORD_INPUT_BOX_ID}
                returnKeyType={'next'}
                autoCapitalize="none"
                secureTextEntry={secureTextEntry}
                onChangeText={this.onPasswordChange}
                value={password}
                baseColor={colors.border.default}
                tintColor={colors.primary.default}
                onSubmitEditing={this.jumpToConfirmPassword}
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
              <Text style={styles.label}>
                {strings('import_from_seed.confirm_password')}
              </Text>
              <OutlinedTextField
                style={styles.input}
                containerStyle={inputWidth}
                // ref={this.confirmPasswordInput}
                testID={CONFIRM_PASSWORD_INPUT_BOX_ID}
                onChangeText={this.onPasswordConfirmChange}
                returnKeyType={'next'}
                autoCapitalize="none"
                secureTextEntry={secureTextEntry}
                placeholder={strings('import_from_seed.confirm_password')}
                value={confirmPassword}
                baseColor={colors.border.default}
                tintColor={colors.primary.default}
                onSubmitEditing={this.onPressImport}
                placeholderTextColor={colors.text.muted}
                keyboardAppearance={themeAppearance}
              />

              <View style={styles.showMatchingPasswords}>
                {password !== '' && password === confirmPassword ? (
                  <Icon name="check" size={12} color={colors.success.default} />
                ) : null}
              </View>
              <Text style={styles.passwordStrengthLabel}>
                {strings('choose_password.must_be_at_least', {
                  number: MIN_PASSWORD_LENGTH,
                })}
              </Text>
            </View>

            {this.renderSwitch()}

            {!!error && (
              <Text style={styles.errorMsg} testID={'invalid-seed-phrase'}>
                {error}
              </Text>
            )}

            <View style={styles.ctaWrapper}>
              <StyledButton
                type={'blue'}
                onPress={this.onPressImport}
                testID={'submit'}
                disabled={!(password !== '' && password === confirmPassword)}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary.inverse}
                  />
                ) : (
                  strings('import_from_seed.import_button')
                )}
              </StyledButton>
            </View>
          </View>
        </KeyboardAwareScrollView>
        <View style={styles.termsAndConditions}>
          <TermsAndConditions
            navigation={this.props.navigation}
            action={strings('import_from_seed.import_button')}
          />
        </View>
      </SafeAreaView>
    );
  }
}

ImportFromSeed.contextType = ThemeContext;

const mapDispatchToProps = (dispatch) => ({
  setLockTime: (time) => dispatch(setLockTime(time)),
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  passwordSet: () => dispatch(passwordSet()),
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
  logIn: () => dispatch(logIn()),
});

export default connect(null, mapDispatchToProps)(ImportFromSeed);
