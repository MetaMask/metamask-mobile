import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, useSelector } from 'react-redux';
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { isTest } from '../../../util/test/utils';
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
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { QRTabSwitcherScreens } from '../../../components/Views/QRTabSwitcher';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { passcodeType } from '../../../util/authentication';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Label from '../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { CommonActions } from '@react-navigation/native';
import {
  SRP_LENGTHS,
  SPACE_CHAR,
  PASSCODE_NOT_SET_ERROR,
  IOS_REJECTED_BIOMETRICS_ERROR,
} from './constant';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
} from '../../../util/trace';
import { v4 as uuidv4 } from 'uuid';
import SrpInputGrid from '../../UI/SrpInputGrid';
import SrpWordSuggestions from '../../UI/SrpWordSuggestions';
import { selectImportSrpWordSuggestionEnabledFlag } from '../../../selectors/featureFlagController/importSrpWordSuggestion';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  saveOnboardingEvent,
  route,
}) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const confirmPasswordInput = useRef();

  const { toastRef } = useContext(ToastContext);
  const passwordSetupAttemptTraceCtxRef = useRef(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryType, setBiometryType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hideSeedPhraseInput, setHideSeedPhraseInput] = useState(true);
  const [seedPhrase, setSeedPhrase] = useState(['']);
  const [currentStep, setCurrentStep] = useState(0);
  const [learnMore, setLearnMore] = useState(false);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);

  const srpInputGridRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentInputWord, setCurrentInputWord] = useState('');

  // Feature flag for SRP word suggestions
  const isSrpWordSuggestionsEnabled = useSelector(
    selectImportSrpWordSuggestionEnabledFlag,
  );

  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const isSRPContinueButtonDisabled = useMemo(() => {
    const updatedSeedPhrase = [...seedPhrase];
    const updatedSeedPhraseLength = updatedSeedPhrase.filter(
      (word) => word !== '',
    ).length;
    return !SRP_LENGTHS.includes(updatedSeedPhraseLength);
  }, [seedPhrase]);

  useEffect(() => {
    if (error) {
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPhrase]);

  const { isEnabled: isMetricsEnabled } = useAnalytics();

  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), saveOnboardingEvent);
  };

  const onQrCodePress = useCallback(() => {
    let shouldHideSRP = true;
    if (!hideSeedPhraseInput) {
      shouldHideSRP = false;
    }

    setHideSeedPhraseInput(false);
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess: ({ seed = undefined }) => {
        if (seed) {
          srpInputGridRef.current?.handleSeedPhraseChange(seed);
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

  const animateToStep = useCallback(
    (nextStep) => {
      if (isTest) {
        setCurrentStep(nextStep);
        return;
      }

      const isForward = nextStep > currentStep;
      const exitValue = isForward ? -SCREEN_WIDTH : SCREEN_WIDTH;
      const enterValue = isForward ? SCREEN_WIDTH : -SCREEN_WIDTH;

      Animated.timing(slideAnim, {
        toValue: exitValue,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(nextStep);
        slideAnim.setValue(enterValue);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    },
    [currentStep, slideAnim],
  );

  const onBackPress = () => {
    if (currentStep === 0) {
      navigation.goBack();
    } else {
      animateToStep(currentStep - 1);
    }
  };

  const headerLeft = () => (
    <TouchableOpacity
      onPress={onBackPress}
      testID={ImportFromSeedSelectorsIDs.BACK_BUTTON_ID}
    >
      <Icon
        name={IconName.ArrowLeft}
        size={24}
        color={colors.text.default}
        style={styles.headerLeft}
      />
    </TouchableOpacity>
  );

  const headerRight = () =>
    currentStep === 0 ? (
      <TouchableOpacity
        onPress={onQrCodePress}
        testID={ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID}
      >
        <Icon
          name={IconName.Scan}
          size={24}
          color={colors.text.default}
          onPress={onQrCodePress}
          style={styles.headerRight}
        />
      </TouchableOpacity>
    ) : (
      <View />
    );

  const updateNavBar = () => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft,
          headerRight,
        },
        colors,
        false,
      ),
    );
  };

  useEffect(() => {
    updateNavBar();
    const setBiometricsOption = async () => {
      const authData = await Authentication.getType();
      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
      }
    };

    setBiometricsOption();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  useEffect(
    () => () => {
      if (passwordSetupAttemptTraceCtxRef.current) {
        endTrace({ name: TraceName.OnboardingPasswordSetupAttempt });
        passwordSetupAttemptTraceCtxRef.current = null;
      }
    },
    [],
  );

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
  };

  const onPasswordChange = (value) => {
    setPassword(value);
    if (value === '') {
      setConfirmPassword('');
    }
  };

  const onPasswordConfirmChange = (value) => {
    setConfirmPassword(value);
  };

  const jumpToConfirmPassword = () => {
    const { current } = confirmPasswordInput;
    current && current.focus();
  };

  const validateSeedPhrase = () => {
    // Trim each word before joining to ensure proper validation
    const phrase = seedPhrase
      .map((item) => item.trim())
      .filter((item) => item !== '')
      .join(SPACE_CHAR);
    const seedPhraseLength = seedPhrase.length;
    if (!SRP_LENGTHS.includes(seedPhraseLength)) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('import_from_seed.seed_phrase_length_error') },
        ],
        hasNoTimeout: false,
        iconName: IconName.Error,
        iconColor: IconColor.Error,
      });
      return false;
    }

    if (!isValidMnemonic(phrase)) {
      setError(strings('import_from_seed.invalid_seed_phrase'));
      return false;
    }

    return true;
  };

  const handleContinueImportFlow = () => {
    if (!validateSeedPhrase()) {
      return;
    }
    animateToStep(currentStep + 1);
    // Start the trace when moving to the password setup step
    const onboardingTraceCtx = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtx) {
      passwordSetupAttemptTraceCtxRef.current = trace({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtx,
      });
    }
  };

  const isContinueButtonDisabled = useMemo(
    () =>
      password === '' ||
      confirmPassword === '' ||
      password !== confirmPassword ||
      !learnMore ||
      password.length < MIN_PASSWORD_LENGTH,
    [password, confirmPassword, learnMore],
  );

  const isPasswordTooShort = useMemo(
    () =>
      !isPasswordFieldFocused &&
      password !== '' &&
      password.length < MIN_PASSWORD_LENGTH,
    [isPasswordFieldFocused, password],
  );

  const toggleShowPassword = (index) => {
    setShowPasswordIndex((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index);
      }
      return [...prev, index];
    });
  };

  const onPressImport = async () => {
    // Trim each word before joining for processing
    const trimmedSeedPhrase = seedPhrase
      .map((item) => item.trim())
      .join(SPACE_CHAR);
    const vaultSeed = await parseVaultValue(password, trimmedSeedPhrase);
    const parsedSeed = parseSeedPhrase(vaultSeed || trimmedSeedPhrase);

    if (loading) return;
    track(MetaMetricsEvents.WALLET_IMPORT_ATTEMPTED);
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
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'import',
        error_type: error,
      });
    } else {
      try {
        setLoading(true);
        const onboardingTraceCtx = route.params?.onboardingTraceCtx;
        const oauthLoginSuccess = route.params?.oauthLoginSuccess || false;
        trace({
          name: TraceName.OnboardingSRPAccountImportTime,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: onboardingTraceCtx,
          tags: {
            is_social_login: oauthLoginSuccess,
            account_type: oauthLoginSuccess ? 'social_import' : 'srp_import',
            biometrics_enabled: Boolean(biometryType),
          },
        });

        // latest ux changes - we are forcing user to enable biometric by default
        const authData = await Authentication.componentAuthenticationType(
          true,
          false,
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
        setLoading(false);
        passwordSet();
        setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
        seedphraseBackedUp();
        track(MetaMetricsEvents.WALLET_IMPORTED, {
          biometrics_enabled: Boolean(biometryType),
        });
        track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
          wallet_setup_type: 'import',
          new_wallet: false,
          account_type: 'imported',
        });

        fetchAccountsWithActivity();
        const resetAction = CommonActions.reset({
          index: 1,
          routes: [
            {
              name: Routes.ONBOARDING.SUCCESS_FLOW,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
              },
            },
          ],
        });
        endTrace({ name: TraceName.OnboardingSRPAccountImportTime });
        endTrace({ name: TraceName.OnboardingExistingSrpImport });
        endTrace({ name: TraceName.OnboardingJourneyOverall });

        if (isMetricsEnabled()) {
          navigation.dispatch(resetAction);
        } else {
          navigation.navigate('OptinMetrics', {
            onContinue: () => {
              navigation.dispatch(resetAction);
            },
          });
        }
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
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: error.toString(),
        });

        const onboardingTraceCtx = route.params?.onboardingTraceCtx;
        if (onboardingTraceCtx) {
          trace({
            name: TraceName.OnboardingPasswordSetupError,
            op: TraceOperation.OnboardingUserJourney,
            parentContext: onboardingTraceCtx,
            tags: { errorMessage: error.toString() },
          });
          endTrace({ name: TraceName.OnboardingPasswordSetupError });
        }
      }
    }
  };

  const isError =
    password !== '' && confirmPassword !== '' && password !== confirmPassword;

  const showWhatIsSeedPhrase = () => {
    track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
      location: 'import_from_seed',
    });
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

  const learnMoreLink = () => {
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  };

  const uniqueId = useMemo(() => uuidv4(), []);

  const content = (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        testID={ImportFromSeedSelectorsIDs.CONTAINER_ID}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        bottomOffset={180}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {currentStep === 0 && (
            <>
              <Text
                variant={TextVariant.DisplayMD}
                color={TextColor.Default}
                testID={ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID}
              >
                {strings('import_from_seed.title')}
              </Text>
              <View style={styles.importSrpContainer}>
                <View style={styles.description}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings(
                      'import_from_seed.enter_your_secret_recovery_phrase',
                    )}
                  </Text>
                  <TouchableOpacity
                    onPress={showWhatIsSeedPhrase}
                    testID={
                      ImportFromSeedSelectorsIDs.WHAT_IS_SEEDPHRASE_LINK_ID
                    }
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Md}
                      color={colors.icon.alternative}
                    />
                  </TouchableOpacity>
                </View>
                <SrpInputGrid
                  ref={srpInputGridRef}
                  seedPhrase={seedPhrase}
                  onSeedPhraseChange={setSeedPhrase}
                  onError={setError}
                  externalError={error}
                  testIdPrefix={ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}
                  placeholderText={strings('import_from_seed.srp_placeholder')}
                  uniqueId={uniqueId}
                  onCurrentWordChange={setCurrentInputWord}
                  autoFocus={false}
                />
              </View>
            </>
          )}

          {currentStep === 1 && (
            <View style={styles.passwordContainer}>
              <View style={styles.passwordContainerTitle}>
                <Text
                  variant={TextVariant.DisplayMD}
                  color={TextColor.Default}
                  testID={ChoosePasswordSelectorsIDs.TITLE_ID}
                >
                  {strings('import_from_seed.metamask_password')}
                </Text>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  testID={ChoosePasswordSelectorsIDs.DESCRIPTION_ID}
                >
                  {strings('import_from_seed.metamask_password_description')}
                </Text>
              </View>

              <View style={styles.field}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  style={styles.label}
                >
                  {strings('import_from_seed.create_new_password')}
                </Label>
                <TextField
                  size={TextFieldSize.Lg}
                  value={password}
                  onChangeText={onPasswordChange}
                  onFocus={() => setIsPasswordFieldFocused(true)}
                  onBlur={() => setIsPasswordFieldFocused(false)}
                  secureTextEntry={showPasswordIndex.includes(0)}
                  returnKeyType={'next'}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  keyboardAppearance={themeAppearance || 'light'}
                  placeholderTextColor={colors.text.muted}
                  onSubmitEditing={jumpToConfirmPassword}
                  isError={isPasswordTooShort}
                  style={isPasswordTooShort ? styles.errorBorder : undefined}
                  endAccessory={
                    <Icon
                      name={
                        showPasswordIndex.includes(0)
                          ? IconName.Eye
                          : IconName.EyeSlash
                      }
                      size={IconSize.Lg}
                      color={colors.icon.alternative}
                      onPress={() => toggleShowPassword(0)}
                      testID={
                        ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID
                      }
                    />
                  }
                  testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                />
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    isPasswordTooShort ? TextColor.Error : TextColor.Alternative
                  }
                >
                  {strings('choose_password.must_be_at_least', {
                    number: MIN_PASSWORD_LENGTH,
                  })}
                </Text>
              </View>

              <View style={styles.field}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  style={styles.label}
                >
                  {strings('import_from_seed.confirm_password')}
                </Label>
                <TextField
                  ref={confirmPasswordInput}
                  size={TextFieldSize.Lg}
                  onChangeText={onPasswordConfirmChange}
                  secureTextEntry={showPasswordIndex.includes(1)}
                  autoComplete="new-password"
                  returnKeyType={'next'}
                  autoCapitalize="none"
                  value={confirmPassword}
                  placeholderTextColor={colors.text.muted}
                  isError={isError}
                  keyboardAppearance={themeAppearance || 'light'}
                  endAccessory={
                    <Icon
                      name={
                        showPasswordIndex.includes(1)
                          ? IconName.Eye
                          : IconName.EyeSlash
                      }
                      size={IconSize.Lg}
                      color={colors.icon.alternative}
                      onPress={() => toggleShowPassword(1)}
                      testID={
                        ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID
                      }
                    />
                  }
                  testID={ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID}
                  isDisabled={password === ''}
                />
                {isError && (
                  <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                    {strings('import_from_seed.password_error')}
                  </Text>
                )}
              </View>

              <View style={styles.learnMoreContainer}>
                <Checkbox
                  onPress={() => setLearnMore(!learnMore)}
                  isChecked={learnMore}
                  style={styles.checkbox}
                  testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                />
                <Button
                  variant={ButtonVariants.Link}
                  onPress={() => setLearnMore(!learnMore)}
                  style={styles.learnMoreTextContainer}
                  testID={ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID}
                  label={
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                    >
                      {strings('import_from_seed.learn_more')}
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Primary}
                        onPress={learnMoreLink}
                        testID={ImportFromSeedSelectorsIDs.LEARN_MORE_LINK_ID}
                      >
                        {' ' + strings('reset_password.learn_more')}
                      </Text>
                    </Text>
                  }
                />
              </View>

              <View style={styles.createPasswordCtaContainer}>
                <Button
                  loading={loading}
                  width={ButtonWidthTypes.Full}
                  variant={ButtonVariants.Primary}
                  label={strings('import_from_seed.import_create_password_cta')}
                  onPress={onPressImport}
                  disabled={isContinueButtonDisabled}
                  size={ButtonSize.Lg}
                  isDisabled={isContinueButtonDisabled}
                  testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
      {currentStep === 0 && (
        <View style={styles.fixedBottomContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('import_from_seed.continue')}
            onPress={handleContinueImportFlow}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            isDisabled={isSRPContinueButtonDisabled}
            testID={ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID}
          />
        </View>
      )}
      {isSrpWordSuggestionsEnabled &&
        currentStep === 0 &&
        isKeyboardVisible && (
          <KeyboardStickyView
            offset={{ closed: 0, opened: 0 }}
            style={styles.keyboardStickyView}
          >
            <SrpWordSuggestions
              currentInputWord={currentInputWord}
              onSuggestionSelect={(word) => {
                srpInputGridRef.current?.handleSuggestionSelect(word);
              }}
            />
          </KeyboardStickyView>
        )}
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );

  return <KeyboardProvider>{content}</KeyboardProvider>;
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
   * Action to save onboarding event
   */
  saveOnboardingEvent: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Action to save onboarding event
   */
};

const mapDispatchToProps = (dispatch) => ({
  setLockTime: (time) => dispatch(setLockTime(time)),
  passwordSet: () => dispatch(passwordSet()),
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(
  null,
  mapDispatchToProps,
)(ImportFromSecretRecoveryPhrase);
