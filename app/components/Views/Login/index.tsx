import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from 'react';
import {
  Alert,
  BackHandler,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  TextField,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { ThemeContext } from '../../../util/theme';
import { TextVariant as DSTextVariant } from '../../../component-library/components/Texts/Text';
import {
  KeyboardController,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import { colors as importedColors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { DeviceAuthenticationButton } from '../../UI/DeviceAuthenticationButton';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from './LoginView.testIds';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  endTrace,
} from '../../../util/trace';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import {
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';
import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import ReduxService from '../../../core/redux';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import { useOnboardingLoadingStallTracker } from '../../../util/onboarding/hooks/useOnboardingLoadingStallTracker';
import { ONBOARDING_LOADING_STALL_SCREEN } from '../../../util/onboarding/onboardingLoadingStallTracking';
import OnboardingLoginCanvas from '../../UI/OnboardingAnimation/OnboardingLoginCanvas';
import Device from '../../../util/device';
import { hasTestOverrides } from '../../../util/test/utils';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { SeedlessOnboardingControllerError } from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import useAuthCapabilities from '../../../core/Authentication/hooks/useAuthCapabilities';
import {
  isAndroidKeychainBiometricLockout,
  isBiometricUnlockCancelledByUser,
} from '../../../core/Authentication/utils';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import {
  getLoginInteractionEndData,
  getLoginPerformanceTags,
  markLoginInteractionCompleted,
} from './loginPerformanceTags';
import {
  cancelUnlockTraces,
  startUnlockTraces,
  type UnlockTraceTokens,
} from '../../../core/Performance/unlockTraces';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import {
  getLoginUnlockFailureErrorType,
  trackAppUnlocked,
  trackAppUnlockedFailed,
  UNLOCK_TYPE,
  type UnlockType,
} from './loginUnlockAnalytics';

/** Returns true if `candidatePassword` decrypts the on-device vault backup. */
const canDecryptVaultBackup = async (
  candidatePassword: string,
): Promise<boolean> => {
  const backupResult = await getVaultFromBackup();
  if (!backupResult.vault) {
    return false;
  }
  const vaultSeed = await parseVaultValue(
    candidatePassword,
    backupResult.vault,
  );
  return Boolean(vaultSeed);
};

interface LoginRouteParams {
  locked: boolean;
}

interface LoginProps {
  saveOnboardingEvent: (event: AnalyticsTrackingEvent) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const fieldRef = useRef<TextInput | null>(null);
  const lastSubmittedPasswordRef = useRef('');
  const isProcessingForgotPassword = useRef(false);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    undefined | 'Start' | 'Loader'
  >(undefined);

  useOnboardingLoadingStallTracker({
    isLoading: loading,
    screen: ONBOARDING_LOADING_STALL_SCREEN.LOGIN,
    saveOnboardingEvent,
  });

  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const tw = useTailwind();
  const { colors, themeAppearance } = useContext(ThemeContext);
  const canvasColor =
    themeAppearance === 'dark'
      ? colors.background.default
      : importedColors.gettingStartedPageBackgroundColorLightMode;

  const {
    unlockWallet,
    lockApp,
    getAuthType,
    checkIsSeedlessPasswordOutdated,
  } = useAuthentication();
  const { capabilities } = useAuthCapabilities();
  const isLocked = Boolean(route.params?.locked);
  const loginPerformanceTags = useRef(getLoginPerformanceTags(isLocked));

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
      tags: loginPerformanceTags.current,
    });
    trackOnboarding(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, saveOnboardingEvent);
  }, [saveOnboardingEvent]);

  const handleStartFoxAnimation = useCallback(() => {
    setStartFoxAnimation('Start');
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        void lockApp({ reset: false });
        return false;
      },
    );
    return () => {
      subscription.remove();
    };
  }, [lockApp]);

  useEffect(() => {
    if (Platform.OS === 'android' && !hasTestOverrides) {
      KeyboardController.setInputMode(
        AndroidSoftInputModes.SOFT_INPUT_ADJUST_PAN,
      );

      return () => {
        KeyboardController.setDefaultMode();
      };
    }
  }, []);

  const handleVaultCorruption = useCallback(async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    // Track vault corruption handling attempt
    trackVaultCorruption(VAULT_ERROR, {
      error_type: 'vault_corruption_handling',
      context: 'vault_corruption_recovery_attempt',
      oauth_login: false,
    });

    const failVaultCorruptionRecovery = (e: unknown) => {
      trackVaultCorruption((e as Error).message, {
        error_type: 'vault_corruption_handling_failed',
        context: 'vault_corruption_recovery_failed',
        oauth_login: false,
      });
      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    };

    // No need to check password requirements here, it will be checked in onLogin
    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
          navigation.dispatch(
            StackActions.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            ),
          );
          setLoading(false);
          setError(null);
          return;
        }
        failVaultCorruptionRecovery(
          new Error(`${LOGIN_VAULT_CORRUPTION_TAG} Invalid Password`),
        );
        return;
      }
      if (backupResult.error) {
        failVaultCorruptionRecovery(
          new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${backupResult.error}`),
        );
      }
    } catch (e: unknown) {
      failVaultCorruptionRecovery(e);
    }
  }, [password, navigation]);

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    void trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  const handleLoginError = useCallback(
    async (loginError: Error, unlockType: UnlockType) => {
      // Prioritize message property over toString for error handling
      const loginErrorMessage = loginError.message || loginError.toString();

      trackAppUnlockedFailed({
        unlockType,
        reason: getLoginUnlockFailureErrorType(loginError),
        saveOnboardingEvent,
      });

      const isWrongPasswordError =
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError) {
        handlePasswordError(loginErrorMessage);
        return;
      }

      const isBiometricCancellation =
        isBiometricUnlockCancelledByUser(loginError);

      if (isBiometricCancellation) {
        setLoading(false);
        return;
      }

      if (isAndroidKeychainBiometricLockout(loginError)) {
        setError(strings('login.biometric_too_many_attempts'));
        setLoading(false);
        return;
      }

      const isVaultCorruption =
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN);

      const isSeedlessOnboardingControllerError =
        loginError instanceof SeedlessOnboardingControllerError ||
        containsErrorMessage(loginError, 'SeedlessOnboardingController');

      if (containsErrorMessage(loginError, PASSCODE_NOT_SET_ERROR)) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else if (isVaultCorruption) {
        trackVaultCorruption(loginErrorMessage, {
          error_type: containsErrorMessage(loginError, VAULT_ERROR)
            ? 'vault_error'
            : 'json_parse_error',
          context: 'login_authentication',
          oauth_login: false,
        });
        await handleVaultCorruption();
      } else if (isSeedlessOnboardingControllerError) {
        // Detected seedless onboarding error. Defer to OAuthRehydration screen to handle subsequent log in attempts.
        navigation.dispatch(
          StackActions.replace(Routes.ONBOARDING.REHYDRATE, {
            isSeedlessPasswordOutdated: true,
          }),
        );
      } else {
        setError(loginErrorMessage);
      }

      setLoading(false);
      Logger.error(loginError, 'Failed to unlock');
    },
    [
      handlePasswordError,
      handleVaultCorruption,
      navigation,
      saveOnboardingEvent,
    ],
  );

  const unlockWithPassword = useCallback(async () => {
    if (loading) return;

    lastSubmittedPasswordRef.current = password;
    fieldRef.current?.clear();
    setPassword('');
    setLoading(true);
    setError(null);

    const unlockTraceTokens: UnlockTraceTokens = startUnlockTraces({
      appStartType: loginPerformanceTags.current.app_start_type,
    });
    endTrace({
      name: TraceName.LoginUserInteraction,
      data: getLoginInteractionEndData(),
    });
    markLoginInteractionCompleted();

    try {
      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
          tags: loginPerformanceTags.current,
        },
        async () => {
          const isSeedlessPasswordOutdated =
            await checkIsSeedlessPasswordOutdated({
              skipCache: false,
              captureSentryError: true,
            });
          await unlockWallet({ password });
          lastSubmittedPasswordRef.current = '';
          if (isSeedlessPasswordOutdated) {
            const authData = await getAuthType();
            if (
              authData.currentAuthType === AUTHENTICATION_TYPE.PASSWORD &&
              authData.availableBiometryType
            ) {
              Alert.alert(
                strings('login.biometric_authentication_cancelled_title'),
                strings('login.biometric_authentication_cancelled_description'),
                [
                  {
                    text: strings(
                      'login.biometric_authentication_cancelled_button',
                    ),
                  },
                ],
              );
            }
          }
        },
      );
      trackAppUnlocked({
        unlockType: UNLOCK_TYPE.PASSWORD,
        saveOnboardingEvent,
      });
    } catch (loginErr) {
      cancelUnlockTraces(unlockTraceTokens);
      await handleLoginError(loginErr as Error, UNLOCK_TYPE.PASSWORD);
    }
    setLoading(false);
  }, [
    password,
    loading,
    handleLoginError,
    unlockWallet,
    getAuthType,
    checkIsSeedlessPasswordOutdated,
    saveOnboardingEvent,
  ]);

  const unlockWithDeviceAuthentication = useCallback(async () => {
    if (loading) return;

    fieldRef.current?.blur();
    fieldRef.current?.clear();
    setPassword('');
    setLoading(true);
    setError(null);

    const unlockTraceTokens: UnlockTraceTokens = startUnlockTraces({
      appStartType: loginPerformanceTags.current.app_start_type,
    });
    endTrace({
      name: TraceName.LoginUserInteraction,
      data: getLoginInteractionEndData(),
    });
    markLoginInteractionCompleted();

    try {
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
          tags: loginPerformanceTags.current,
        },
        async () => {
          await unlockWallet();
        },
      );
      trackAppUnlocked({
        unlockType: UNLOCK_TYPE.BIOMETRIC,
        saveOnboardingEvent,
      });
    } catch (loginerror) {
      cancelUnlockTraces(unlockTraceTokens);
      await handleLoginError(loginerror as Error, UNLOCK_TYPE.BIOMETRIC);
    }
    setLoading(false);
  }, [unlockWallet, loading, handleLoginError, saveOnboardingEvent]);

  const toggleWarningModal = async () => {
    if (isProcessingForgotPassword.current) {
      return;
    }
    isProcessingForgotPassword.current = true;

    trackOnboarding(
      MetaMetricsEvents.FORGOT_PASSWORD_CLICKED,
      saveOnboardingEvent,
    );

    // Use the last submitted password.
    const submittedPassword = lastSubmittedPasswordRef.current;
    lastSubmittedPasswordRef.current = '';

    try {
      const isSeedlessLogin = selectSeedlessOnboardingLoginFlow(
        ReduxService.store.getState(),
      );

      if (isSeedlessLogin) {
        const isPasswordOutdated = await checkIsSeedlessPasswordOutdated({
          skipCache: true,
          captureSentryError: true,
        });

        let localBackupDecrypts = false;
        if (submittedPassword) {
          try {
            localBackupDecrypts =
              await canDecryptVaultBackup(submittedPassword);
          } catch (e: unknown) {
            Logger.error(
              e as Error,
              'Login/ toggleWarningModal: seedless vault backup check failed',
            );
          }
        }

        if (isPasswordOutdated || localBackupDecrypts) {
          Logger.error(
            new Error(
              'Forgot password: seedless local vault may be out of sync with server',
            ),
            {
              tags: {
                feature: 'account_access',
              },
              context: {
                name: 'ForgotPasswordSeedlessDesync',
                data: {
                  password_outdated: isPasswordOutdated,
                  local_backup_decrypts: localBackupDecrypts,
                  unlock_attempted: Boolean(submittedPassword),
                },
              },
            },
          );
        }
      } else if (submittedPassword) {
        const backupDecrypts = await canDecryptVaultBackup(submittedPassword);
        if (backupDecrypts) {
          Logger.error(
            new Error(
              'Forgot password: submitted password decrypts on-device vault backup',
            ),
            {
              tags: {
                feature: 'account_access',
              },
              context: {
                name: 'ForgotPasswordVaultMismatch',
                data: {
                  local_backup_decrypts: true,
                  unlock_attempted: true,
                },
              },
            },
          );
        }
      }
    } catch (e: unknown) {
      Logger.error(
        e as Error,
        'Login/ toggleWarningModal: vault backup check failed',
      );
    } finally {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
      });
      isProcessingForgotPassword.current = false;
    }
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    trackOnboarding(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, saveOnboardingEvent);
    void downloadStateLogs(fullState, false);
  };

  const isDeviceAuthenticationAvailable =
    capabilities?.authType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
    capabilities?.authType === AUTHENTICATION_TYPE.BIOMETRIC ||
    capabilities?.authType === AUTHENTICATION_TYPE.PASSCODE;
  const shouldHideDeviceAuthenticationButton =
    route?.params?.locked || !isDeviceAuthenticationAvailable;

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  const renderWordmark = (wordmark: React.ReactElement) => (
    <TouchableOpacity
      testID={LoginViewSelectors.DOWNLOAD_LOGS_BUTTON}
      delayLongPress={10 * 1000}
      onLongPress={handleDownloadStateLogs}
      activeOpacity={1}
    >
      {wordmark}
    </TouchableOpacity>
  );

  const ctaSize = Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg;

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <OnboardingLoginCanvas
        canvasColor={canvasColor}
        containerTestID={LoginViewSelectors.CONTAINER}
        startFoxAnimation={startFoxAnimation}
        setStartFoxAnimation={handleStartFoxAnimation}
        renderWordmark={renderWordmark}
        showScreenshotDeterrent
      >
        <Box flexDirection={BoxFlexDirection.Column} gap={2}>
          <TextField
            placeholder={strings('login.password_placeholder')}
            inputRef={fieldRef}
            onChangeText={handlePasswordChange}
            value={password}
            endAccessory={
              capabilities ? (
                <DeviceAuthenticationButton
                  disabled={loading}
                  onPress={unlockWithDeviceAuthentication}
                  hidden={shouldHideDeviceAuthenticationButton}
                  iconName={capabilities.authIcon}
                />
              ) : null
            }
            isError={!!error}
            isDisabled={loading}
            inputProps={{
              testID: LoginViewSelectors.PASSWORD_INPUT,
              accessibilityLabel: LoginViewSelectors.PASSWORD_INPUT,
              returnKeyType: 'done',
              autoCapitalize: 'none',
              secureTextEntry: true,
              onSubmitEditing: unlockWithPassword,
              keyboardAppearance: themeAppearance,
            }}
          />
          {!!error && (
            <HelpText
              severity={HelpTextSeverity.Error}
              variant={DSTextVariant.BodyMD}
              testID={LoginViewSelectors.PASSWORD_ERROR}
            >
              {error}
            </HelpText>
          )}
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          size={ctaSize}
          onPress={unlockWithPassword}
          isDisabled={password.length === 0 || loading}
          testID={LoginViewSelectors.LOGIN_BUTTON_ID}
          isLoading={loading}
          isFullWidth
        >
          {strings('login.unlock_button')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ctaSize}
          onPress={toggleWarningModal}
          isDisabled={loading}
          testID={LoginViewSelectors.RESET_WALLET}
          isFullWidth
        >
          {strings('login.forgot_password')}
        </Button>
      </OnboardingLoginCanvas>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (event: AnalyticsTrackingEvent) =>
    dispatch(saveEvent([event])),
});

export default connect(null, mapDispatchToProps)(Login);
