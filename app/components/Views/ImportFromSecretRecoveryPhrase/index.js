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
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
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
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
  parseSeedPhrase,
  parseVaultValue,
} from '../../../util/validators';
import { captureException } from '@sentry/react-native';
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
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import {
  TextVariant as LegacyTextVariant,
  TextColor as LegacyTextColor,
} from '../../../component-library/components/Texts/Text/Text.types';
import { CommonActions } from '@react-navigation/native';
import { SRP_LENGTHS, SPACE_CHAR, PASSCODE_NOT_SET_ERROR } from './constant';
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
  const tw = useTailwind();

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
        style={tw.style('ml-4')}
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
          style={tw.style('mr-4')}
        />
      </TouchableOpacity>
    ) : (
      <Box />
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

        // Ask user to allow biometrics access control
        authData.currentAuthType =
          await Authentication.requestBiometricsAccessControlForIOS(
            authData.currentAuthType,
          );

        await Authentication.newWalletAndRestore(
          password,
          authData,
          parsedSeed,
          true,
        );

        setBiometryType(authData.availableBiometryType);
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
        setLoading(false);

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

        if (error.toString() === PASSCODE_NOT_SET_ERROR) {
          Alert.alert(
            'Security Alert',
            'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)',
          );
          return;
        }

        // For errors, report to Sentry if metrics enabled and navigate to error screen
        const metricsEnabled = isMetricsEnabled();

        if (metricsEnabled) {
          captureException(error, {
            tags: {
              view: 'ImportFromSecretRecoveryPhrase',
              context: 'Wallet import failed - auto reported',
            },
          });
        }

        // Navigate to error screen based on metrics consent
        navigation.reset({
          routes: [
            {
              name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
              params: {
                metricsEnabled,
                error,
              },
            },
          ],
        });
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
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style('flex-grow px-4')}
        testID={ImportFromSeedSelectorsIDs.CONTAINER_ID}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        enabled={currentStep === 0}
      >
        <Animated.View
          style={[
            tw.style('flex-1'),
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {currentStep === 0 && (
            <>
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
                testID={ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID}
              >
                {strings('import_from_seed.title')}
              </Text>
              <Box twClassName="mt-1.5">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
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
                </Box>
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
              </Box>
            </>
          )}

          {currentStep === 1 && (
            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="gap-y-4 flex-grow"
            >
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="gap-y-1"
              >
                <Text
                  variant={TextVariant.DisplayMd}
                  color={TextColor.TextDefault}
                  testID={ChoosePasswordSelectorsIDs.TITLE_ID}
                >
                  {strings('import_from_seed.metamask_password')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  testID={ChoosePasswordSelectorsIDs.DESCRIPTION_ID}
                >
                  {strings('import_from_seed.metamask_password_description')}
                </Text>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="relative gap-2"
              >
                <Label
                  variant={LegacyTextVariant.BodyMDMedium}
                  color={LegacyTextColor.Default}
                  style={tw.style('-mb-1')}
                >
                  {strings('import_from_seed.create_new_password')}
                </Label>
                <TextField
                  value={password}
                  onChangeText={onPasswordChange}
                  onFocus={() => setIsPasswordFieldFocused(true)}
                  onBlur={() => setIsPasswordFieldFocused(false)}
                  secureTextEntry={showPasswordIndex.includes(0)}
                  returnKeyType={'next'}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  keyboardAppearance={themeAppearance || 'light'}
                  onSubmitEditing={jumpToConfirmPassword}
                  isError={isPasswordTooShort}
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
                  variant={TextVariant.BodySm}
                  color={
                    isPasswordTooShort
                      ? TextColor.ErrorDefault
                      : TextColor.TextAlternative
                  }
                >
                  {strings('choose_password.must_be_at_least', {
                    number: MIN_PASSWORD_LENGTH,
                  })}
                </Text>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="relative gap-2"
              >
                <Label
                  variant={LegacyTextVariant.BodyMDMedium}
                  color={LegacyTextColor.Default}
                  style={tw.style('-mb-1')}
                >
                  {strings('import_from_seed.confirm_password')}
                </Label>
                <TextField
                  ref={confirmPasswordInput}
                  onChangeText={onPasswordConfirmChange}
                  secureTextEntry={showPasswordIndex.includes(1)}
                  autoComplete="new-password"
                  returnKeyType={'next'}
                  autoCapitalize="none"
                  value={confirmPassword}
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
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                  >
                    {strings('import_from_seed.password_error')}
                  </Text>
                )}
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Start}
                justifyContent={BoxJustifyContent.Start}
                twClassName="gap-2 mt-2 mb-4 bg-background-section rounded-lg p-4"
              >
                <Checkbox
                  onPress={() => setLearnMore(!learnMore)}
                  isChecked={learnMore}
                  style={tw.style('items-start')}
                  testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                />
                <Button
                  variant={ButtonVariants.Link}
                  onPress={() => setLearnMore(!learnMore)}
                  style={tw.style(
                    'flex-row items-start justify-start gap-px flex-wrap w-[90%] -mt-1.5',
                  )}
                  testID={ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID}
                  label={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                    >
                      {strings('import_from_seed.learn_more')}
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.PrimaryDefault}
                        onPress={learnMoreLink}
                        testID={ImportFromSeedSelectorsIDs.LEARN_MORE_LINK_ID}
                      >
                        {' ' + strings('reset_password.learn_more')}
                      </Text>
                    </Text>
                  }
                />
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                style={tw.style(
                  'w-full gap-y-4 mt-auto',
                  Platform.OS === 'android' ? 'mb-6' : 'mb-4',
                )}
              >
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
              </Box>
            </Box>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
      {currentStep === 0 && (
        <Box twClassName="px-4 py-4 bg-default">
          <Button
            variant={ButtonVariants.Primary}
            label={strings('import_from_seed.continue')}
            onPress={handleContinueImportFlow}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            isDisabled={isSRPContinueButtonDisabled}
            testID={ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID}
          />
        </Box>
      )}
      {isSrpWordSuggestionsEnabled &&
        currentStep === 0 &&
        isKeyboardVisible && (
          <KeyboardStickyView
            offset={{ closed: 0, opened: 0 }}
            style={tw.style('absolute bottom-0 left-0 right-0')}
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
