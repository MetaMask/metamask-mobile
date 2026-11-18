import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
  useRef,
} from 'react';
import {
  Alert,
  BackHandler,
  InteractionManager,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { authenticateAsync } from 'expo-local-authentication';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { colors as importedColors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { connect, useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../Login/LoginView.testIds';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
  endTrace,
  getTraceContext,
} from '../../../util/trace';
import { captureException } from '@sentry/react-native';
import { captureExceptionForced } from '../../../util/sentry/utils';
import Logger from '../../../util/Logger';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import {
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../Login/constants';
import {
  isAndroidKeychainBiometricLockout,
  isBiometricUnlockCancelledByUser,
} from '../../../core/Authentication/utils';
import {
  SeedlessOnboardingControllerErrorMessage,
  RecoveryError as SeedlessOnboardingControllerRecoveryError,
} from '@metamask/seedless-onboarding-controller';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import {
  cancelUnlockTraces,
  startUnlockTraces,
  type UnlockTraceTokens,
} from '../../../core/Performance/unlockTraces';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { getLoginAppStartType } from '../Login/loginPerformanceTags';
import { useNetInfo } from '@react-native-community/netinfo';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SuccessErrorSheetParams } from '../SuccessErrorSheet/interface';
import { usePromptSeedlessRelogin } from '../../hooks/SeedlessHooks';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import ReduxService from '../../../core/redux';
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useOnboardingLoadingStallTracker } from '../../../util/onboarding/hooks/useOnboardingLoadingStallTracker';
import { ONBOARDING_LOADING_STALL_SCREEN } from '../../../util/onboarding/onboardingLoadingStallTracking';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { OnboardingScreenIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useNavigationPerformance } from '../../../hooks/performance/useNavigationPerformance';
import { useScreenPerformance } from '../../../hooks/performance/useScreenPerformance';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  TextField,
} from '@metamask/design-system-react-native';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { containsErrorMessage } from '../../../util/errorHandling';
import { ensureError } from '../../../util/errorUtils';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import type { AuthData } from '../../../core/Authentication/Authentication';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectMfaRecoveryEnabled } from '../../../selectors/featureFlagController/mfaRecovery';
import { selectMfaUiKitEnabled } from '../../../selectors/featureFlagController/mfaUiKit';
import { selectMoneyEnableMfaFlag } from '../../UI/Money/selectors/featureFlags';
import { getSocialAccountType } from '../../../constants/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { analytics } from '../../../util/analytics/analytics';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';
import { selectAnalyticsId } from '../../../selectors/analyticsController';
import { ThemeContext } from '../../../util/theme';
import Device from '../../../util/device';
import OnboardingLoginCanvas from '../../UI/OnboardingAnimation/OnboardingLoginCanvas';
import {
  getMfaErrorCode,
  type VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../core/Engine';
import { useMfa } from '../../../util/identity/mfa';
import type {
  MfaMethod,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import type { OAuthRehydrationRouteParams } from './OAuthRehydration.types';
import {
  WalletRecoveryLoading,
  WalletRecoveryPassword,
  WalletRecoveryEnterPassword,
  WalletRecoveryVerify,
} from './WalletRecovery';
import type { WalletRecoveryMethod } from './WalletRecovery/WalletRecoveryVerify';
import PasswordlessRecoveryService from '../../../core/MfaRecovery/PasswordlessRecoveryService';
import { PasswordlessRecoveryError } from '../../../core/MfaRecovery/passwordlessSocialRecovery';
import { getMfaRecoveryErrorCode } from '../../../core/Engine/controllers/mfa-recovery-controller/errors';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';

type WalletRecoveryStep =
  | 'loading'
  | 'verify'
  | 'password' // existing password — only from custom picker (or no-MFA fallback)
  | 'createPassword' // new password after MFA when recovery secret is enrolled
  | 'enterPassword'; // existing unlock after OS biometrics rejected (Figma)

/** Label for Figma "Since {{biometryType}} isn't enabled…" copy. */
const labelForBiometryType = (
  availableBiometryType?: string | null,
): string => {
  const value = String(availableBiometryType ?? '').toLowerCase();
  if (value.includes('face')) {
    return strings('authentication.labels.face_id');
  }
  if (value.includes('touch')) {
    return strings('authentication.labels.touch_id');
  }
  if (value.includes('fingerprint')) {
    return strings('wallet_recovery_mfa.biometry_fingerprint');
  }
  return strings('authentication.labels.device_authentication');
};

/** Figma "2FA still valid?" — held AAL2 verification token not expired. */
const isHeldAal2Valid = (token: VerificationToken | null): boolean => {
  if (!token) {
    return false;
  }
  return Date.now() < token.obtainedAt + token.expiresIn * 1000;
};

interface OAuthRehydrationProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const OAuthRehydration: React.FC<OAuthRehydrationProps> = ({
  saveOnboardingEvent,
}) => {
  const { isEnabled: isMetricsEnabled } = useAnalytics();
  const accountType = useSelector(selectOnboardingAccountType) ?? 'social';
  const dispatch = useDispatch();
  const isMfaUiKitEnabled = useSelector(selectMfaUiKitEnabled);
  const isMfaRecoveryEnabled = useSelector(selectMfaRecoveryEnabled);
  const isMoneyMfaEnabledFlag = useSelector(selectMoneyEnableMfaFlag);
  const route =
    useRoute<RouteProp<{ params: OAuthRehydrationRouteParams }, 'params'>>();
  const isSeedlessPasswordOutdated = route?.params?.isSeedlessPasswordOutdated;
  const isComingFromOauthOnboarding = route?.params?.oauthLoginSuccess;
  // Locked MFA verify first, then biometrics / Enter password / Forgot.
  // Create password is only the Forgot-password path (local + global sync).
  // Money MFA is one way in. Passwordless recovery is the other, so a dev
  // build does not also need the Money flag.
  const canOfferSocialMfaVerify =
    isMfaUiKitEnabled &&
    (isMoneyMfaEnabledFlag ||
      (Boolean(isSeedlessPasswordOutdated) && isMfaRecoveryEnabled));
  const authConnection =
    useSelector(selectSeedlessOnboardingAuthConnection) ?? '';
  const analyticsId = useSelector(selectAnalyticsId);
  const tw = useTailwind();
  const { colors, themeAppearance } = useContext(ThemeContext);
  const canvasColor =
    themeAppearance === 'dark'
      ? colors.background.default
      : importedColors.gettingStartedPageBackgroundColorLightMode;
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    undefined | 'Start'
  >(undefined);

  const [password, setPassword] = useState('');
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [rehydrationFailedAttempts, setRehydrationFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    isSeedlessPasswordOutdated
      ? strings('login.seedless_password_outdated')
      : null,
  );
  const [disabledInput, setDisabledInput] = useState(false);

  const { isDeletingInProgress, promptSeedlessRelogin } =
    usePromptSeedlessRelogin();
  const netInfo = useNetInfo();
  const isMountedRef = useRef(true);

  const finalLoading = useMemo(
    () => loading || isDeletingInProgress,
    [loading, isDeletingInProgress],
  );

  useOnboardingLoadingStallTracker({
    isLoading: finalLoading,
    screen: ONBOARDING_LOADING_STALL_SCREEN.REHYDRATION,
    properties: {
      account_type: accountType,
    },
    saveOnboardingEvent,
  });

  const navigation = useNavigation<AppNavigationProp>();

  useNavigationPerformance({
    destinationScreenId: OnboardingScreenIds.SOCIAL_REHYDRATE,
    destinationReady: true,
  });

  // TTC only — do not pass finalLoading as isLoading. That flag is password
  // submit / delete-in-progress, not an initial data-fetch cycle, and would
  // emit misleading OnboardingScreenDataFetch success/unmount spans.
  useScreenPerformance({
    screenId: OnboardingScreenIds.SOCIAL_REHYDRATE,
    contentReady: true,
    isEmpty: false,
  });

  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  const {
    unlockWallet,
    getAuthType,
    componentAuthenticationType,
    requestBiometricsAccessControlForIOS,
    updateAuthPreference,
  } = useAuthentication();

  /**
   * After a successful password unlock, offer device auth / biometrics for keychain storage.
   */
  const upgradeKeychainAuthAfterSuccessfulUnlock = useCallback(
    async (unlockPassword: string) => {
      try {
        const upgradeAuthType = await requestBiometricsAccessControlForIOS(
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
        );
        if (upgradeAuthType !== AUTHENTICATION_TYPE.PASSWORD) {
          await updateAuthPreference({
            authType: upgradeAuthType,
            password: unlockPassword,
            fallbackToPassword: true,
          });
        }
      } catch (postUnlockAuthErr) {
        Logger.error(
          ensureError(
            postUnlockAuthErr,
            'Post-unlock auth preference update failed',
          ),
          'OAuthRehydration: post-unlock biometric preference',
        );
      }
    },
    [requestBiometricsAccessControlForIOS, updateAuthPreference],
  );

  const track = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | boolean | number>,
    ) => {
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(event)
          .addProperties(properties)
          .build(),
        saveOnboardingEvent,
      );
    },
    [saveOnboardingEvent],
  );

  const [biometryChoice, setBiometryChoice] = useState(true);

  const promptBiometricFailedAlert = useCallback(async () => {
    let authData: AuthData;
    try {
      authData = await getAuthType();
    } catch (err) {
      throw ensureError(err, 'Get auth type failed');
    }
    if (
      authData.currentAuthType === AUTHENTICATION_TYPE.PASSWORD &&
      authData.availableBiometryType
    ) {
      Alert.alert(
        strings('login.biometric_authentication_cancelled_title'),
        strings('login.biometric_authentication_cancelled_description'),
        [
          {
            text: strings('login.biometric_authentication_cancelled_button'),
          },
        ],
      );
    }
  }, [getAuthType]);

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

      // Prefer message match — unlockWallet may wrap the controller error.
      if (
        containsErrorMessage(
          seedlessError,
          SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
        )
      ) {
        if (isComingFromOauthOnboarding) {
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: accountType,
            failed_attempts: rehydrationFailedAttempts,
            error_type: 'incorrect_password',
          });
        }
        setError(strings('login.invalid_password'));
        return;
      }

      if (seedlessError instanceof SeedlessOnboardingControllerRecoveryError) {
        if (
          seedlessError.message ===
          SeedlessOnboardingControllerErrorMessage.TooManyLoginAttempts
        ) {
          // Synchronize rehydrationFailedAttempts with numberOfAttempts from the error data
          if (seedlessError.data?.numberOfAttempts !== undefined) {
            setRehydrationFailedAttempts(seedlessError.data.numberOfAttempts);
          }
          if (isComingFromOauthOnboarding) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: accountType,
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
          if (isComingFromOauthOnboarding) {
            track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
              account_type: accountType,
              failed_attempts: rehydrationFailedAttempts,
              error_type: 'unknown_error',
            });
          }
          setError(strings('login.seedless_password_outdated'));
          return;
        }
      } else if (!isComingFromOauthOnboarding) {
        // new password relogin failed
        // for non oauth login (rehydration) failure, prompt user to reset and rehydrate.
        // Force-report so opted-out users still appear in Sentry.
        // Authentication.ts owns confirmed incident_1745 Shape 1 tagging.
        captureExceptionForced(seedlessError, {
          view: 'Re-login',
          context: 'seedless flow unlock wallet failed',
          profile_id: analyticsId ?? 'unknown',
        }).catch(() => undefined);
        Logger.error(seedlessError, 'Error in Unlock Screen');
        promptSeedlessRelogin();
        return;
      }

      const errMessage = seedlessError.message.replace(
        'SeedlessOnboardingController - ',
        '',
      );
      setError(errMessage);

      if (isComingFromOauthOnboarding) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: accountType,
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
        } else {
          setErrorToThrow(
            new Error(`OAuth rehydration failed: ${seedlessError.message}`),
          );
        }
      }
    },
    [
      rehydrationFailedAttempts,
      setRehydrationFailedAttempts,
      track,
      tooManyAttemptsError,
      isMetricsEnabled,
      netInfo,
      navigation,
      setErrorToThrow,
      promptSeedlessRelogin,
      isComingFromOauthOnboarding,
      accountType,
      analyticsId,
    ],
  );

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    void trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  // Handles login/unlock errors from onRehydrateLogin and newGlobalPasswordLogin.
  // Call chain: onRehydrateLogin/newGlobalPasswordLogin → unlockWallet() →
  // Authentication wraps rethrown errors via ensureError, so loginError is always
  // an Error instance. We still guard against an empty .message with .trim() fallback.
  const handleLoginError = useCallback(
    async (loginError: Error) => {
      const loginErrorMessage =
        loginError.message?.trim() ||
        loginError.name?.trim() ||
        String(loginError);

      // perf_fix: trace-registry-v1 — fetch parent from trace registry instead of route params
      const journeyCtx = getTraceContext({
        name: TraceName.OnboardingJourneyOverall,
      });
      if (journeyCtx) {
        trace({
          name: TraceName.OnboardingPasswordLoginError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage: loginErrorMessage },
          parentContext: passwordLoginAttemptTraceCtxRef.current ?? journeyCtx,
        });
        endTrace({ name: TraceName.OnboardingPasswordLoginError });
      }

      const isWrongPasswordError =
        containsErrorMessage(
          loginError,
          SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
        ) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError) {
        if (isComingFromOauthOnboarding) {
          track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
            account_type: accountType,
            failed_attempts: rehydrationFailedAttempts,
            error_type: 'incorrect_password',
          });
        }
        handlePasswordError(loginErrorMessage);
        return;
      }

      if (loginErrorMessage.includes('SeedlessOnboardingController')) {
        handleSeedlessOnboardingControllerError(loginError);
        return;
      }

      const isBiometricCancellation =
        isBiometricUnlockCancelledByUser(loginError);

      if (isBiometricCancellation) {
        setBiometryChoice(false);
        setLoading(false);
        return;
      }

      if (isAndroidKeychainBiometricLockout(loginError)) {
        setError(strings('login.biometric_too_many_attempts'));
        setLoading(false);
        return;
      }

      const isPasscodeNotSet = loginErrorMessage === PASSCODE_NOT_SET_ERROR;

      if (isPasscodeNotSet) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else {
        setError(loginErrorMessage);
      }

      if (isComingFromOauthOnboarding) {
        track(MetaMetricsEvents.REHYDRATION_PASSWORD_FAILED, {
          account_type: accountType,
          failed_attempts: rehydrationFailedAttempts,
          error_type: isPasscodeNotSet ? 'passcode_not_set' : 'unknown_error',
        });
      }

      setLoading(false);
      Logger.error(loginError, 'Failed to rehydrate');
    },
    [
      rehydrationFailedAttempts,
      track,
      handleSeedlessOnboardingControllerError,
      handlePasswordError,
      setBiometryChoice,
      isComingFromOauthOnboarding,
      accountType,
    ],
  );

  // Loader → custom verify (enrolled methods) → password.
  const [walletRecoveryStep, setWalletRecoveryStep] =
    useState<WalletRecoveryStep>(
      canOfferSocialMfaVerify ? 'loading' : 'password',
    );
  /**
   * Copy under the recovery spinner. Set for Forgot → escrow passkey prefetch
   * so the OS passkey sheet does not look like a blank glitch.
   */
  const [walletRecoveryLoadingMessage, setWalletRecoveryLoadingMessage] =
    useState<string | null>(null);
  /** Active MFA factors from `refreshSocialLoginCredentials`. */
  const [fallbackMethods, setFallbackMethods] = useState<MfaMethod[]>([]);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  /** Password opened from verify → back returns to the picker. */
  const [passwordFromVerify, setPasswordFromVerify] = useState(false);
  /**
   * In-flow create-password recover (legacy). Forgot password uses
   * ChoosePassword via {@link navigateToPasswordlessChoosePassword}.
   */
  const [passwordlessUnlock, setPasswordlessUnlock] = useState(false);
  /**
   * Auth preference chosen right after MFA (ChoosePassword biometrics prompt).
   * Reused when creating/unlocking the vault so we do not prompt twice.
   */
  const postMfaAuthPreferenceRef = useRef<AuthData | null>(null);
  /** AAL2 from locked MFA — used for Figma "2FA still valid?" on Forgot password. */
  const heldAal2TokenRef = useRef<VerificationToken | null>(null);
  /**
   * Last MFA factor that just succeeded. Passkey already showed an OS biometric
   * sheet — do not prompt again in continueAfterVerified.
   */
  const lastVerifiedMfaMethodRef = useRef<MfaMethod | null>(null);
  /** Prevent overlapping post-MFA biometric prompts. */
  const continueAfterVerifiedInFlightRef = useRef(false);
  /**
   * Forgot-password path: after MFA, go to ChoosePassword only — no Account kit
   * bottomsheet, no post-MFA biometrics / enter-password further flow.
   */
  const forgotPasswordFlowRef = useRef(false);
  /** Biometry name for the reject → Enter password screen copy. */
  const [rejectedBiometryLabel, setRejectedBiometryLabel] = useState(
    strings('authentication.labels.device_authentication'),
  );
  const { listActiveSocialLoginMethods, verifyForSocialLogin } = useMfa();

  const rememberHeldAal2 = useCallback((token?: VerificationToken) => {
    if (!token) {
      return;
    }
    heldAal2TokenRef.current = token;
    Engine.context.AuthenticationController.holdLockedRecoveryVerification(
      token,
    );
  }, []);

  /**
   * Forgot-password only: prefetch escrow Recovery Secret while AAL2 is held,
   * then open ChoosePassword. Create password must not trigger a passkey.
   * Prefetch failure returns to Enter password with recovery_failed.
   */
  const navigateToPasswordlessChoosePassword = useCallback(async () => {
    forgotPasswordFlowRef.current = false;
    setWalletRecoveryLoadingMessage(
      strings('wallet_recovery_mfa.confirm_passkey_to_recover'),
    );
    setWalletRecoveryStep('loading');
    setError(null);
    Logger.log('OAuthRehydration: forgot → ChoosePassword prefetch', {
      aal2Held: Boolean(heldAal2TokenRef.current),
      aal2Valid: isHeldAal2Valid(heldAal2TokenRef.current),
    });
    try {
      const ready =
        await PasswordlessRecoveryService.prefetchForChoosePassword(
          authConnection,
        );
      if (!ready) {
        Logger.log('OAuthRehydration: forgot → ChoosePassword blocked', {
          reason: 'prefetch_not_ready',
        });
        setError(strings('wallet_recovery_mfa.recovery_failed'));
        setWalletRecoveryLoadingMessage(null);
        setWalletRecoveryStep('enterPassword');
        return;
      }
      setWalletRecoveryLoadingMessage(null);
      navigation.navigate(Routes.ONBOARDING.CHOOSE_PASSWORD, {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: authConnection || undefined,
        passwordlessSocialRecovery: true,
      });
    } catch (prefetchError) {
      Logger.log(
        'OAuthRehydration: passwordless ChoosePassword prefetch failed',
        {
          code: getMfaRecoveryErrorCode(prefetchError),
          message:
            prefetchError instanceof Error
              ? prefetchError.message
              : String(prefetchError),
        },
      );
      PasswordlessRecoveryService.clear();
      setError(strings('wallet_recovery_mfa.recovery_failed'));
      setWalletRecoveryLoadingMessage(null);
      setWalletRecoveryStep('enterPassword');
    }
  }, [navigation, authConnection]);

  const lockedMfaReason = useMemo(
    (): MfaReason => ({
      operation: 'settings.social_mfa_verify',
      presentation: 'modal',
      verifyDescription: strings('wallet_recovery_mfa.verify_description'),
    }),
    [],
  );

  /**
   * After MFA verified (non-Forgot): offer device biometrics.
   * Accept → existing password unlock (global password via rehydrate).
   * Reject / unavailable → Enter password (Login validations;
   * unlock → fetchAllSecretData). Forgot uses Create password only.
   */
  const continueAfterVerified = useCallback(async () => {
    // Forgot password: after 2FA, ChoosePassword only — no biometrics /
    // enter-password further flow here.
    if (forgotPasswordFlowRef.current) {
      Logger.log('OAuthRehydration: forgot-password MFA → ChoosePassword');
      await navigateToPasswordlessChoosePassword();
      return;
    }

    if (continueAfterVerifiedInFlightRef.current) {
      return;
    }
    continueAfterVerifiedInFlightRef.current = true;

    setError(null);
    setVerifyError(null);
    setPasswordFromVerify(false);
    setPassword('');
    // Stay on loader while the OS biometrics sheet is up.
    setWalletRecoveryLoadingMessage(null);
    setWalletRecoveryStep('loading');

    // Post-MFA device biometrics (Figma): separate from passkey MFA.
    // 1) Passkey / SMS / etc. = identity MFA
    // 2) This prompt = enable device unlock biometrics
    //    Accept → existing global password unlock (rehydrate)
    //    Reject → Enter password ("Since Face ID isn't enabled…")
    const verifiedViaPasskey = lastVerifiedMfaMethodRef.current === 'passkey';
    let authPreference: AuthData = {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      oauth2Login: true,
    };
    let biometricsRejected = false;
    try {
      authPreference = await componentAuthenticationType(true, false);
      authPreference.oauth2Login = true;

      const typeBeforePrompt = authPreference.currentAuthType;
      const deviceOffersBiometrics =
        Boolean(authPreference.availableBiometryType) ||
        typeBeforePrompt === AUTHENTICATION_TYPE.BIOMETRIC ||
        typeBeforePrompt === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION;

      let afterPrompt = typeBeforePrompt;
      let biometricsWereOffered = false;

      if (deviceOffersBiometrics) {
        // After passkey, wait longer so the MFA sheet fully dismisses before
        // the device-biometrics sheet (they are intentionally two prompts).
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, verifiedViaPasskey ? 1000 : 400);
          });
        });

        biometricsWereOffered = true;
        try {
          if (Platform.OS === 'ios') {
            const typeToPrompt =
              typeBeforePrompt === AUTHENTICATION_TYPE.BIOMETRIC ||
              typeBeforePrompt === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
                ? typeBeforePrompt
                : AUTHENTICATION_TYPE.BIOMETRIC;
            afterPrompt =
              await requestBiometricsAccessControlForIOS(typeToPrompt);
          } else {
            const promptResult = await authenticateAsync({
              promptMessage: strings('authentication.auth_prompt_desc'),
              cancelLabel: strings('navigation.cancel'),
              disableDeviceFallback: true,
            });
            if (promptResult.success) {
              afterPrompt = AUTHENTICATION_TYPE.BIOMETRIC;
            } else {
              const promptError =
                'error' in promptResult ? String(promptResult.error) : '';
              if (
                promptError === 'not_enrolled' ||
                promptError === 'not_available' ||
                promptError === 'passcode_not_set' ||
                promptError === 'hardware_unavailable'
              ) {
                biometricsWereOffered = false;
                afterPrompt = typeBeforePrompt;
              } else {
                afterPrompt = AUTHENTICATION_TYPE.PASSWORD;
              }
            }
          }
        } catch {
          biometricsWereOffered = false;
          afterPrompt = typeBeforePrompt;
        }
      }

      biometricsRejected =
        biometricsWereOffered && afterPrompt === AUTHENTICATION_TYPE.PASSWORD;

      if (biometricsRejected) {
        afterPrompt = AUTHENTICATION_TYPE.PASSWORD;
        setRejectedBiometryLabel(
          labelForBiometryType(
            authPreference.availableBiometryType ?? 'Fingerprint',
          ),
        );
      }

      authPreference.currentAuthType = afterPrompt;
      postMfaAuthPreferenceRef.current = authPreference;

      Logger.log('OAuthRehydration: post-MFA biometrics', {
        platform: Platform.OS,
        verifiedViaPasskey,
        availableBiometryType: authPreference.availableBiometryType,
        deviceOffersBiometrics,
        biometricsWereOffered,
        biometricsRejected,
        typeBeforePrompt,
        authType: afterPrompt,
      });
    } catch (biometricError) {
      Logger.log('OAuthRehydration: post-MFA biometrics failed', {
        code: getMfaErrorCode(biometricError),
      });
      postMfaAuthPreferenceRef.current = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: true,
        availableBiometryType: authPreference.availableBiometryType,
      };
    } finally {
      continueAfterVerifiedInFlightRef.current = false;
    }

    setPasswordlessUnlock(false);
    if (biometricsRejected) {
      // Figma: Face ID declined → Enter password (verify global password).
      setWalletRecoveryStep('enterPassword');
      return;
    }
    // Biometrics accepted (or unavailable): existing global password unlock
    // (unlockWallet → rehydrateSeedPhrase → fetchAllSecretData).
    setWalletRecoveryStep('password');
  }, [
    componentAuthenticationType,
    requestBiometricsAccessControlForIOS,
    navigateToPasswordlessChoosePassword,
  ]);

  /**
   * Figma Forgot password: if AAL2 still valid → ChoosePassword; else
   * cost-order MFA verify, then custom WalletRecoveryVerify on cancel/fail.
   */
  const handleForgotPassword = useCallback(async () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});
    setError(null);
    setVerifyError(null);
    setPassword('');

    if (isHeldAal2Valid(heldAal2TokenRef.current)) {
      Logger.log('OAuthRehydration: forgot password — AAL2 still valid');
      await navigateToPasswordlessChoosePassword();
      return;
    }

    Logger.log('OAuthRehydration: forgot password — AAL2 expired, re-verify');
    forgotPasswordFlowRef.current = true;
    heldAal2TokenRef.current = null;
    setPasswordlessUnlock(false);
    setPasswordFromVerify(false);
    setWalletRecoveryLoadingMessage(null);
    setWalletRecoveryStep('loading');

    // Highest-priority enrolled factor (cost order) — no list preflight.
    try {
      const result = await verifyForSocialLogin({ reason: lockedMfaReason });
      lastVerifiedMfaMethodRef.current = null;
      rememberHeldAal2(result.token);
      await continueAfterVerified();
      return;
    } catch (verifyError) {
      Logger.log('OAuthRehydration: forgot-password MFA → picker', {
        code: getMfaErrorCode(verifyError),
        message:
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError),
      });
    }

    try {
      const methods = await listActiveSocialLoginMethods();
      if (methods.length === 0) {
        forgotPasswordFlowRef.current = false;
        setError(strings('wallet_recovery_mfa.method_failed'));
        setWalletRecoveryStep('enterPassword');
        return;
      }
      setFallbackMethods(methods);
      setWalletRecoveryStep('verify');
    } catch (listError) {
      forgotPasswordFlowRef.current = false;
      Logger.log('OAuthRehydration: forgot-password list failed', {
        code: getMfaErrorCode(listError),
      });
      setError(strings('wallet_recovery_mfa.method_failed'));
      setWalletRecoveryStep('enterPassword');
    }
  }, [
    track,
    navigateToPasswordlessChoosePassword,
    listActiveSocialLoginMethods,
    verifyForSocialLogin,
    lockedMfaReason,
    rememberHeldAal2,
    continueAfterVerified,
  ]);

  /**
   * Pre-password locked social MFA via Account kit `verifyForSocialLogin`
   * (cost order: passkey → totp → email).
   *
   * Needs the social identifier paired (`exchangeSocialAccessToken`). Pairing
   * runs after unlock via `performSignIn` when MFA UI kit / BFTC is on — that
   * requires a **cold app restart** after changing auth-controller init or
   * `.js.env` (Engine does not pick it up via Fast Refresh).
   */
  const offerLockedSocialMfaVerify = useCallback(async () => {
    if (!canOfferSocialMfaVerify) {
      setWalletRecoveryStep('password');
      return;
    }

    setError(null);
    setVerifyError(null);
    setPasswordFromVerify(false);
    try {
      // Surface Auth pairing failures in Metro (kit may show "Something went wrong").
      try {
        await Engine.context.AuthenticationController.exchangeSocialAccessToken();
        Logger.log('OAuthRehydration: social login exchange ok');
      } catch (exchangeError) {
        Logger.log('OAuthRehydration: social login exchange failed', {
          message:
            exchangeError instanceof Error
              ? exchangeError.message
              : String(exchangeError),
        });
        // Still attempt MFA — if exchange failed, kit will fail similarly.
      }

      const result = await verifyForSocialLogin({ reason: lockedMfaReason });
      Logger.log('OAuthRehydration: locked social MFA', {
        status: 'verified',
      });
      rememberHeldAal2(result.token);
      await continueAfterVerified();
    } catch (error) {
      const code = getMfaErrorCode(error);
      // OS passkey cancel, or back from the in-app passkey retry screen →
      // full-page methods list. Passkey failures stay on retry until then.
      if (code === 'flow_cancelled') {
        Logger.log('OAuthRehydration: locked social MFA', {
          status: 'fallback_verify',
          code,
          message: error instanceof Error ? error.message : String(error),
        });
        setPasswordlessUnlock(false);
        try {
          const methods = await listActiveSocialLoginMethods();
          if (methods.length === 0) {
            setWalletRecoveryStep('password');
            return;
          }
          setFallbackMethods(methods);
          setWalletRecoveryStep('verify');
        } catch (listError) {
          Logger.log('OAuthRehydration: locked MFA list failed', {
            code: getMfaErrorCode(listError),
          });
          setWalletRecoveryStep('password');
        }
        return;
      }
      Logger.log('OAuthRehydration: locked social MFA', {
        status: 'failed',
        code,
        message: error instanceof Error ? error.message : String(error),
      });
      setPasswordlessUnlock(false);
    } finally {
      setWalletRecoveryStep((step) => (step === 'loading' ? 'password' : step));
    }
  }, [
    canOfferSocialMfaVerify,
    lockedMfaReason,
    verifyForSocialLogin,
    listActiveSocialLoginMethods,
    rememberHeldAal2,
    continueAfterVerified,
  ]);

  const handleRecoveryMethodSelect = useCallback(
    async (method: WalletRecoveryMethod) => {
      // Email OTP only for Telegram — never Google/Apple sign-in email.
      if (method === 'email' && authConnection !== 'telegram') {
        return;
      }

      if (method === 'password') {
        setVerifyError(null);
        setPasswordFromVerify(true);
        setPasswordlessUnlock(false);
        // Picker password is existing unlock — not the post-MFA biometric path.
        postMfaAuthPreferenceRef.current = null;
        forgotPasswordFlowRef.current = false;
        setWalletRecoveryStep('password');
        return;
      }

      const mfaMethod: MfaMethod = method === 'email' ? 'email_otp' : method;
      setVerifyBusy(true);
      setVerifyError(null);
      setError(null);
      try {
        const result = await verifyForSocialLogin({
          reason: lockedMfaReason,
          method: mfaMethod,
        });
        Logger.log('OAuthRehydration: locked social MFA', {
          status: 'verified',
          method: mfaMethod,
        });
        lastVerifiedMfaMethodRef.current = mfaMethod;
        rememberHeldAal2(result.token);
        await continueAfterVerified();
      } catch (error) {
        const code = getMfaErrorCode(error);
        Logger.log('OAuthRehydration: locked social MFA factor', {
          status: 'failed',
          method: mfaMethod,
          code,
        });
        if (code === 'flow_cancelled') {
          // Stay on full-screen verify; no error line.
          return;
        }
        setVerifyError(strings('wallet_recovery_mfa.method_failed'));
        setPasswordlessUnlock(false);
      } finally {
        setVerifyBusy(false);
      }
    },
    [
      authConnection,
      lockedMfaReason,
      verifyForSocialLogin,
      rememberHeldAal2,
      continueAfterVerified,
    ],
  );

  const recoverWithEnteredPassword = useCallback(async () => {
    if (finalLoading) return;
    setLoading(true);
    setError(null);
    try {
      await PasswordlessRecoveryService.recover(
        password,
        async (vaultPassword, secrets) => {
          // Biometrics were already prompted right after MFA success.
          const authPreference = postMfaAuthPreferenceRef.current ?? {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            oauth2Login: true,
          };

          await unlockWallet({
            password: vaultPassword,
            authPreference,
            recoveredSecrets: secrets,
            onBeforeNavigate: async () => {
              endTrace({ name: TraceName.OnboardingExistingSocialLogin });
              endTrace({ name: TraceName.OnboardingJourneyOverall });
            },
          });
        },
      );
      if (isMountedRef.current) {
        setLoading(false);
      }
    } catch (recoveryErr) {
      const stage =
        recoveryErr instanceof PasswordlessRecoveryError
          ? recoveryErr.stage
          : undefined;
      Logger.error(new Error('Passwordless social recovery failed'), {
        stage,
        code:
          recoveryErr instanceof PasswordlessRecoveryError
            ? recoveryErr.code
            : undefined,
      });
      if (!isMountedRef.current) return;
      if (stage === 'restoring_vault') {
        // The new password is already global; the next unlock uses it.
        setPasswordlessUnlock(false);
        setError(strings('wallet_recovery_mfa.recovery_password_already_set'));
      } else {
        // Dev builds also show the failed step, so a failure can be traced.
        const detail =
          __DEV__ && recoveryErr instanceof PasswordlessRecoveryError
            ? ` (${recoveryErr.code}: ${recoveryErr.detail})`
            : '';
        setError(`${strings('wallet_recovery_mfa.recovery_failed')}${detail}`);
      }
      setLoading(false);
    }
  }, [finalLoading, password, unlockWallet]);

  const onRehydrateLogin = useCallback(async () => {
    endTrace({ name: TraceName.LoginUserInteraction });
    track(MetaMetricsEvents.REHYDRATION_PASSWORD_ATTEMPTED, {
      account_type: accountType,
      biometrics: biometryChoice,
    });
    let unlockTraceTokens: UnlockTraceTokens | null = null;

    try {
      if (finalLoading) return;

      unlockTraceTokens = startUnlockTraces({
        appStartType: getLoginAppStartType(),
      });
      setLoading(true);

      // perf_fix: trace-registry-v1 — fetch parent from trace registry instead of route params
      // Nest under Existing Social Login when that phase span is open; else journey.
      const journeyCtx = getTraceContext({
        name: TraceName.OnboardingJourneyOverall,
      });
      if (journeyCtx) {
        passwordLoginAttemptTraceCtxRef.current = trace({
          name: TraceName.OnboardingPasswordLoginAttempt,
          op: TraceOperation.OnboardingUserJourney,
          parentContext:
            getTraceContext({
              name: TraceName.OnboardingExistingSocialLogin,
            }) ?? journeyCtx,
        });
      }
      const passwordLoginAttemptCtx = passwordLoginAttemptTraceCtxRef.current;

      // Prefer auth chosen right after MFA; otherwise password unlock then
      // post-unlock biometric upgrade (picker Password / lock-screen path).
      // Enter password (Face ID declined): verify existing global password —
      // unlockWallet → rehydrateSeedPhrase → fetchAllSecretData({ password }).
      // Never fall back to keychain biometrics for this step.
      const postMfaAuth = postMfaAuthPreferenceRef.current;
      const authData: AuthData =
        walletRecoveryStep === 'enterPassword'
          ? {
              currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
              oauth2Login: true,
              availableBiometryType: postMfaAuth?.availableBiometryType,
            }
          : (postMfaAuth ?? {
              currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
              oauth2Login: true,
            });

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
          parentContext: passwordLoginAttemptCtx ?? undefined,
        },
        async () => {
          await unlockWallet({
            password,
            authPreference: authData,
            onBeforeNavigate: async () => {
              // End unlock/journey spans before any biometric wait so human
              // biometric time is excluded from Password Login Attempt (and
              // parent journey) duration. Still must finish before unlockWallet
              // navigates home: navigation unmounts Onboarding, whose cleanup would
              // otherwise end OnboardingJourneyOverall with success:false.
              if (passwordLoginAttemptTraceCtxRef.current) {
                endTrace({ name: TraceName.OnboardingPasswordLoginAttempt });
                passwordLoginAttemptTraceCtxRef.current = null;
              }
              endTrace({ name: TraceName.OnboardingExistingSocialLogin });
              endTrace({ name: TraceName.OnboardingJourneyOverall });
              if (!postMfaAuth) {
                await upgradeKeychainAuthAfterSuccessfulUnlock(password);
              }
            },
            // Nest OnboardingFetchSrps under Password Login Attempt when present.
            parentContext: passwordLoginAttemptCtx ?? journeyCtx,
          });
        },
      );

      // Best-effort post-unlock UX: show biometric cancelled alert if needed.
      // Failure here must not be treated as a login error — unlock already succeeded.
      try {
        await promptBiometricFailedAlert();
      } catch (alertErr) {
        Logger.log(alertErr, 'Failed to prompt biometric alert after unlock');
      }

      track(MetaMetricsEvents.REHYDRATION_COMPLETED, {
        account_type: accountType,
        biometrics: biometryChoice,
        failed_attempts: rehydrationFailedAttempts,
      });

      setLoading(false);
      setError(null);
    } catch (loginErr) {
      if (unlockTraceTokens) {
        cancelUnlockTraces(unlockTraceTokens);
      }
      await handleLoginError(ensureError(loginErr, 'Rehydrate login failed'));
      if (passwordLoginAttemptTraceCtxRef.current) {
        endTrace({
          name: TraceName.OnboardingPasswordLoginAttempt,
          data: { success: false },
        });
        passwordLoginAttemptTraceCtxRef.current = null;
      }
    }
  }, [
    password,
    biometryChoice,
    finalLoading,
    rehydrationFailedAttempts,
    handleLoginError,
    track,
    promptBiometricFailedAlert,
    unlockWallet,
    upgradeKeychainAuthAfterSuccessfulUnlock,
    accountType,
    walletRecoveryStep,
  ]);

  const newGlobalPasswordLogin = useCallback(async () => {
    let unlockTraceTokens: UnlockTraceTokens | null = null;

    try {
      if (finalLoading) return;

      unlockTraceTokens = startUnlockTraces({
        appStartType: getLoginAppStartType(),
      });
      setLoading(true);

      // biometrics/passcode preference is applied only after sync succeeds
      const authData: AuthData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: false,
      };

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await unlockWallet({
            password,
            authPreference: authData,
            onBeforeNavigate: () =>
              upgradeKeychainAuthAfterSuccessfulUnlock(password),
          });
        },
      );

      // Best-effort post-unlock UX: show biometric cancelled alert if needed.
      // Failure here must not be treated as a login error — unlock already succeeded.
      try {
        await promptBiometricFailedAlert();
      } catch (alertErr) {
        Logger.log(alertErr, 'Failed to prompt biometric alert after unlock');
      }

      setLoading(false);
      setError(null);
    } catch (loginErr) {
      if (unlockTraceTokens) {
        cancelUnlockTraces(unlockTraceTokens);
      }
      await handleLoginError(
        ensureError(loginErr, 'Global password login failed'),
      );
    }
  }, [
    password,
    finalLoading,
    handleLoginError,
    promptBiometricFailedAlert,
    unlockWallet,
    upgradeKeychainAuthAfterSuccessfulUnlock,
  ]);

  // Cleanup for isMountedRef tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasTrackedScreenView = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenView.current) return;
    hasTrackedScreenView.current = true;
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
  }, [track]);

  // Wait for Seedless social authConnection before locked MFA — OAuth can
  // land here before social state is written ("no social login").
  const hasOfferedLockedSocialMfa = useRef(false);
  const hasSocialAuthConnection =
    authConnection === 'google' ||
    authConnection === 'apple' ||
    authConnection === 'telegram';
  useEffect(() => {
    if (
      !canOfferSocialMfaVerify ||
      !hasSocialAuthConnection ||
      hasOfferedLockedSocialMfa.current
    ) {
      return;
    }
    hasOfferedLockedSocialMfa.current = true;
    void offerLockedSocialMfaVerify();
  }, [
    canOfferSocialMfaVerify,
    hasSocialAuthConnection,
    offerLockedSocialMfaVerify,
  ]);

  // Safety: don't leave the loading gate forever if social state never arrives.
  useEffect(() => {
    if (
      !canOfferSocialMfaVerify ||
      walletRecoveryStep !== 'loading' ||
      hasSocialAuthConnection
    ) {
      return;
    }
    const timer = setTimeout(() => {
      Logger.log(
        'OAuthRehydration: locked MFA gate timed out waiting for social auth',
      );
      // Prevent a late authConnection from launching MFA after we give up.
      hasOfferedLockedSocialMfa.current = true;
      setWalletRecoveryStep('password');
    }, 10_000);
    return () => clearTimeout(timer);
  }, [canOfferSocialMfaVerify, walletRecoveryStep, hasSocialAuthConnection]);

  const handleUseOtherMethod = useCallback(() => {
    forgotPasswordFlowRef.current = false;
    track(MetaMetricsEvents.USE_DIFFERENT_LOGIN_METHOD_CLICKED, {
      account_type: accountType,
    });
    navigation.goBack();
    OAuthService.resetOauthState();
  }, [accountType, navigation, track]);

  const handlePasswordBack = useCallback(() => {
    // Existing-password unlock opened from the picker → return to picker.
    if (passwordFromVerify && walletRecoveryStep === 'password') {
      setError(null);
      setPasswordlessUnlock(false);
      setWalletRecoveryStep('verify');
      return;
    }
    // Create-password or biometrics-reject enter-password → back to picker.
    if (
      (walletRecoveryStep === 'createPassword' ||
        walletRecoveryStep === 'enterPassword') &&
      fallbackMethods.length > 0
    ) {
      setError(null);
      setPasswordlessUnlock(false);
      postMfaAuthPreferenceRef.current = null;
      setWalletRecoveryStep('verify');
      return;
    }
    handleUseOtherMethod();
  }, [
    passwordFromVerify,
    walletRecoveryStep,
    fallbackMethods.length,
    handleUseOtherMethod,
  ]);

  // Hardware back matches header back on recovery steps.
  const handleBackPress = useCallback(() => {
    if (!canOfferSocialMfaVerify) {
      navigation.goBack();
      return true;
    }
    if (
      walletRecoveryStep === 'password' ||
      walletRecoveryStep === 'createPassword' ||
      walletRecoveryStep === 'enterPassword'
    ) {
      if (finalLoading) {
        return true;
      }
      handlePasswordBack();
      return true;
    }
    if (walletRecoveryStep === 'verify') {
      if (verifyBusy) {
        return true;
      }
      handleUseOtherMethod();
      return true;
    }
    handleUseOtherMethod();
    return true;
  }, [
    canOfferSocialMfaVerify,
    walletRecoveryStep,
    finalLoading,
    verifyBusy,
    handlePasswordBack,
    handleUseOtherMethod,
    navigation,
  ]);

  useEffect(() => {
    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandlerSubscription.remove();
    };
  }, [handleBackPress]);

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();
    track(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, {});
    void downloadStateLogs(fullState, false);
  };

  const handleStartFoxAnimation = useCallback(() => {
    setStartFoxAnimation('Start');
  }, []);

  const ThrowErrorIfNeeded = () => {
    if (errorToThrow) {
      throw errorToThrow;
    }
    return null;
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  const handleLogin = async () => {
    // Enter-password (biometrics reject) and picker unlock match Login:
    // Unlock enabled when non-empty; length / wrong-password come from unlock.
    if (
      walletRecoveryStep === 'enterPassword' ||
      walletRecoveryStep === 'password'
    ) {
      if (password.length === 0) {
        return;
      }
      if (isSeedlessPasswordOutdated) {
        await newGlobalPasswordLogin();
      } else {
        await onRehydrateLogin();
      }
      setPassword('');
      return;
    }

    // Create-password after MFA: require ChoosePassword minimum length.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(strings('choose_password.password_length_error'));
      return;
    }

    if (walletRecoveryStep === 'createPassword' || passwordlessUnlock) {
      await recoverWithEnteredPassword();
    } else if (isSeedlessPasswordOutdated) {
      await newGlobalPasswordLogin();
    } else {
      await onRehydrateLogin();
    }
    setPassword('');
  };

  /** Legacy Login reset-wallet (not Figma forgot-password recovery). */
  const toggleWarningModal = () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
      params: {
        oauthLoginSuccess: isComingFromOauthOnboarding,
      },
    });
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

  const renderLegacyUnlock = () => (
    <OnboardingLoginCanvas
      canvasColor={canvasColor}
      containerTestID={LoginViewSelectors.CONTAINER}
      startFoxAnimation={startFoxAnimation}
      setStartFoxAnimation={handleStartFoxAnimation}
      renderWordmark={renderWordmark}
    >
      <Box flexDirection={BoxFlexDirection.Column} gap={2}>
        <TextField
          placeholder={strings('login.password_placeholder')}
          onChangeText={handlePasswordChange}
          value={password}
          isDisabled={disabledInput}
          isError={!!error}
          inputProps={{
            testID: LoginViewSelectors.PASSWORD_INPUT,
            accessibilityLabel: LoginViewSelectors.PASSWORD_INPUT,
            returnKeyType: 'done',
            autoCapitalize: 'none',
            secureTextEntry: true,
            onSubmitEditing: handleLogin,
            keyboardAppearance: themeAppearance,
          }}
        />
        {!!error && (
          <HelpText
            severity={HelpTextSeverity.Error}
            testID={LoginViewSelectors.PASSWORD_ERROR}
          >
            {error}
          </HelpText>
        )}
      </Box>
      <Button
        variant={ButtonVariant.Primary}
        size={ctaSize}
        onPress={handleLogin}
        isDisabled={password.length === 0 || disabledInput || finalLoading}
        testID={LoginViewSelectors.LOGIN_BUTTON_ID}
        isLoading={finalLoading}
        isFullWidth
      >
        {strings('login.unlock_button')}
      </Button>
      {isSeedlessPasswordOutdated ? (
        <Button
          variant={ButtonVariant.Tertiary}
          size={ctaSize}
          testID={LoginViewSelectors.RESET_WALLET}
          onPress={toggleWarningModal}
          isDisabled={loading}
          isFullWidth
        >
          {strings('login.forgot_password')}
        </Button>
      ) : (
        <Button
          variant={ButtonVariant.Tertiary}
          size={ctaSize}
          onPress={handleUseOtherMethod}
          isDisabled={finalLoading}
          testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
          isFullWidth
        >
          {strings('login.other_methods')}
        </Button>
      )}
    </OnboardingLoginCanvas>
  );

  // Email OTP only when enrolled and auth is Telegram.
  const showEmailOnVerify =
    authConnection === 'telegram' && fallbackMethods.includes('email_otp');

  const isRecoveryOffline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const renderWalletRecovery = () => {
    if (walletRecoveryStep === 'loading') {
      return <WalletRecoveryLoading message={walletRecoveryLoadingMessage} />;
    }
    if (walletRecoveryStep === 'verify') {
      return (
        <WalletRecoveryVerify
          showPasskey={fallbackMethods.includes('passkey')}
          showPassword
          showEmail={showEmailOnVerify}
          showTotp={fallbackMethods.includes('totp')}
          isBusy={verifyBusy}
          isOffline={isRecoveryOffline}
          error={verifyError}
          onBack={handleUseOtherMethod}
          onSelectMethod={handleRecoveryMethodSelect}
        />
      );
    }
    // Figma: OS biometrics rejected after MFA → Enter password unlock.
    if (walletRecoveryStep === 'enterPassword') {
      return (
        <WalletRecoveryEnterPassword
          biometryLabel={rejectedBiometryLabel}
          password={password}
          error={error}
          isLoading={finalLoading}
          keyboardAppearance={themeAppearance}
          onChangePassword={handlePasswordChange}
          onSubmit={handleLogin}
          onBack={handlePasswordBack}
          onForgotPassword={() => {
            void handleForgotPassword();
          }}
        />
      );
    }
    // Existing unlock (picker Password / no-MFA) or create-new after MFA.
    return (
      <WalletRecoveryPassword
        mode={walletRecoveryStep === 'createPassword' ? 'create' : 'unlock'}
        password={password}
        error={error}
        isLoading={finalLoading}
        isDisabled={disabledInput}
        keyboardAppearance={themeAppearance}
        onChangePassword={handlePasswordChange}
        onSubmit={handleLogin}
        onBack={handlePasswordBack}
      />
    );
  };

  return (
    <ErrorBoundary
      navigation={navigation}
      view="OAuthRehydration"
      useOnboardingErrorHandling={!!errorToThrow && !isMetricsEnabled()}
    >
      <ThrowErrorIfNeeded />
      {canOfferSocialMfaVerify ? renderWalletRecovery() : renderLegacyUnlock()}
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(OAuthRehydration);
