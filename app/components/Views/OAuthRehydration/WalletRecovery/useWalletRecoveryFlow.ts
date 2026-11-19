import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { authenticateAsync } from 'expo-local-authentication';
import {
  getMfaErrorCode,
  type VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../../constants/navigation';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { Authentication } from '../../../../core';
import Engine from '../../../../core/Engine';
import type { AuthData } from '../../../../core/Authentication/Authentication';
import useAuthentication from '../../../../core/Authentication/hooks/useAuthentication';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { isMfaRecoveryConfigured } from '../../../../core/Engine/controllers/mfa-recovery-controller/config';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryService,
  getRecoveryIdentifierType,
} from '../../../../core/MfaRecovery/engineBindings';
import { recoverWithLocalPassword } from '../../../../core/MfaRecovery/passwordlessSocialRecovery';
import type { MfaRecoveryService } from '../../../../core/MfaRecovery/services/mfa-recovery-service';
import { selectSeedlessIsLocalPassword } from '../../../../selectors/seedlessOnboardingController';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { useMfa } from '../../../../util/identity/mfa';
import type {
  MfaMethod,
  MfaReason,
} from '../../../../util/identity/mfa/engine/types';
import type { WalletRecoveryMethod } from './WalletRecoveryVerify';
import {
  biometricAuthTypeFor,
  describeRecoveryError,
  isHeldAal2Valid,
  labelForBiometryType,
  offersDeviceBiometrics,
} from './walletRecoveryUtils';

export type WalletRecoveryStep =
  | 'loading'
  | 'verify'
  | 'password' // existing password — only from custom picker (or no-MFA fallback)
  | 'enterPassword'; // existing unlock after OS biometrics rejected (Figma)

export interface WalletRecoveryUnlockOptions {
  password?: string;
  authPreference?: AuthData;
  recoveredSecrets?: SecretMetadata[];
  keychainStored?: boolean;
}

export interface UseWalletRecoveryFlowParams {
  authConnection: string;
  isMfaRecoveryEnabled: boolean;
  onChangePassword: (password: string) => void;
  /** Resolves `true` once the wallet is unlocked, `false` if unlock failed. */
  onUnlock: (options: WalletRecoveryUnlockOptions) => Promise<boolean>;
  onSubmitPassword: (authPreference?: AuthData) => Promise<void>;
  onForgotPasswordPress: () => void;
  onUseOtherMethod: () => void;
}

const waitForSheetDismissal = (afterPasskey: boolean) =>
  new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, afterPasskey ? 1000 : 400);
    });
  });

const useWalletRecoveryFlow = ({
  authConnection,
  isMfaRecoveryEnabled,
  onChangePassword,
  onUnlock,
  onSubmitPassword,
  onForgotPasswordPress,
  onUseOtherMethod,
}: UseWalletRecoveryFlowParams) => {
  const navigation = useNavigation<AppNavigationProp>();
  const isLocalPassword = useSelector(selectSeedlessIsLocalPassword);
  const { componentAuthenticationType, requestBiometricsAccessControlForIOS } =
    useAuthentication();
  const { listActiveSocialLoginMethods, verifyForSocialLogin } = useMfa();

  // Loader → custom verify (enrolled methods) → password.
  const [step, setStep] = useState<WalletRecoveryStep>('loading');
  /**
   * Copy under the recovery spinner. Set while a passkey sheet may be up so
   * it does not look like a blank glitch.
   */
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  /** Active MFA factors from `refreshSocialLoginCredentials`. */
  const [fallbackMethods, setFallbackMethods] = useState<MfaMethod[]>([]);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  /** Password opened from verify → back returns to the picker. */
  const [passwordFromVerify, setPasswordFromVerify] = useState(false);
  /**
   * Auth preference chosen right after MFA. Reused when unlocking the vault
   * so we do not prompt twice.
   */
  const postMfaAuthPreferenceRef = useRef<AuthData | null>(null);
  /** AAL2 from locked MFA — used for Figma "2FA still valid?" on Forgot password. */
  const heldAal2TokenRef = useRef<VerificationToken | null>(null);
  /**
   * Last MFA factor that just succeeded. Passkey already showed an OS biometric
   * sheet — wait longer before the next one.
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

  // The host clears its unlock error whenever the password changes.
  const clearErrors = useCallback(() => {
    setRecoveryError(null);
    onChangePassword('');
  }, [onChangePassword]);

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
   * Recovers the wallet key with a generated local password. Resolves `null`
   * when no recovery identifier is enrolled.
   */
  const recoverWallet = useCallback(async (): Promise<{
    service: MfaRecoveryService;
    localPassword: string;
  } | null> => {
    const service = createPasswordlessRecoveryService();
    const identifier = await service.findRecoveryIdentifier({
      identifierType: getRecoveryIdentifierType(),
      canProveSocialIdentifier: canProveSocialIdentifier(
        Platform.OS,
        authConnection,
      ),
    });
    if (!identifier) {
      return null;
    }
    const localPassword = Authentication.generateLocalPassword();
    await recoverWithLocalPassword(service, { identifier, localPassword });
    return { service, localPassword };
  }, [authConnection]);

  /**
   * Forgot-password only: recover the wallet key while AAL2 is held, then open
   * ChoosePassword. Failure returns to Enter password with recovery_failed.
   */
  const navigateToPasswordlessChoosePassword = useCallback(async () => {
    forgotPasswordFlowRef.current = false;
    const openChoosePassword = () => {
      setLoadingMessage(null);
      navigation.navigate(Routes.ONBOARDING.CHOOSE_PASSWORD, {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: authConnection || undefined,
        passwordlessSocialRecovery: true,
      });
    };
    if (isLocalPassword) {
      Logger.log(
        'OAuthRehydration: forgot → ChoosePassword (already recovered)',
      );
      openChoosePassword();
      return;
    }
    setLoadingMessage(
      strings('wallet_recovery_mfa.confirm_passkey_to_recover'),
    );
    setStep('loading');
    clearErrors();
    Logger.log('OAuthRehydration: forgot → ChoosePassword recovery', {
      aal2Held: Boolean(heldAal2TokenRef.current),
      aal2Valid: isHeldAal2Valid(heldAal2TokenRef.current),
    });
    const blockRecovery = (reason: string) => {
      Logger.log('OAuthRehydration: forgot → ChoosePassword blocked', {
        reason,
      });
      setRecoveryError(strings('wallet_recovery_mfa.recovery_failed'));
      setLoadingMessage(null);
      setStep('enterPassword');
    };
    if (!isMfaRecoveryEnabled || !isMfaRecoveryConfigured()) {
      blockRecovery(!isMfaRecoveryEnabled ? 'flag_off' : 'not_configured');
      return;
    }
    try {
      const recovered = await recoverWallet();
      if (!recovered) {
        blockRecovery('no_recovery_identifier');
        return;
      }
      openChoosePassword();
    } catch (recoveryErr) {
      Logger.log(
        'OAuthRehydration: passwordless ChoosePassword recovery failed',
        describeRecoveryError(recoveryErr),
      );
      blockRecovery('recovery_failed');
    }
  }, [
    navigation,
    authConnection,
    isMfaRecoveryEnabled,
    isLocalPassword,
    clearErrors,
    recoverWallet,
  ]);

  const lockedMfaReason = useMemo(
    (): MfaReason => ({
      operation: 'settings.social_mfa_verify',
      presentation: 'modal',
      verifyDescription: strings('wallet_recovery_mfa.verify_description'),
    }),
    [],
  );

  /**
   * No recovered wallet: offer device biometrics.
   * Accept → existing password unlock (global password via rehydrate).
   * Reject / unavailable → Enter password (Login validations;
   * unlock → fetchAllSecretData).
   */
  const offerDeviceBiometrics = useCallback(
    async (afterPasskey: boolean) => {
      let authPreference: AuthData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: true,
      };
      let biometricsRejected = false;
      try {
        authPreference = await componentAuthenticationType(true, false);
        authPreference.oauth2Login = true;

        const typeBeforePrompt = authPreference.currentAuthType;
        const deviceOffersBiometrics = offersDeviceBiometrics(authPreference);

        let afterPrompt = typeBeforePrompt;
        let biometricsWereOffered = false;

        if (deviceOffersBiometrics) {
          await waitForSheetDismissal(afterPasskey);

          biometricsWereOffered = true;
          try {
            if (Platform.OS === 'ios') {
              afterPrompt = await requestBiometricsAccessControlForIOS(
                biometricAuthTypeFor(typeBeforePrompt),
              );
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
          afterPasskey,
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
      }

      // Face ID declined → Enter password (verify global password). Accepted
      // or unavailable → existing global password unlock.
      setStep(biometricsRejected ? 'enterPassword' : 'password');
    },
    [componentAuthenticationType, requestBiometricsAccessControlForIOS],
  );

  /**
   * After MFA verified (non-Forgot): recover the wallet key, then store the
   * generated local password behind biometrics and unlock with it. Without a
   * recovered wallet, fall back to the device biometrics offer.
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

    clearErrors();
    setVerifyError(null);
    setPasswordFromVerify(false);
    // Stay on loader while the OS passkey / biometrics sheets are up.
    setLoadingMessage(null);
    setStep('loading');

    try {
      const canRecover = isMfaRecoveryEnabled && isMfaRecoveryConfigured();
      const recoversWithPasskey =
        canRecover && getRecoveryIdentifierType() === 'passkey';
      const afterPasskey =
        lastVerifiedMfaMethodRef.current === 'passkey' || recoversWithPasskey;

      let recovered: Awaited<ReturnType<typeof recoverWallet>> = null;
      if (canRecover) {
        if (recoversWithPasskey) {
          setLoadingMessage(
            strings('wallet_recovery_mfa.confirm_passkey_to_recover'),
          );
        }
        try {
          recovered = await recoverWallet();
        } catch (recoveryErr) {
          Logger.log(
            'OAuthRehydration: passwordless recovery failed',
            describeRecoveryError(recoveryErr),
          );
        }
        setLoadingMessage(null);
      }

      if (!recovered) {
        await offerDeviceBiometrics(afterPasskey);
        return;
      }
      const { service, localPassword } = recovered;

      let authPreference: AuthData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        oauth2Login: true,
      };
      let authType = AUTHENTICATION_TYPE.BIOMETRIC;
      let stored = false;
      try {
        authPreference = await componentAuthenticationType(true, false);
        if (offersDeviceBiometrics(authPreference)) {
          authType = biometricAuthTypeFor(authPreference.currentAuthType);
          await waitForSheetDismissal(afterPasskey);
          stored = await Authentication.storeLocalPasswordWithBiometrics(
            localPassword,
            authType,
          );
        }
      } catch (biometricError) {
        Logger.log('OAuthRehydration: post-recovery biometrics failed', {
          code: getMfaErrorCode(biometricError),
        });
      }
      Logger.log('OAuthRehydration: post-recovery biometrics', {
        platform: Platform.OS,
        availableBiometryType: authPreference.availableBiometryType,
        authType,
        stored,
      });

      if (!stored) {
        setRejectedBiometryLabel(
          labelForBiometryType(
            authPreference.availableBiometryType ?? 'Fingerprint',
          ),
        );
        postMfaAuthPreferenceRef.current = {
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          oauth2Login: true,
          availableBiometryType: authPreference.availableBiometryType,
        };
        setStep('enterPassword');
        return;
      }

      try {
        const recoveredSecrets = await service.fetchSecretsWithCachedKey();
        const unlocked = await onUnlock({
          password: localPassword,
          authPreference: { currentAuthType: authType, oauth2Login: true },
          recoveredSecrets,
          keychainStored: true,
        });
        if (unlocked) {
          return;
        }
      } catch (unlockErr) {
        Logger.log(
          'OAuthRehydration: recovered wallet unlock failed',
          describeRecoveryError(unlockErr),
        );
      }

      // The keychain holds a password that never unlocked a vault.
      try {
        await Authentication.resetPassword();
      } catch (resetErr) {
        Logger.error(
          ensureError(resetErr, 'Keychain reset failed'),
          'OAuthRehydration: recovered wallet rollback',
        );
      }
      postMfaAuthPreferenceRef.current = {
        currentAuthType: authType,
        oauth2Login: true,
        availableBiometryType: authPreference.availableBiometryType,
      };
      setStep('password');
    } finally {
      continueAfterVerifiedInFlightRef.current = false;
    }
  }, [
    navigateToPasswordlessChoosePassword,
    clearErrors,
    isMfaRecoveryEnabled,
    recoverWallet,
    offerDeviceBiometrics,
    componentAuthenticationType,
    onUnlock,
  ]);

  /**
   * Figma Forgot password: if AAL2 still valid → ChoosePassword; else
   * cost-order MFA verify, then custom WalletRecoveryVerify on cancel/fail.
   */
  const handleForgotPassword = useCallback(async () => {
    onForgotPasswordPress();
    clearErrors();
    setVerifyError(null);

    if (isHeldAal2Valid(heldAal2TokenRef.current)) {
      Logger.log('OAuthRehydration: forgot password — AAL2 still valid');
      await navigateToPasswordlessChoosePassword();
      return;
    }

    Logger.log('OAuthRehydration: forgot password — AAL2 expired, re-verify');
    forgotPasswordFlowRef.current = true;
    heldAal2TokenRef.current = null;
    setPasswordFromVerify(false);
    setLoadingMessage(null);
    setStep('loading');

    // Highest-priority enrolled factor (cost order) — no list preflight.
    try {
      const result = await verifyForSocialLogin({ reason: lockedMfaReason });
      lastVerifiedMfaMethodRef.current = null;
      rememberHeldAal2(result.token);
      await continueAfterVerified();
      return;
    } catch (verifyErr) {
      Logger.log('OAuthRehydration: forgot-password MFA → picker', {
        code: getMfaErrorCode(verifyErr),
        message:
          verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
      });
    }

    try {
      const methods = await listActiveSocialLoginMethods();
      if (methods.length === 0) {
        forgotPasswordFlowRef.current = false;
        setRecoveryError(strings('wallet_recovery_mfa.method_failed'));
        setStep('enterPassword');
        return;
      }
      setFallbackMethods(methods);
      setStep('verify');
    } catch (listError) {
      forgotPasswordFlowRef.current = false;
      Logger.log('OAuthRehydration: forgot-password list failed', {
        code: getMfaErrorCode(listError),
      });
      setRecoveryError(strings('wallet_recovery_mfa.method_failed'));
      setStep('enterPassword');
    }
  }, [
    onForgotPasswordPress,
    clearErrors,
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
    clearErrors();
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
        try {
          const methods = await listActiveSocialLoginMethods();
          if (methods.length === 0) {
            setStep('password');
            return;
          }
          setFallbackMethods(methods);
          setStep('verify');
        } catch (listError) {
          Logger.log('OAuthRehydration: locked MFA list failed', {
            code: getMfaErrorCode(listError),
          });
          setStep('password');
        }
        return;
      }
      Logger.log('OAuthRehydration: locked social MFA', {
        status: 'failed',
        code,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setStep((current) => (current === 'loading' ? 'password' : current));
    }
  }, [
    clearErrors,
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
        // Picker password is existing unlock — not the post-MFA biometric path.
        postMfaAuthPreferenceRef.current = null;
        forgotPasswordFlowRef.current = false;
        setStep('password');
        return;
      }

      const mfaMethod: MfaMethod = method === 'email' ? 'email_otp' : method;
      setVerifyBusy(true);
      setVerifyError(null);
      clearErrors();
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
      } finally {
        setVerifyBusy(false);
      }
    },
    [
      authConnection,
      clearErrors,
      lockedMfaReason,
      verifyForSocialLogin,
      rememberHeldAal2,
      continueAfterVerified,
    ],
  );

  const handleUseOtherMethod = useCallback(() => {
    forgotPasswordFlowRef.current = false;
    onUseOtherMethod();
  }, [onUseOtherMethod]);

  const handlePasswordBack = useCallback(() => {
    // Existing-password unlock opened from the picker → return to picker.
    if (passwordFromVerify && step === 'password') {
      clearErrors();
      setStep('verify');
      return;
    }
    // Biometrics-reject enter-password → back to picker.
    if (step === 'enterPassword' && fallbackMethods.length > 0) {
      clearErrors();
      postMfaAuthPreferenceRef.current = null;
      setStep('verify');
      return;
    }
    handleUseOtherMethod();
  }, [
    passwordFromVerify,
    step,
    fallbackMethods.length,
    clearErrors,
    handleUseOtherMethod,
  ]);

  const handleChangePassword = useCallback(
    (value: string) => {
      setRecoveryError(null);
      onChangePassword(value);
    },
    [onChangePassword],
  );

  const handleSubmitPassword = useCallback(async () => {
    setRecoveryError(null);
    // Enter password (Face ID declined): verify existing global password —
    // never fall back to keychain biometrics for this step.
    const postMfaAuth = postMfaAuthPreferenceRef.current;
    const authPreference: AuthData | undefined =
      postMfaAuth && step === 'enterPassword'
        ? {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            oauth2Login: true,
            availableBiometryType: postMfaAuth.availableBiometryType,
          }
        : (postMfaAuth ?? undefined);
    await onSubmitPassword(authPreference);
  }, [step, onSubmitPassword]);

  // Wait for Seedless social authConnection before locked MFA — OAuth can
  // land here before social state is written ("no social login").
  const hasOfferedLockedSocialMfa = useRef(false);
  const hasSocialAuthConnection =
    authConnection === 'google' ||
    authConnection === 'apple' ||
    authConnection === 'telegram';
  useEffect(() => {
    if (!hasSocialAuthConnection || hasOfferedLockedSocialMfa.current) {
      return;
    }
    hasOfferedLockedSocialMfa.current = true;
    void offerLockedSocialMfaVerify();
  }, [hasSocialAuthConnection, offerLockedSocialMfaVerify]);

  // Safety: don't leave the loading gate forever if social state never arrives.
  useEffect(() => {
    if (step !== 'loading' || hasSocialAuthConnection) {
      return;
    }
    const timer = setTimeout(() => {
      Logger.log(
        'OAuthRehydration: locked MFA gate timed out waiting for social auth',
      );
      // Prevent a late authConnection from launching MFA after we give up.
      hasOfferedLockedSocialMfa.current = true;
      setStep('password');
    }, 10_000);
    return () => clearTimeout(timer);
  }, [step, hasSocialAuthConnection]);

  return {
    step,
    loadingMessage,
    fallbackMethods,
    verifyBusy,
    verifyError,
    recoveryError,
    rejectedBiometryLabel,
    handleRecoveryMethodSelect,
    handleForgotPassword,
    handlePasswordBack,
    handleUseOtherMethod,
    handleChangePassword,
    handleSubmitPassword,
  };
};

export default useWalletRecoveryFlow;
