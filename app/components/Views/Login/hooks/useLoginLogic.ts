import { useState, useRef, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation , ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { captureException } from '@sentry/react-native';
import { strings } from '../../../../../locales/i18n';
import { Authentication } from '../../../../core';
import Logger from '../../../../util/Logger';
import { passwordRequirementsMet } from '../../../../util/password';
import { parseVaultValue } from '../../../../util/validators';
import { getVaultFromBackup } from '../../../../core/BackupVault';
import { containsErrorMessage } from '../../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import trackErrorAsAnalytics from '../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../../util/analytics/vaultCorruptionTracking';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
} from '../../../../util/trace';
import {
  PASSWORD_REQUIREMENTS_NOT_MET,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
} from '../constants';
import { createRestoreWalletNavDetailsNested } from '../../RestoreWallet/RestoreWallet';
import Routes from '../../../../constants/navigation/Routes';
import { toLowerCaseEquals } from '../../../../util/general';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../../core/Engine/controllers/seedless-onboarding-controller/error';
import { useNetInfo } from '@react-native-community/netinfo';
import { SuccessErrorSheetParams } from '../../SuccessErrorSheet/interface';
import { usePromptSeedlessRelogin } from '../../../hooks/SeedlessHooks';
import { selectIsSeedlessPasswordOutdated } from '../../../../selectors/seedlessOnboardingController';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useMetrics } from '../../../hooks/useMetrics';
import { updateAuthTypeStorageFlags } from '../../../../util/authentication';

interface UseLoginLogicParams {
  isOAuthRehydration: boolean;
  password: string;
  biometryChoice: boolean;
  rememberMe: boolean;
  rehydrationFailedAttempts?: number;
  setRehydrationFailedAttempts?: (attempts: number) => void;
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
  onLoginSuccess: () => Promise<void>;
  passwordLoginAttemptTraceCtxRef?: React.MutableRefObject<TraceContext | null>;
  onboardingTraceCtx?: TraceContext;
  setBiometryChoice: (choice: boolean) => void;
  setErrorToThrow?: (error: Error | null) => void;
}

export const useLoginLogic = ({
  isOAuthRehydration,
  password,
  biometryChoice,
  rememberMe,
  rehydrationFailedAttempts = 0,
  setRehydrationFailedAttempts,
  saveOnboardingEvent,
  onLoginSuccess,
  passwordLoginAttemptTraceCtxRef,
  onboardingTraceCtx,
  setBiometryChoice,
  setErrorToThrow,
}: UseLoginLogicParams) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledInput, setDisabledInput] = useState(false);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const { isEnabled: isMetricsEnabled } = useMetrics();
  const { isDeletingInProgress, promptSeedlessRelogin } =
    usePromptSeedlessRelogin();
  const isSeedlessPasswordOutdated = useSelector(
    selectIsSeedlessPasswordOutdated,
  );
  const netInfo = useNetInfo();
  const isMountedRef = useRef(true);

  const finalLoading = useMemo(
    () => loading || isDeletingInProgress,
    [loading, isDeletingInProgress],
  );

  const track = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | boolean | number>,
    ) => {
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  const updateBiometryChoice = useCallback(
    async (newBiometryChoice: boolean) => {
      await updateAuthTypeStorageFlags(newBiometryChoice);
      setBiometryChoice(newBiometryChoice);
    },
    [setBiometryChoice],
  );

  const tooManyAttemptsError = useCallback(
    async (initialRemainingTime: number) => {
      const lockEnd = Date.now() + initialRemainingTime * 1000;

      setDisabledInput(true);
      while (Date.now() < lockEnd) {
        const remainingTime = Math.floor((lockEnd - Date.now()) / 1000);
        if (remainingTime <= 0) {
          break;
        }

        if (!isMountedRef.current) {
          setError(null);
          setDisabledInput(false);
          return;
        }

        const remainingHours = Math.floor(remainingTime / 3600);
        const remainingMinutes = Math.floor((remainingTime % 3600) / 60);
        const remainingSeconds = remainingTime % 60;
        const displayRemainingTime = `${remainingHours}:${remainingMinutes
          .toString()
          .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        setError(
          strings('login.too_many_attempts', {
            remainingTime: displayRemainingTime,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (isMountedRef.current) {
        setError(null);
        setDisabledInput(false);
      }
    },
    [],
  );

  const handleVaultCorruption = useCallback(async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    trackVaultCorruption(VAULT_ERROR, {
      error_type: 'vault_corruption_handling',
      context: 'vault_corruption_recovery_attempt',
      oauth_login: isOAuthRehydration,
    });

    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
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
      trackVaultCorruption((e as Error).message, {
        error_type: 'vault_corruption_handling_failed',
        context: 'vault_corruption_recovery_failed',
        oauth_login: isOAuthRehydration,
      });

      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    }
  }, [password, biometryChoice, rememberMe, isOAuthRehydration, navigation]);

  const handleSeedlessOnboardingControllerError = useCallback(
    (
      seedlessError:
        | Error
        | SeedlessOnboardingControllerRecoveryError
        | SeedlessOnboardingControllerError,
    ) => {
      setLoading(false);

      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        const params: SuccessErrorSheetParams = {
          title: strings(`error_sheet.no_internet_connection_title`),
          description: strings(
            `error_sheet.no_internet_connection_description`,
          ),
          descriptionAlign: 'left',
          primaryButtonLabel: strings(
            `error_sheet.no_internet_connection_button`,
          ),
          closeOnPrimaryButtonPress: true,
          type: 'error',
        };
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params,
        });
        return;
      }

      if (seedlessError instanceof SeedlessOnboardingControllerRecoveryError) {
        if (
          seedlessError.message ===
          SeedlessOnboardingControllerErrorMessage.IncorrectPassword
        ) {
          if (isOAuthRehydration) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts: rehydrationFailedAttempts,
              error_type: 'incorrect_password',
            });
          }
          setError(strings('login.invalid_password'));
          return;
        } else if (
          seedlessError.message ===
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts
        ) {
          if (
            seedlessError.data?.numberOfAttempts !== undefined &&
            setRehydrationFailedAttempts
          ) {
            setRehydrationFailedAttempts(seedlessError.data.numberOfAttempts);
          }
          if (isOAuthRehydration) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts:
                seedlessError.data?.numberOfAttempts ??
                rehydrationFailedAttempts,
              error_type: 'incorrect_password',
            });
          }
          if (typeof seedlessError.data?.remainingTime === 'number') {
            tooManyAttemptsError(seedlessError.data?.remainingTime).catch(
              () => null,
            );
          }
          return;
        }
      } else if (seedlessError instanceof SeedlessOnboardingControllerError) {
        if (
          seedlessError.code ===
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated
        ) {
          if (isOAuthRehydration) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: 'social',
              failed_attempts: rehydrationFailedAttempts,
              error_type: 'unknown_error',
            });
          }
          setError(strings('login.seedless_password_outdated'));
          return;
        }
      } else if (!isOAuthRehydration) {
        if (isMetricsEnabled()) {
          captureException(seedlessError, {
            tags: {
              view: 'Re-login',
              context:
                'seedless flow unlock wallet failed - user consented to analytics',
            },
          });
        }
        Logger.error(seedlessError, 'Error in Unlock Screen');
        promptSeedlessRelogin();
        return;
      }
      const errMessage = seedlessError.message.replace(
        'SeedlessOnboardingController - ',
        '',
      );
      setError(errMessage);

      if (isOAuthRehydration) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: 'social',
          failed_attempts: rehydrationFailedAttempts,
          error_type: 'unknown_error',
        });

        if (isMetricsEnabled()) {
          captureException(seedlessError, {
            tags: {
              view: 'Login',
              context: 'OAuth rehydration failed - user consented to analytics',
            },
          });
        } else if (setErrorToThrow) {
          setErrorToThrow(
            new Error(`OAuth rehydration failed: ${seedlessError.message}`),
          );
        }
      }
    },
    [
      isOAuthRehydration,
      rehydrationFailedAttempts,
      setRehydrationFailedAttempts,
      track,
      tooManyAttemptsError,
      isMetricsEnabled,
      promptSeedlessRelogin,
      netInfo,
      navigation,
      setErrorToThrow,
    ],
  );

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  const handleLoginError = useCallback(
    async (loginErr: unknown) => {
      const loginError = loginErr as Error;
      const loginErrorMessage = loginError.toString();

      if (onboardingTraceCtx) {
        trace({
          name: TraceName.OnboardingPasswordLoginError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage: loginErrorMessage },
          parentContext: onboardingTraceCtx,
        });
        endTrace({ name: TraceName.OnboardingPasswordLoginError });
      }

      if (loginErrorMessage.includes('SeedlessOnboardingController')) {
        handleSeedlessOnboardingControllerError(loginError);
        return;
      }

      const isWrongPasswordError =
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID) ||
        toLowerCaseEquals(loginErrorMessage, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError && isOAuthRehydration) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: 'social',
          failed_attempts: rehydrationFailedAttempts,
          error_type: 'incorrect_password',
        });
      }

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
          oauth_login: isOAuthRehydration,
        });

        await handleVaultCorruption();
      } else if (toLowerCaseEquals(loginErrorMessage, DENY_PIN_ERROR_ANDROID)) {
        updateBiometryChoice(false);
      } else {
        setError(loginErrorMessage);
      }

      if (isOAuthRehydration) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: 'social',
          failed_attempts: rehydrationFailedAttempts,
          error_type: 'unknown_error',
        });
      }

      setLoading(false);
      Logger.error(loginErr as Error, 'Failed to unlock');
    },
    [
      isOAuthRehydration,
      rehydrationFailedAttempts,
      track,
      handleSeedlessOnboardingControllerError,
      handlePasswordError,
      handleVaultCorruption,
      updateBiometryChoice,
      onboardingTraceCtx,
    ],
  );

  const onLogin = useCallback(async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    if (isOAuthRehydration) {
      track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
        account_type: 'social',
        biometrics: biometryChoice,
      });
    }

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
      if (isOAuthRehydration) {
        authType.oauth2Login = true;
      }

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );

      if (isOAuthRehydration) {
        track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
          account_type: 'social',
          biometrics: biometryChoice,
          failed_attempts: rehydrationFailedAttempts,
        });
      }

      if (passwordLoginAttemptTraceCtxRef?.current) {
        endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
      endTrace({ name: TraceName.OnboardingExistingSocialLogin });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      await onLoginSuccess();

      setLoading(false);
      setError(null);
    } catch (loginErr: unknown) {
      await handleLoginError(loginErr);
    }
  }, [
    isOAuthRehydration,
    password,
    biometryChoice,
    rememberMe,
    finalLoading,
    rehydrationFailedAttempts,
    track,
    onLoginSuccess,
    handleLoginError,
    passwordLoginAttemptTraceCtxRef,
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

      await onLoginSuccess();

      setLoading(false);
    } catch (tryBiometricError) {
      setLoading(false);
      Logger.log(tryBiometricError);
    }
  }, [onLoginSuccess]);

  return {
    onLogin,
    tryBiometric,
    loading,
    finalLoading,
    error,
    setError,
    disabledInput,
    isSeedlessPasswordOutdated,
  };
};
