import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  SafeAreaView,
  InteractionManager,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import zxcvbn from 'zxcvbn';
import Icon from 'react-native-vector-icons/FontAwesome';
import { OutlinedTextField } from 'react-native-material-textfield';
import DefaultPreference from 'react-native-default-preference';
import Clipboard from '@react-native-clipboard/clipboard';
import AppConstants from '../../../core/AppConstants';
import Device from '../../../util/device';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
  parseSeedPhrase,
  parseVaultValue,
} from '../../../util/validators';
import Logger from '../../../util/Logger';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { useTheme } from '../../../util/theme';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import setOnboardingWizardStep from '../../../actions/wizard';
import { strings } from '../../../../locales/i18n';
import TermsAndConditions from '../TermsAndConditions';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import StyledButton from '../../UI/StyledButton';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID,
  IMPORT_FROM_SEED_SCREEN_TITLE_ID,
  IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
  IMPORT_FROM_SEED_SCREEN_PASSWORD_STRENGTH_ID,
  IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_CHECK_ICON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/ImportFromSeedScreen.testIds';
import { IMPORT_PASSWORD_CONTAINER_ID } from '../../../constants/test-ids';
import createStyles from './styles';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';

const MINIMUM_SUPPORTED_CLIPBOARD_VERSION = 9;

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const IOS_REJECTED_BIOMETRICS_ERROR =
  'Error: The user name or passphrase you entered is not correct.';

/**
 * View where users can set restore their account
 * using a secret recovery phrase (SRP)
 * The SRP was formally called the seed phrase
 */
const ImportFromSecretRecoveryPhrase = ({
  navigation,
  passwordSet,
  setLockTime,
  seedphraseBackedUp,
  setOnboardingWizardStep,
  route,
}) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState();
  const [seed, setSeed] = useState('');
  const [biometryType, setBiometryType] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [seedphraseInputFocused, setSeedphraseInputFocused] = useState(false);
  const [inputWidth, setInputWidth] = useState({ width: '99%' });
  const [hideSeedPhraseInput, setHideSeedPhraseInput] = useState(true);

  const passwordInput = React.createRef();
  const confirmPasswordInput = React.createRef();

  const updateNavBar = () => {
    navigation.setOptions(getOnboardingNavbarOptions(route, {}, colors));
  };

  useEffect(() => {
    updateNavBar();

    const setBiometricsOption = async () => {
      const authData = await Authentication.getType();
      const previouslyDisabled = await AsyncStorage.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await AsyncStorage.getItem(
        PASSCODE_DISABLED,
      );
      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    setBiometricsOption();
    // Workaround https://github.com/facebook/react-native/issues/9958
    setTimeout(() => {
      setInputWidth({ width: '100%' });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const termsOfUse = useCallback(async () => {
    if (navigation) {
      await navigateTermsOfUse(navigation.navigate);
    }
  }, [navigation]);

  useEffect(() => {
    termsOfUse();
  }, [termsOfUse]);

  const updateBiometryChoice = async (biometryChoice) => {
    await updateAuthTypeStorageFlags(biometryChoice);
    setBiometryChoice(biometryChoice);
  };

  /**
   * This function handles the case when the user rejects the OS prompt for allowing use of biometrics.
   * If this occurs we will create the wallet automatically with password as the login method
   */
  const handleRejectedOsBiometricPrompt = async (parsedSeed) => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    try {
      await Authentication.newWalletAndRestore(
        password,
        newAuthData,
        parsedSeed,
        true,
      );
    } catch (err) {
      this.setState({ loading: false, error: err.toString() });
    }
    setBiometryType(newAuthData.availableBiometryType);
    updateBiometryChoice(false);
  };

  const onPressImport = async () => {
    const vaultSeed = await parseVaultValue(password, seed);
    const parsedSeed = parseSeedPhrase(vaultSeed || seed);
    //Set the seed state with a valid parsed seed phrase (handle vault scenario)
    setSeed(parsedSeed);

    if (loading) return;
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_IMPORT_ATTEMPTED);
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
        AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: error,
        });
      });
    } else {
      try {
        setLoading(true);
        const authData = await Authentication.componentAuthenticationType(
          biometryChoice,
          rememberMe,
        );

        try {
          await Authentication.newWalletAndRestore(
            password,
            authData,
            parsedSeed,
            true,
          );
        } catch (err) {
          // retry faceID if the user cancels the
          if (Device.isIos && err.toString() === IOS_REJECTED_BIOMETRICS_ERROR)
            await handleRejectedOsBiometricPrompt(parsedSeed);
        }
        // Get onboarding wizard state
        const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
        setLoading(false);
        passwordSet();
        setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
        seedphraseBackedUp();
        InteractionManager.runAfterInteractions(() => {
          AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_IMPORTED, {
            biometrics_enabled: Boolean(biometryType),
          });
          AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
            wallet_setup_type: 'import',
            new_wallet: false,
          });
        });
        if (onboardingWizard) {
          navigation.replace(Routes.ONBOARDING.MANUAL_BACKUP.STEP_3);
        } else {
          setOnboardingWizardStep(1);
          navigation.replace(Routes.ONBOARDING.HOME_NAV, {
            screen: Routes.WALLET_VIEW,
          });
        }
        await importAdditionalAccounts();
      } catch (error) {
        // Should we force people to enable passcode / biometrics?
        if (error.toString() === PASSCODE_NOT_SET_ERROR) {
          Alert.alert(
            'Security Alert',
            'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)',
          );
          setLoading(false);
        } else {
          setLoading(false);
          setError(error.message);
          Logger.log('Error with seed phrase import', error.message);
        }
        InteractionManager.runAfterInteractions(() => {
          AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
            wallet_setup_type: 'import',
            error_type: error.toString(),
          });
        });
      }
    }
  };

  const clearSecretRecoveryPhrase = async (seed) => {
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

  const onSeedWordsChange = useCallback(async (seed) => {
    setSeed(seed);
    // Only clear on android since iOS will notify users when we getString()
    if (Device.isAndroid()) {
      const androidOSVersion = parseInt(Platform.constants.Release, 10);
      // This conditional is necessary to avoid an error in Android 8.1.0 or lower
      if (androidOSVersion >= MINIMUM_SUPPORTED_CLIPBOARD_VERSION) {
        await clearSecretRecoveryPhrase(seed);
      }
    }
  }, []);

  const onPasswordChange = (value) => {
    const passInfo = zxcvbn(value);

    setPassword(value);
    setPasswordStrength(passInfo.score);
  };

  const onPasswordConfirmChange = (value) => {
    setConfirmPassword(value);
  };

  const jumpToPassword = useCallback(() => {
    const { current } = passwordInput;
    current && current.focus();
  }, [passwordInput]);

  const jumpToConfirmPassword = () => {
    const { current } = confirmPasswordInput;
    current && current.focus();
  };

  const renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMe) => {
      setRememberMe(rememberMe);
    };
    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={biometryType}
        biometryChoiceState={biometryChoice}
        onUpdateBiometryChoice={updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  const toggleShowHide = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const toggleHideSeedPhraseInput = useCallback(() => {
    setHideSeedPhraseInput(!hideSeedPhraseInput);
  }, [hideSeedPhraseInput]);

  const onQrCodePress = useCallback(() => {
    let shouldHideSRP = true;
    if (!hideSeedPhraseInput) {
      shouldHideSRP = false;
    }

    setHideSeedPhraseInput(false);
    navigation.navigate(Routes.QR_SCANNER, {
      onScanSuccess: ({ seed = undefined }) => {
        if (seed) {
          setSeed(seed);
        } else {
          Alert.alert(
            strings('import_from_seed.invalid_qr_code_title'),
            strings('import_from_seed.invalid_qr_code_message'),
          );
        }
        setHideSeedPhraseInput(shouldHideSRP);
      },
      onScanError: (error) => {
        setHideSeedPhraseInput(shouldHideSRP);
      },
    });
  }, [hideSeedPhraseInput, navigation]);

  const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

  const hiddenSRPInput = useCallback(
    () => (
      <OutlinedTextField
        style={styles.input}
        containerStyle={inputWidth}
        inputContainerStyle={styles.padding}
        placeholder={strings('import_from_seed.seed_phrase_placeholder')}
        {...generateTestId(
          Platform,
          IMPORT_FROM_SEED_SCREEN_SEED_PHRASE_INPUT_ID,
        )}
        placeholderTextColor={colors.text.muted}
        returnKeyType="next"
        autoCapitalize="none"
        secureTextEntry={hideSeedPhraseInput}
        onChangeText={onSeedWordsChange}
        value={seed}
        baseColor={colors.border.default}
        tintColor={colors.primary.default}
        onSubmitEditing={jumpToPassword}
        keyboardAppearance={themeAppearance || 'light'}
      />
    ),
    [
      colors.border.default,
      colors.primary.default,
      colors.text.muted,
      hideSeedPhraseInput,
      inputWidth,
      jumpToPassword,
      onSeedWordsChange,
      seed,
      styles.input,
      styles.padding,
      themeAppearance,
    ],
  );

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        style={styles.wrapper}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <View testID={IMPORT_PASSWORD_CONTAINER_ID}>
          <Text
            style={styles.title}
            {...generateTestId(Platform, IMPORT_FROM_SEED_SCREEN_TITLE_ID)}
          >
            {strings('import_from_seed.title')}
          </Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.label}>
                {strings('choose_password.seed_phrase')}
              </Text>
            </View>
            <View style={[styles.fieldCol, styles.fieldColRight]}>
              <TouchableOpacity onPress={toggleHideSeedPhraseInput}>
                <Text style={styles.label}>
                  {strings(
                    `choose_password.${hideSeedPhraseInput ? 'show' : 'hide'}`,
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {hideSeedPhraseInput ? (
            hiddenSRPInput()
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
              placeholder={strings('import_from_seed.seed_phrase_placeholder')}
              placeholderTextColor={colors.text.muted}
              onChangeText={onSeedWordsChange}
              blurOnSubmit
              onSubmitEditing={jumpToPassword}
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
                (() =>
                  !hideSeedPhraseInput &&
                  setSeedphraseInputFocused(!seedphraseInputFocused)) || null
              }
              onBlur={
                (() =>
                  !hideSeedPhraseInput &&
                  setSeedphraseInputFocused(!seedphraseInputFocused)) || null
              }
              keyboardAppearance={themeAppearance || 'light'}
            />
          )}
          <TouchableOpacity style={styles.qrCode} onPress={onQrCodePress}>
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
                <TouchableOpacity onPress={toggleShowHide}>
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
              {...generateTestId(
                Platform,
                IMPORT_FROM_SEED_SCREEN_NEW_PASSWORD_INPUT_ID,
              )}
              testID={'create-password-first-input-field'}
              placeholder={strings('import_from_seed.new_password')}
              placeholderTextColor={colors.text.muted}
              returnKeyType={'next'}
              autoCapitalize="none"
              secureTextEntry={secureTextEntry}
              onChangeText={onPasswordChange}
              value={password}
              baseColor={colors.border.default}
              tintColor={colors.primary.default}
              onSubmitEditing={jumpToConfirmPassword}
              keyboardAppearance={themeAppearance || 'light'}
            />

            {(password !== '' && (
              <Text
                style={styles.passwordStrengthLabel}
                {...generateTestId(
                  Platform,
                  IMPORT_FROM_SEED_SCREEN_PASSWORD_STRENGTH_ID,
                )}
              >
                {strings('choose_password.password_strength')}
                <Text style={styles[`strength_${passwordStrengthWord}`]}>
                  {' '}
                  {strings(`choose_password.strength_${passwordStrengthWord}`)}
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
              {...generateTestId(
                Platform,
                IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_INPUT_ID,
              )}
              testID={'create-password-second-input-field'}
              onChangeText={onPasswordConfirmChange}
              returnKeyType={'next'}
              autoCapitalize="none"
              secureTextEntry={secureTextEntry}
              placeholder={strings('import_from_seed.confirm_password')}
              value={confirmPassword}
              baseColor={colors.border.default}
              tintColor={colors.primary.default}
              onSubmitEditing={onPressImport}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance || 'light'}
            />

            <View style={styles.showMatchingPasswords}>
              {password !== '' && password === confirmPassword ? (
                <Icon
                  name="check"
                  size={12}
                  color={colors.success.default}
                  {...generateTestId(
                    Platform,
                    IMPORT_FROM_SEED_SCREEN_CONFIRM_PASSWORD_CHECK_ICON_ID,
                  )}
                />
              ) : null}
            </View>
            <Text style={styles.passwordStrengthLabel}>
              {strings('choose_password.must_be_at_least', {
                number: MIN_PASSWORD_LENGTH,
              })}
            </Text>
          </View>

          {renderSwitch()}

          {!!error && (
            <Text style={styles.errorMsg} testID={'invalid-seed-phrase'}>
              {error}
            </Text>
          )}

          <View style={styles.ctaWrapper}>
            <StyledButton
              type={'blue'}
              onPress={onPressImport}
              testID={IMPORT_FROM_SEED_SCREEN_SUBMIT_BUTTON_ID}
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
          navigation={navigation}
          action={strings('import_from_seed.import_button')}
        />
      </View>
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );
};

ImportFromSecretRecoveryPhrase.propTypes = {
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
  route: PropTypes.object,
};

const mapDispatchToProps = (dispatch) => ({
  setLockTime: (time) => dispatch(setLockTime(time)),
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  passwordSet: () => dispatch(passwordSet()),
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
});

export default connect(
  null,
  mapDispatchToProps,
)(ImportFromSecretRecoveryPhrase);
