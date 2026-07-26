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
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, useDispatch, useSelector } from 'react-redux';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { isTestEnvironment } from '../../../util/test/utils';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { QRTabSwitcherScreens } from '../../../components/Views/QRTabSwitcher';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import Routes from '../../../constants/navigation/Routes';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon as DSIcon,
  IconName as DSIconName,
  IconSize as DSIconSize,
  IconColor as DSIconColor,
  Text,
  TextArea,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Authentication } from '../../../core';
import Engine from '../../../core/Engine';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { passcodeType } from '../../../util/authentication';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { CommonActions } from '@react-navigation/native';
import { SRP_LENGTHS, SPACE_CHAR, PASSCODE_NOT_SET_ERROR } from './constant';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
} from '../../../util/trace';
import { selectAddDeviceSyncEnabled } from '../../../selectors/featureFlagController/addDeviceSync';
import {
  selectQrSyncImportMnemonic,
  selectQrSyncNeedsProvisioning,
  selectQrSyncPrimaryMnemonic,
} from '../../../selectors/qrSyncController';
import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { finalizeOnboardingCompletion } from '../../../util/onboarding/finalizeOnboardingCompletion';

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
  const isQrSyncImport = Boolean(route?.params?.qrSyncImport);
  const qrSyncPrimaryMnemonic = useSelector(selectQrSyncPrimaryMnemonic);
  const qrSyncImportMnemonic = useSelector(selectQrSyncImportMnemonic);
  const qrSyncMnemonic = qrSyncImportMnemonic ?? qrSyncPrimaryMnemonic;
  const walletSetupCompletedAttributionProps = useSelector(
    selectWalletSetupCompletedAttributionAnalyticsProps,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const needsQrProvisioning = useSelector(selectQrSyncNeedsProvisioning);
  const dispatch = useDispatch();
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();
  const isAddDeviceSyncEnabled = useSelector(selectAddDeviceSyncEnabled);

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
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);
  const [showPasswordWarning, setShowPasswordWarning] = useState(false);

  const passwordWarningSheetRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const goToDefaultSettings = useCallback(() => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  }, [navigation]);

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

  useEffect(() => {
    if (isQrSyncImport && qrSyncMnemonic) {
      setSeedPhrase(qrSyncMnemonic.split(SPACE_CHAR));
      setCurrentStep(1);
    }
  }, [isQrSyncImport, qrSyncMnemonic]);

  const { isEnabled: isMetricsEnabled } = useAnalytics();

  const track = (event, properties) => {
    const eventBuilder = AnalyticsEventBuilder.createEventBuilder(event);
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
          setSeedPhrase(seed.trim().split(/\s+/));
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

  const handleSrpTextChange = useCallback((text) => {
    // Keep the seed phrase as a word array so existing validation keeps working.
    setSeedPhrase(text.split(SPACE_CHAR));
  }, []);

  const handlePasteSrp = useCallback(async () => {
    const clipboard = await Clipboard.getString();
    if (clipboard) {
      setSeedPhrase(clipboard.trim().split(/\s+/));
    }
  }, []);

  const animateToStep = useCallback(
    (nextStep) => {
      if (isTestEnvironment) {
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
    if (isQrSyncImport) {
      Engine.context.QrSyncController.resetState();
    }
    if (currentStep === 0 || (isQrSyncImport && currentStep === 1)) {
      navigation.goBack();
    } else {
      animateToStep(currentStep - 1);
    }
  };

  // The header is rendered in-screen, so hide the native one.
  const updateNavBar = () => {
    navigation.setOptions({ headerShown: false });
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
    const onboardingTraceCtx = route?.params?.onboardingTraceCtx;
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
      password.length < MIN_PASSWORD_LENGTH,
    [password, confirmPassword],
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
        const onboardingTraceCtx = route?.params?.onboardingTraceCtx;
        const oauthLoginSuccess = route?.params?.oauthLoginSuccess || false;
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
          isQrSyncImport,
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
          account_type: AccountType.Imported,
          ...walletSetupCompletedAttributionProps,
        });

        fetchAccountsWithActivity();
        endTrace({ name: TraceName.OnboardingSRPAccountImportTime });
        endTrace({ name: TraceName.OnboardingExistingSrpImport });
        endTrace({ name: TraceName.OnboardingJourneyOverall });

        if (isMetricsEnabled()) {
          finalizeOnboardingCompletion({
            successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
            accountType: AccountType.Imported,
            isBasicFunctionalityEnabled,
            walletSetupAttributionProps: walletSetupCompletedAttributionProps,
            dispatch,
            discoverAccountsLogContext: 'ImportFromSecretRecoveryPhrase',
            needsQrProvisioning,
          });
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
            }),
          );
        } else {
          navigation.navigate('OptinMetrics', {
            accountType: AccountType.Imported,
            successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
          });
        }
      } catch (error) {
        setLoading(false);

        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: error.toString(),
        });

        const onboardingTraceCtx = route?.params?.onboardingTraceCtx;
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
    password !== '' &&
    confirmPassword.length >= MIN_PASSWORD_LENGTH &&
    password !== confirmPassword;

  const dismissPasswordWarning = (cb) =>
    passwordWarningSheetRef.current?.onCloseBottomSheet(cb);

  const onConfirmPasswordWarning = () => {
    dismissPasswordWarning(() => {
      setShowPasswordWarning(false);
      onPressImport();
    });
  };

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView edges={['top']} style={tw.style('px-4 pt-2')}>
        <ButtonIcon
          iconName={DSIconName.ArrowLeft}
          size={ButtonIconSize.Sm}
          iconProps={{ color: DSIconColor.IconDefault }}
          onPress={onBackPress}
          accessibilityLabel={strings('navigation.back')}
          testID={ImportFromSeedSelectorsIDs.BACK_BUTTON_ID}
          twClassName="bg-section rounded-full w-10 h-10"
        />
      </SafeAreaView>
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style('flex-grow px-4')}
        testID={ImportFromSeedSelectorsIDs.CONTAINER_ID}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        enabled
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
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
                twClassName="mt-4"
                testID={ImportFromSeedSelectorsIDs.SCREEN_TITLE_ID}
              >
                {strings('import_from_seed.title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-1"
              >
                {strings('import_from_seed.enter_your_secret_recovery_phrase')}
              </Text>

              <Box twClassName="mt-4">
                <TextArea
                  value={seedPhrase.join(SPACE_CHAR)}
                  onChangeText={handleSrpTextChange}
                  placeholder={strings(
                    'import_from_seed.srp_placeholder_short',
                  )}
                  isError={Boolean(error)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  twClassName="rounded-xl min-h-[140px]"
                  testID={ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}
                />
              </Box>

              {error ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="mt-2"
                >
                  {error}
                </Text>
              ) : (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Start}
                  twClassName="gap-2 mt-2"
                >
                  <DSIcon
                    name={DSIconName.Info}
                    size={DSIconSize.Sm}
                    color={DSIconColor.IconMuted}
                    twClassName="mt-0.5"
                  />
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="flex-1"
                  >
                    {strings('import_from_seed.srp_footnote')}
                  </Text>
                </Box>
              )}

              {isAddDeviceSyncEnabled && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(Routes.ONBOARDING.ADD_DEVICE_TO_WALLET)
                  }
                  style={tw.style('flex-row items-center gap-3 mt-6 py-3')}
                  testID={
                    ImportFromSeedSelectorsIDs.IMPORT_FROM_EXTENSION_LINK_ID
                  }
                >
                  <Box twClassName="w-10 h-10 rounded-full bg-section items-center justify-center">
                    <DSIcon
                      name={DSIconName.Monitor}
                      size={DSIconSize.Md}
                      color={DSIconColor.IconDefault}
                    />
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    twClassName="flex-1"
                  >
                    {strings('import_from_seed.import_from_extension_row')}
                  </Text>
                  <DSIcon
                    name={DSIconName.ArrowRight}
                    size={DSIconSize.Md}
                    color={DSIconColor.IconMuted}
                  />
                </TouchableOpacity>
              )}
            </>
          )}

          {currentStep === 1 && (
            <Box twClassName="gap-y-6 flex-grow">
              <Box twClassName="gap-y-1">
                <Text
                  variant={TextVariant.HeadingLg}
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

              <Box twClassName="relative gap-2">
                <TextField
                  placeholder={strings(
                    'import_from_seed.new_password_placeholder',
                  )}
                  value={password}
                  onChangeText={onPasswordChange}
                  onFocus={() => setIsPasswordFieldFocused(true)}
                  onBlur={() => setIsPasswordFieldFocused(false)}
                  secureTextEntry={showPasswordIndex.includes(0)}
                  returnKeyType="next"
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
                  accessibilityLabel={
                    ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID
                  }
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

              <Box twClassName="relative gap-2">
                <TextField
                  ref={confirmPasswordInput}
                  placeholder={strings(
                    'import_from_seed.confirm_password_placeholder',
                  )}
                  onChangeText={onPasswordConfirmChange}
                  secureTextEntry={showPasswordIndex.includes(1)}
                  autoComplete="new-password"
                  returnKeyType="done"
                  autoCapitalize="none"
                  value={confirmPassword}
                  isError={isError}
                  keyboardAppearance={themeAppearance || 'light'}
                  onSubmitEditing={Keyboard.dismiss}
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
                  accessibilityLabel={
                    ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                  }
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
            </Box>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
      {currentStep === 1 && (
        <SafeAreaView
          edges={['bottom']}
          style={tw.style(
            'px-4 w-full gap-y-4',
            Platform.OS === 'android' ? 'mb-6' : 'mb-4',
          )}
        >
          <Button
            isLoading={loading}
            isFullWidth
            variant={ButtonVariant.Primary}
            onPress={() => {
              Keyboard.dismiss();
              setShowPasswordWarning(true);
            }}
            size={ButtonSize.Lg}
            isDisabled={isContinueButtonDisabled}
            testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
          >
            {strings('import_from_seed.import_create_password_cta')}
          </Button>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('privacy_policy.settings')}{' '}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryDefault}
              onPress={goToDefaultSettings}
            >
              {strings('privacy_policy.settings_link')}
            </Text>
          </Text>
        </SafeAreaView>
      )}
      {currentStep === 0 && (
        <SafeAreaView
          edges={['bottom']}
          style={tw.style('px-4 py-4 bg-default')}
        >
          <Button
            variant={ButtonVariant.Primary}
            onPress={handleContinueImportFlow}
            isFullWidth
            size={ButtonSize.Lg}
            isDisabled={isSRPContinueButtonDisabled}
            testID={ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID}
          >
            {strings('import_from_seed.continue')}
          </Button>
        </SafeAreaView>
      )}
      {currentStep === 0 && isKeyboardVisible && (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={tw.style('absolute bottom-0 left-0 right-0')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="bg-default border-t border-muted px-4 py-2"
          >
            <TouchableOpacity
              onPress={handlePasteSrp}
              accessibilityLabel={strings('import_from_seed.paste')}
              style={tw.style(
                'flex-row items-center gap-2 h-9 px-3 rounded-full bg-section',
              )}
            >
              <DSIcon
                name={DSIconName.Copy}
                size={DSIconSize.Sm}
                color={DSIconColor.IconDefault}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('import_from_seed.paste')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onQrCodePress}
              accessibilityLabel={strings('import_from_seed.scan_qr')}
              testID={ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID}
              style={tw.style(
                'flex-row items-center gap-2 h-9 px-3 rounded-full bg-section',
              )}
            >
              <DSIcon
                name={DSIconName.ScanBarcode}
                size={DSIconSize.Sm}
                color={DSIconColor.IconDefault}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('import_from_seed.scan_qr')}
              </Text>
            </TouchableOpacity>
          </Box>
        </KeyboardStickyView>
      )}
      {showPasswordWarning && (
        <BottomSheet
          ref={passwordWarningSheetRef}
          onClose={() => setShowPasswordWarning(false)}
        >
          <Box twClassName="items-center gap-4 px-4 py-2">
            <Icon
              name={IconName.Danger}
              size={IconSize.Xl}
              color={IconColor.Error}
            />
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              twClassName="text-center"
            >
              {strings('import_from_seed.password_warning_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('import_from_seed.password_warning_desc_1')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('import_from_seed.password_warning_desc_bold')}
              </Text>{' '}
              {strings('import_from_seed.password_warning_desc_2')}
            </Text>
            <Box twClassName="w-full gap-3 mt-2">
              <Button
                isFullWidth
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={onConfirmPasswordWarning}
              >
                {strings('import_from_seed.i_understand')}
              </Button>
              <Button
                isFullWidth
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={() => dismissPasswordWarning()}
              >
                {strings('login.cancel')}
              </Button>
            </Box>
          </Box>
        </BottomSheet>
      )}
      <ScreenshotDeterrent enabled isSRP />
    </Box>
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
   * Action to save onboarding event
   */
  saveOnboardingEvent: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
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
