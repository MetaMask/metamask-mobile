import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  SafeAreaView,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { colors as importedColors } from '../../../styles/common';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { setExistingUser } from '../../../actions/user';
import { connect, useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { BiometryButton } from '../../UI/BiometryButton';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { Authentication } from '../../../core';

import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
} from '../../../util/trace';
import Logger from '../../../util/Logger';
import {
  PASSWORD_REQUIREMENTS_NOT_MET,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
} from './constants';
import { toLowerCaseEquals } from '../../../util/general';
import { usePromptSeedlessRelogin } from '../../hooks/SeedlessHooks';
import { selectIsSeedlessPasswordOutdated } from '../../../selectors/seedlessOnboardingController';
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
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../hooks/useMetrics';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import FoxAnimation from '../../UI/FoxAnimation';
import OnboardingAnimation from '../../UI/OnboardingAnimation';
import { useUserAuthPreferences } from '../../hooks/useUserAuthPreferences';
import { usePasswordOutdated } from './hooks/usePasswordOutdated';
import { LoginErrorMessage } from './components/LoginErrorMessage';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';

const EmptyRecordConstant = {};

interface LoginRouteParams {
  locked: boolean;
  onboardingTraceCtx?: TraceContext;
  isVaultRecovery?: boolean;
}

interface LoginProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const [disabledInput] = useState(false);
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  // Login logic state (previously in useUnlockLogic hook)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startOnboardingAnimation, setStartOnboardingAnimation] =
    useState(false);
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    false | 'Start' | 'Loader'
  >(false);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);
  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  // coming from vault recovery flow flag
  const isComingFromVaultRecovery = route?.params?.isVaultRecovery ?? false;

  const { isDeletingInProgress } = usePromptSeedlessRelogin();
  const isSeedlessPasswordOutdated = useSelector(
    selectIsSeedlessPasswordOutdated,
  );

  const finalLoading = useMemo(
    () => loading || isDeletingInProgress,
    [loading, isDeletingInProgress],
  );

  const setStartFoxAnimationCallback = () => {
    setStartFoxAnimation('Start');
  };

  const track = (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number>,
  ) => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
      saveOnboardingEvent,
    );
  };

  const handleBackPress = () => {
    Authentication.lockApp();
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    setTimeout(() => {
      setStartOnboardingAnimation(true);
    }, 100);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onboardingTraceCtxFromRoute = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtxFromRoute) {
      passwordLoginAttemptTraceCtxRef.current = trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtxFromRoute,
      });
    }
  }, [route.params?.onboardingTraceCtx]);

  const {
    biometryType,
    rememberMe,
    setRememberMe,
    biometryChoice,
    hasBiometricCredentials,
    setHasBiometricCredentials,
    updateBiometryChoice,
  } = useUserAuthPreferences({
    locked: route?.params?.locked,
  });

  const isMountedRef = useRef(true);
  // Cleanup for isMountedRef tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- Login Logic Functions (previously in useUnlockLogic hook) ---

  const handleVaultCorruption = useCallback(async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    // Track vault corruption handling attempt
    trackVaultCorruption(VAULT_ERROR, {
      error_type: 'vault_corruption_handling',
      context: 'vault_corruption_recovery_attempt',
      oauth_login: false,
    });

    // No need to check password requirements here, it will be checked in onLogin
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
      // Track vault corruption handling failure
      trackVaultCorruption((e as Error).message, {
        error_type: 'vault_corruption_handling_failed',
        context: 'vault_corruption_recovery_failed',
        oauth_login: false,
      });

      Logger.error(e as Error);
      setLoading(false);

      setError(strings('login.invalid_password'));
    }
  }, [password, biometryChoice, rememberMe, navigation]);

  const navigateToHome = useCallback(async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  }, [navigation]);

  const checkMetricsUISeen = useCallback(async (): Promise<void> => {
    const isOptinMetaMetricsUISeen = await StorageWrapper.getItem(
      OPTIN_META_METRICS_UI_SEEN,
    );

    if (!isOptinMetaMetricsUISeen && !isMetricsEnabled()) {
      navigation.reset({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.OPTIN_METRICS,
              },
            },
          },
        ],
      });
    } else {
      navigateToHome();
    }
  }, [navigation, navigateToHome, isMetricsEnabled]);

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  const handleLoginError = useCallback(
    async (loginErr: unknown) => {
      const loginError = loginErr as Error;
      const loginErrorMessage = loginError.toString();

      const isWrongPasswordError =
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID_2);

      const isPasswordError =
        isWrongPasswordError ||
        loginErrorMessage.includes(PASSWORD_REQUIREMENTS_NOT_MET);

      if (isPasswordError) {
        handlePasswordError(loginErrorMessage);
        return;
      } else if (loginErrorMessage === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else if (
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        trackVaultCorruption(loginErrorMessage, {
          error_type: containsErrorMessage(loginError, VAULT_ERROR)
            ? 'vault_error'
            : 'json_parse_error',
          context: 'login_authentication',
          oauth_login: false,
        });

        await handleVaultCorruption();
      } else if (toLowerCaseEquals(loginErrorMessage, DENY_PIN_ERROR_ANDROID)) {
        updateBiometryChoice(false);
      } else {
        setError(loginErrorMessage);
      }

      setLoading(false);
      Logger.error(loginErr as Error, 'Failed to unlock');
    },
    [handlePasswordError, handleVaultCorruption, updateBiometryChoice],
  );

  const onLogin = useCallback(async () => {
    endTrace({ name: TraceName.LoginUserInteraction });

    try {
      const locked = !passwordRequirementsMet(password);
      if (locked) {
        throw new Error(PASSWORD_REQUIREMENTS_NOT_MET);
      }
      if (finalLoading || locked) return;

      setLoading(true);

      const authType = await Authentication.componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );

      // CRITICAL: Set existingUser = true after successful vault unlock from recovery
      // This prevents the vault recovery screen from appearing again on app restart
      // Only set after successful unlock to ensure vault is unlocked and credentials are stored
      if (isComingFromVaultRecovery) {
        dispatch(setExistingUser(true));
      }

      if (passwordLoginAttemptTraceCtxRef?.current) {
        endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
      endTrace({ name: TraceName.OnboardingExistingSocialLogin });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      await checkMetricsUISeen();

      setLoading(false);
      setError(null);
    } catch (loginErr: unknown) {
      await handleLoginError(loginErr);
    }
  }, [
    password,
    biometryChoice,
    rememberMe,
    finalLoading,
    handleLoginError,
    passwordLoginAttemptTraceCtxRef,
    checkMetricsUISeen,
    dispatch,
    isComingFromVaultRecovery,
  ]);

  const tryBiometric = useCallback(async () => {
    try {
      setLoading(true);
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.appTriggeredAuth();
        },
      );

      await checkMetricsUISeen();

      setLoading(false);
    } catch (tryBiometricError) {
      setLoading(false);
      Logger.log(tryBiometricError);
    }
  }, [checkMetricsUISeen]);

  usePasswordOutdated(setError);

  const toggleWarningModal = () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    track(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, {});
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    !isSeedlessPasswordOutdated &&
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials &&
    !route?.params?.locked
  );

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  const handleTryBiometric = async () => {
    fieldRef.current?.blur();
    await tryBiometric();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const handleLogin = async () => {
    await onLogin();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const shouldRenderBiometricLogin = biometryType;

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView
        style={[
          styles.mainWrapper,
          {
            backgroundColor:
              themeAppearance === 'dark'
                ? importedColors.gettingStartedTextColor
                : importedColors.gettingStartedPageBackgroundColorLightMode,
          },
        ]}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
          contentContainerStyle={styles.scrollContentContainer}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
          enableResetScrollToCoords={false}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <OnboardingAnimation
              startOnboardingAnimation={startOnboardingAnimation}
              setStartFoxAnimation={setStartFoxAnimationCallback}
            >
              <View style={styles.field}>
                <TextField
                  size={TextFieldSize.Lg}
                  placeholder={strings('login.password_placeholder')}
                  placeholderTextColor={colors.text.alternative}
                  testID={LoginViewSelectors.PASSWORD_INPUT}
                  returnKeyType={'done'}
                  autoCapitalize="none"
                  secureTextEntry
                  ref={fieldRef}
                  onChangeText={handlePasswordChange}
                  value={password}
                  onSubmitEditing={handleLogin}
                  endAccessory={
                    <BiometryButton
                      onPress={handleTryBiometric}
                      hidden={shouldHideBiometricAccessoryButton}
                      biometryType={biometryType as BIOMETRY_TYPE}
                    />
                  }
                  keyboardAppearance={themeAppearance || undefined}
                  isDisabled={disabledInput}
                  isError={!!error}
                  style={styles.textField}
                />
              </View>

              <LoginErrorMessage
                error={error}
                testID={LoginViewSelectors.PASSWORD_ERROR}
                style={styles.helperTextContainer}
              />

              <View style={styles.ctaWrapper} pointerEvents="box-none">
                <LoginOptionsSwitch
                  shouldRenderBiometricOption={shouldRenderBiometricLogin}
                  biometryChoiceState={biometryChoice}
                  onUpdateBiometryChoice={updateBiometryChoice}
                  onUpdateRememberMe={setRememberMe}
                />
                <Button
                  variant={ButtonVariants.Primary}
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  onPress={handleLogin}
                  label={strings('login.unlock_button')}
                  isDisabled={
                    password.length === 0 || disabledInput || finalLoading
                  }
                  testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                  loading={finalLoading}
                />

                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.forgot_password')}
                  isDisabled={finalLoading}
                  size={ButtonSize.Lg}
                />
              </View>
            </OnboardingAnimation>
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
        <TouchableOpacity
          style={styles.foxAnimationWrapper}
          delayLongPress={10 * 1000} // 10 seconds
          onLongPress={handleDownloadStateLogs}
          activeOpacity={1}
        >
          <FoxAnimation
            hasFooter={false}
            trigger={startFoxAnimation || undefined}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(Login);
