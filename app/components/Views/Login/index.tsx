import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Keyboard,
  View,
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStepUtil from '../../../actions/wizard';
import { setAllowLoginWithRememberMe as setAllowLoginWithRememberMeUtil } from '../../../actions/security';
import { useDispatch } from 'react-redux';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { BiometryButton } from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  PASSCODE_DISABLED,
  SEED_PHRASE_HINTS,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { toLowerCaseEquals } from '../../../util/general';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
// import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import {
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  PASSWORD_REQUIREMENTS_NOT_MET,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './styles';
import ReduxService from '../../../core/redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import OAuthService from '../../../core/OAuthService/OAuthService';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import ConcealingFox from '../../../animations/Concealing_Fox.json';
import SearchingFox from '../../../animations/Searching_Fox.json';
import LottieView from 'lottie-react-native';
import { RecoveryError as SeedlessOnboardingControllerRecoveryError } from '@metamask/seedless-onboarding-controller';

/**
 * View where returning users can authenticate
 */
const Login: React.FC = () => {
  const [disabledInput, setDisabledInput] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const fieldRef = useRef<TextInput>(null);
  const parentSpanRef = useRef(
    trace({
      name: TraceName.Login,
      op: TraceOperation.Login,
      tags: getTraceTags(store.getState()),
    }),
  );
  const [password, setPassword] = useState('');
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null
  >(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometryPreviouslyDisabled, setBiometryPreviouslyDisabled] =
    useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<
      RouteProp<
        { params: { locked: boolean; oauthLoginSuccess?: boolean } },
        'params'
      >
    >();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, {});
  const {
    trackEvent,
    createEventBuilder,
    ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
    isEnabled: isMetricsEnabled,
    ///: END:ONLY_INCLUDE_IF(seedless-onboarding)
  } = useMetrics();
  const dispatch = useDispatch();
  const setOnboardingWizardStep = (step: number) =>
    dispatch(setOnboardingWizardStepUtil(step));
  const setAllowLoginWithRememberMe = (enabled: boolean) =>
    setAllowLoginWithRememberMeUtil(enabled);

  const oauthLoginSuccess = route?.params?.oauthLoginSuccess ?? false;

  const handleBackPress = () => {
    if (!oauthLoginSuccess) {
      Authentication.lockApp();
    } else {
      navigation.goBack();
    }
    return false;
  };

  const getHint = async () => {
    const hint = await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    const parsedHints = await JSON.parse(hint);
    setHintText(parsedHints?.manualBackup || '');
  };

  const toggleHint = () => {
    setShowHint(!showHint);
    getHint();
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
      parentContext: parentSpanRef.current,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.LOGIN_SCREEN_VIEWED).build(),
    );

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    const getUserAuthPreferences = async () => {
      const authData = await Authentication.getType();

      //Setup UI to handle Biometric
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await StorageWrapper.getItem(
        PASSCODE_DISABLED,
      );

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setHasBiometricCredentials(!route?.params?.locked);
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
        setBiometryPreviouslyDisabled(!!passcodePreviouslyDisabled);
      } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
        setHasBiometricCredentials(false);
        setRememberMe(true);
        setAllowLoginWithRememberMe(true);
      } else if (authData.availableBiometryType) {
        Logger.log('authData', authData);
        setBiometryType(authData.availableBiometryType);
        setHasBiometricCredentials(
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC &&
            !route?.params?.locked,
        );
        setBiometryPreviouslyDisabled(!!previouslyDisabled);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    getUserAuthPreferences();

    getHint();

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVaultCorruption = async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    if (!passwordRequirementsMet(password)) {
      setError(strings('login.invalid_password'));
      return;
    }
    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
          // get authType
          const authData = await Authentication.componentAuthenticationType(
            biometryChoice,
            rememberMe,
          );
          try {
            await Authentication.storePassword(
              password,
              authData.currentAuthType,
            );
            navigation.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            );
            setLoading(false);
            setError(null);
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
    } catch (e: unknown) {
      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    }
  };

  const updateBiometryChoice = async (newBiometryChoice: boolean) => {
    await updateAuthTypeStorageFlags(newBiometryChoice);
    setBiometryChoice(newBiometryChoice);
  };

  const handleUseOtherMethod = () => {
    navigation.goBack();
    OAuthService.resetOauthState();
  };

  const tooManyAttemptsError = (remainingTime: number) => {
    if (remainingTime > 0) {
      setError(strings('login.too_many_attempts', { remainingTime }));
      timeoutRef.current = setTimeout(
        () => tooManyAttemptsError(remainingTime - 1),
        1000,
      );
      setDisabledInput(true);
    } else {
      setError('');
      setDisabledInput(false);
    }
  };

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleSeedlessOnboardingControllerError = (
    seedlessError: SeedlessOnboardingControllerRecoveryError,
  ) => {
    if (seedlessError.data?.remainingTime) {
      tooManyAttemptsError(seedlessError.data?.remainingTime);
    } else {
      const errMessage = seedlessError.message.replace(
        'SeedlessOnboardingController - ',
        '',
      );
      setError(errMessage);
    }
  };

  const onLogin = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });

    try {
      const locked = !passwordRequirementsMet(password);
      if (locked) {
        // This will be caught by the catch block below
        throw new Error(PASSWORD_REQUIREMENTS_NOT_MET);
      }
      if (loading || locked) return;

      setLoading(true);
      setError(null);
      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );

      ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
      if (oauthLoginSuccess) {
        await Authentication.rehydrateSeedPhrase(password, authType);
      } else {
        ///: END:ONLY_INCLUDE_IF(seedless-onboarding)
        await trace(
          {
            name: TraceName.AuthenticateUser,
            op: TraceOperation.Login,
            parentContext: parentSpanRef.current,
          },
          async () => {
            await Authentication.userEntryAuth(password, authType);
          },
        );

        ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
      }
      ///: END:ONLY_INCLUDE_IF(seedless-onboarding)

      Keyboard.dismiss();

      // Get onboarding wizard state
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);

      ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
      if (oauthLoginSuccess) {
        if (onboardingWizard) {
          setOnboardingWizardStep(1);
        }
        if (isMetricsEnabled()) {
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          });
        } else {
          navigation.navigate('OnboardingRootNav', {
            screen: 'OnboardingNav',
            params: {
              screen: 'OptinMetrics',
              params: {
                onContinue: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
                  });
                },
              },
            },
          });
        }
      } else {
        ///: END:ONLY_INCLUDE_IF(seedless-onboarding)
        // eslint-disable-next-line no-lonely-if
        if (onboardingWizard) {
          navigation.replace(Routes.ONBOARDING.HOME_NAV);
        } else {
          setOnboardingWizardStep(1);
          navigation.replace(Routes.ONBOARDING.HOME_NAV);
        }
        ///: BEGIN:ONLY_INCLUDE_IF(seedless-onboarding)
      }
      ///: END:ONLY_INCLUDE_IF(seedless-onboarding)

      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setPassword('');
      setLoading(false);
      setHasBiometricCredentials(false);
      fieldRef.current?.clear();
    } catch (loginErr: unknown) {
      const loginError = loginErr as Error;
      const loginErrorMessage = loginError.toString();
      if (
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID_2) ||
        loginErrorMessage.includes(PASSWORD_REQUIREMENTS_NOT_MET)
      ) {
        setLoading(false);
        setError(strings('login.invalid_password'));
        trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
        return;
      } else if (loginErrorMessage === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
        setLoading(false);
      } else if (
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        try {
          await handleVaultCorruption();
        } catch (vaultCorruptionErr: unknown) {
          const vaultCorruptionError = vaultCorruptionErr as Error;
          // we only want to display this error to the user IF we fail to handle vault corruption
          Logger.error(
            vaultCorruptionError,
            'Failed to handle vault corruption',
          );
          setLoading(false);
          setError(strings('login.clean_vault_error'));
        }
      } else if (toLowerCaseEquals(loginError, DENY_PIN_ERROR_ANDROID)) {
        setLoading(false);
        updateBiometryChoice(false);
      } else if (
        loginErr instanceof SeedlessOnboardingControllerRecoveryError
      ) {
        setLoading(false);
        handleSeedlessOnboardingControllerError(
          loginError as SeedlessOnboardingControllerRecoveryError,
        );
      } else {
        setLoading(false);
        setError(loginErrorMessage);
      }
      Logger.error(loginError, 'Failed to unlock');
    }
    endTrace({ name: TraceName.Login });
  };

  const tryBiometric = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });

    fieldRef.current?.blur();
    try {
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
          parentContext: parentSpanRef.current,
        },
        async () => {
          await Authentication.appTriggeredAuth();
        },
      );
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (!onboardingWizard) setOnboardingWizardStep(1);
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setLoading(true);
      setPassword('');
      setHasBiometricCredentials(false);
      fieldRef.current?.clear();
    } catch (tryBiometricError) {
      setHasBiometricCredentials(true);
      Logger.log(tryBiometricError);
    }
    fieldRef.current?.blur();
  };

  const toggleWarningModal = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  const shouldRenderBiometricLogin =
    biometryType && !biometryPreviouslyDisabled ? biometryType : null;

  const renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMeChoice: boolean) => {
      setRememberMe(rememberMeChoice);
    };

    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={shouldRenderBiometricLogin}
        biometryChoiceState={biometryChoice}
        onUpdateBiometryChoice={updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    trackEvent(
      createEventBuilder(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS).build(),
    );
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    !oauthLoginSuccess &&
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials
  );

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <Image
              source={METAMASK_NAME}
              style={styles.metamaskName}
              resizeMethod={'auto'}
            />

            <TouchableOpacity
              style={styles.foxWrapper}
              delayLongPress={10 * 1000} // 10 seconds
              onLongPress={handleDownloadStateLogs}
              activeOpacity={1}
            >
              <LottieView
                style={styles.image}
                autoPlay
                loop
                source={password.length > 0 ? ConcealingFox : SearchingFox}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <Text
              variant={TextVariant.DisplayMD}
              color={TextColor.Default}
              style={styles.title}
              testID={LoginViewSelectors.TITLE_ID}
            >
              {strings('login.title')}
            </Text>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings('login.password')}
                </Label>
                {hintText && (
                  <Button
                    variant={ButtonVariants.Link}
                    onPress={toggleHint}
                    testID={LoginViewSelectors.SHOW_HINT_BUTTON}
                    label={
                      showHint
                        ? strings('login.hide_hint')
                        : strings('login.show_hint')
                    }
                  />
                )}
              </View>
              <TextField
                size={TextFieldSize.Lg}
                placeholder={strings('login.password_placeholder')}
                placeholderTextColor={colors.text.muted}
                testID={LoginViewSelectors.PASSWORD_INPUT}
                returnKeyType={'done'}
                autoCapitalize="none"
                secureTextEntry
                ref={fieldRef}
                onChangeText={setPassword}
                value={password}
                onSubmitEditing={onLogin}
                endAccessory={
                  <BiometryButton
                    onPress={tryBiometric}
                    hidden={shouldHideBiometricAccessoryButton}
                    biometryType={biometryType as BIOMETRY_TYPE}
                  />
                }
                keyboardAppearance={themeAppearance}
                isDisabled={disabledInput}
              />
            </View>

            <View style={styles.helperTextContainer}>
              {showHint && (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.hintText}
                >
                  {strings('login.hint', { hint: hintText })}
                </Text>
              )}

              {!!error && (
                <HelpText
                  severity={HelpTextSeverity.Error}
                  variant={TextVariant.BodyMD}
                  testID={LoginViewSelectors.PASSWORD_ERROR}
                >
                  {error}
                </HelpText>
              )}
            </View>

            <View
              style={styles.ctaWrapper}
              testID={LoginViewSelectors.LOGIN_BUTTON_ID}
            >
              {renderSwitch()}

              <Button
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                onPress={onLogin}
                label={
                  loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('login.unlock_button')
                  )
                }
                isDisabled={password.length === 0 || disabledInput}
              />

              {!oauthLoginSuccess && (
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.reset_wallet')}
                />
              )}
            </View>

            {oauthLoginSuccess && (
              <View style={styles.footer}>
                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={handleUseOtherMethod}
                  testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
                  label={strings('login.other_methods')}
                />
              </View>
            )}
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default Login;
