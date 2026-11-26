import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  InteractionManager,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  Box,
  Label,
  FontWeight,
  TextField,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxBackgroundColor,
  IconColor,
  Checkbox,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import StorageWrapper from '../../../store/storage-wrapper';
import { useSelector, useDispatch } from 'react-redux';
import { passwordSet } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  TRUE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
  shouldShowPasswordMismatchError,
} from '../../../util/password';
import NotificationManager from '../../../core/NotificationManager';
import { passcodeType } from '../../../util/authentication';
import { Authentication } from '../../../core';
import Engine from '../../../core/Engine';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { useTheme } from '../../../util/theme';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { recreateVaultsWithNewPassword } from '../../../core/Vault';
import Logger from '../../../util/Logger';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import LottieView, { AnimationObject } from 'lottie-react-native';
import {
  selectSeedlessOnboardingLoginFlow,
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessIsLocalPassword,
} from '../../../selectors/seedlessOnboardingController';
import { selectMfaUiKitEnabled } from '../../../selectors/featureFlagController/mfaUiKit';
import { SeedlessOnboardingControllerErrorMessage } from '@metamask/seedless-onboarding-controller';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { ReauthenticateErrorType } from '../../../core/Authentication/types';
import Device from '../../../util/device';
import SearchingFox from '../../../animations/Searching_Fox.json';
import {
  PASSWORD_GUIDE_URL,
  RESET_PASSWORD_GUIDE_URL,
} from '../../../constants/urls';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { hasTestOverrides } from '../../../util/test/utils';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';
import { setDataCollectionForMarketing } from '../../../actions/security';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { useMfa } from '../../../util/identity/mfa/useMfa';
import type {
  MfaMethod,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import {
  WalletRecoveryVerify,
  type WalletRecoveryMethod,
} from '../shared/WalletRecoveryVerify';
import {
  getActiveTwoStepMethods,
  getChangePasswordGateKind,
  type ChangePasswordGateKind,
} from './changePasswordGate';

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const CHANGE_PASSWORD_MFA_REASON: MfaReason = {
  operation: 'settings.change_password',
  presentation: 'modal',
};

enum ViewState {
  ResetForm = 'reset_form',
  ConfirmCurrent = 'confirm_current',
  /** MFA-1012: reuse recovery "Verify it's you" when Face ID fails / recovery. */
  VerifyMfa = 'verify_mfa',
}

const getCommonButtonProps = () => ({
  variant: ButtonVariant.Primary,
  size: ButtonSize.Lg,
  twClassName: 'w-full',
});

interface ResetPasswordNavigation {
  goBack(): void;
  navigate(screen: string, params?: Record<string, unknown>): void;
  replace(screen: string, params?: Record<string, unknown>): void;
}

interface ResetPasswordRoute {
  params?: {
    [PREVIOUS_SCREEN]?: string;
  };
}

interface ResetPasswordProps {
  navigation: ResetPasswordNavigation;
  route: ResetPasswordRoute;
}

/**
 * View where users can reset their password
 */
const ResetPassword = ({ navigation, route }: ResetPasswordProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const dispatch = useDispatch();
  const { colors, themeAppearance } = useTheme();
  const tw = useTailwind();
  const netInfo = useNetInfo();
  const { credentials, verifyOrEnroll } = useMfa();

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);
  const isMfaUiKitEnabled = useSelector(selectMfaUiKitEnabled);
  const isLocalPassword = useSelector(selectSeedlessIsLocalPassword);

  const activeTwoStepMethods = useMemo(
    () => getActiveTwoStepMethods(credentials),
    [credentials],
  );
  const gateKind: ChangePasswordGateKind = useMemo(
    () =>
      getChangePasswordGateKind({
        isSeedlessLoginFlow: isSeedlessOnboardingLoginFlow,
        isMfaUiKitEnabled,
        isLocalPassword,
        activeTwoStepMethods,
      }),
    [
      isSeedlessOnboardingLoginFlow,
      isMfaUiKitEnabled,
      isLocalPassword,
      activeTwoStepMethods,
    ],
  );

  const [isSelected, setIsSelected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  // Start on a loader so gated cohorts never flash ConfirmCurrent ("Change
  // password") before Face ID / passkey / Verify it's you is decided.
  const [view, setView] = useState(ViewState.ConfirmCurrent);
  const [originalPassword, setOriginalPassword] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showPasswordIndex, setShowPasswordIndex] = useState<number[]>([0, 1]);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);
  const [warningIncorrectPassword, setWarningIncorrectPassword] = useState<
    string | undefined
  >(undefined);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  /** ConfirmCurrent opened from Verify — back returns to the picker. */
  const [confirmFromVerify, setConfirmFromVerify] = useState(false);

  const confirmPasswordInput = useRef<TextInput | null>(null);
  const passwordRef = useRef('');
  const gateKindRef = useRef(gateKind);
  gateKindRef.current = gateKind;
  const activeTwoStepMethodsRef = useRef(activeTwoStepMethods);
  activeTwoStepMethodsRef.current = activeTwoStepMethods;
  const seedlessLoginRef = useRef(isSeedlessOnboardingLoginFlow);
  seedlessLoginRef.current = isSeedlessOnboardingLoginFlow;
  const mfaUiKitRef = useRef(isMfaUiKitEnabled);
  mfaUiKitRef.current = isMfaUiKitEnabled;
  const isLocalPasswordRef = useRef(isLocalPassword);
  isLocalPasswordRef.current = isLocalPassword;

  /**
   * Full-page Verify it's you. The only ConfirmCurrent entry for gated
   * cohorts is an explicit Password tap on this screen.
   */
  const goToVerifyItsYou = useCallback(() => {
    setWarningIncorrectPassword(undefined);
    setVerifyError(null);
    setConfirmFromVerify(false);
    setView(ViewState.VerifyMfa);
  }, []);

  const isMfaCancelCode = (code: string | undefined): boolean =>
    code === 'flow_cancelled' || code === 'passkey_ceremony_cancelled';

  /**
   * After MFA succeeds, read the keychain password for vault change.
   * May prompt Face ID again; that is fine after 2SV (MFA-1012).
   */
  const proceedAfterVerifiedMfa = useCallback(async () => {
    setReady(false);
    try {
      const { password: verifiedPassword } =
        await Authentication.reauthenticate();
      passwordRef.current = '';
      setPassword('');
      setOriginalPassword(verifiedPassword);
      setConfirmFromVerify(false);
      setView(ViewState.ResetForm);
    } catch (error) {
      Logger.error(error as Error, {
        context: 'ResetPassword.proceedAfterVerifiedMfa',
      });
      // Never dump gated users on Change password / current-password after a
      // keychain biometric cancel — return to Verify it's you.
      if (gateKindRef.current !== 'legacy') {
        goToVerifyItsYou();
      } else {
        setWarningIncorrectPassword(undefined);
        setConfirmFromVerify(true);
        setView(ViewState.ConfirmCurrent);
      }
    } finally {
      setReady(true);
    }
  }, [goToVerifyItsYou]);

  const reauthenticate = useCallback(
    async (pwd?: string) => {
      // Biometric (no pwd) uses the full-screen loader. Password confirm keeps
      // the form mounted so E2E can observe the transition to ResetForm.
      if (!pwd) {
        setReady(false);
      }
      let reauthError: Error | undefined;
      try {
        const { password: verifiedPassword } =
          await Authentication.reauthenticate(pwd);
        passwordRef.current = '';
        setPassword('');
        setOriginalPassword(verifiedPassword);
        setConfirmFromVerify(false);
        setView(ViewState.ResetForm);
      } catch (e) {
        reauthError = e as Error;
      }
      if (reauthError) {
        const isBiometricPath = !pwd;
        const isPasswordNotSet = reauthError.message.includes(
          ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
        );

        // Incorrect-password copy is only for a typed password that failed.
        if (!isBiometricPath && !isPasswordNotSet) {
          setWarningIncorrectPassword(
            strings('reveal_credential.warning_incorrect_password'),
          );
        } else {
          setWarningIncorrectPassword(undefined);
        }

        // MFA-1012: any Face ID / biometrics cancel or miss on a gated device
        // (including PASSWORD_NOT_SET / empty keychain) → Verify it's you.
        // ConfirmCurrent is only for legacy or typed-password failures.
        if (isBiometricPath && gateKindRef.current !== 'legacy') {
          goToVerifyItsYou();
        } else {
          setView(ViewState.ConfirmCurrent);
        }
      }
      setReady(true);
    },
    [goToVerifyItsYou],
  );

  /**
   * Prompt the highest enrolled MFA factor (passkey). Cancel/fail always opens
   * Verify it's you — never the Change password / current-password screen.
   */
  const offerPasskeyThenVerify = useCallback(async () => {
    setReady(false);
    setVerifyError(null);
    try {
      if (!activeTwoStepMethodsRef.current.includes('passkey')) {
        goToVerifyItsYou();
        return;
      }
      try {
        await verifyOrEnroll({
          methods: ['passkey'],
          verifyWith: 'passkey',
          verifyOnly: true,
          reason: CHANGE_PASSWORD_MFA_REASON,
        });
        await proceedAfterVerifiedMfa();
      } catch (passkeyError) {
        Logger.log('ResetPassword: passkey → Verify picker', {
          code: getMfaErrorCode(passkeyError),
        });
        goToVerifyItsYou();
      }
    } finally {
      setReady(true);
    }
  }, [verifyOrEnroll, proceedAfterVerifiedMfa, goToVerifyItsYou]);

  useEffect(() => {
    const initAuth = async () => {
      // reauthenticate / offerPasskeyThenVerify manage `ready` themselves.
      let managedReady = false;
      try {
        // Prefer fresh MFA credentials so we do not mis-gate as legacy and
        // dump cancel onto Change password / current-password.
        try {
          const fresh =
            await Engine.context.AuthenticationController.refreshEnrolledCredentials();
          const methods = getActiveTwoStepMethods(fresh);
          activeTwoStepMethodsRef.current = methods;
          gateKindRef.current = getChangePasswordGateKind({
            isSeedlessLoginFlow: seedlessLoginRef.current,
            isMfaUiKitEnabled: mfaUiKitRef.current,
            isLocalPassword: isLocalPasswordRef.current,
            activeTwoStepMethods: methods,
          });
        } catch (refreshError) {
          Logger.log('ResetPassword: refresh enrolled credentials failed', {
            message:
              refreshError instanceof Error
                ? refreshError.message
                : String(refreshError),
          });
        }

        let authData;
        let previouslyDisabled: string | null;
        let passcodePreviouslyDisabled: string | null;

        try {
          authData = await Authentication.getType();
          previouslyDisabled = await StorageWrapper.getItem(
            BIOMETRY_CHOICE_DISABLED,
          );
          passcodePreviouslyDisabled =
            await StorageWrapper.getItem(PASSCODE_DISABLED);
        } catch (e) {
          Logger.error(e as Error);
          if (gateKindRef.current === 'legacy') {
            setView(ViewState.ConfirmCurrent);
          } else {
            goToVerifyItsYou();
          }
          return;
        }

        if (
          authData.currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
        ) {
          setBiometryType(passcodeType(authData.currentAuthType));
          setBiometryChoice(
            !(
              passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
            ),
          );
        } else if (authData.availableBiometryType) {
          setBiometryType(authData.availableBiometryType);
          setBiometryChoice(
            !(previouslyDisabled && previouslyDisabled === TRUE),
          );
        }

        const kind = gateKindRef.current;

        // Recovery device: never treat Face ID alone as enough (MFA-1012).
        // Passkey first when enrolled; cancel → Verify it's you.
        if (kind === 'recovery_device') {
          if (hasTestOverrides) {
            goToVerifyItsYou();
          } else {
            managedReady = true;
            await offerPasskeyThenVerify();
          }
          return;
        }

        if (kind === 'password_device') {
          // Password device: Face ID alone can unlock. Any cancel/fail → Verify.
          if (hasTestOverrides) {
            goToVerifyItsYou();
          } else if (authData.availableBiometryType) {
            managedReady = true;
            await reauthenticate();
          } else {
            // No biometrics: if passkey enrolled try it, else Verify picker.
            managedReady = true;
            await offerPasskeyThenVerify();
          }
          return;
        }

        // Legacy: today's current-password flow (optional Face ID unlock).
        if (
          authData.currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
        ) {
          setView(ViewState.ConfirmCurrent);
        } else if (authData.availableBiometryType) {
          if (hasTestOverrides) {
            setView(ViewState.ConfirmCurrent);
          } else {
            managedReady = true;
            await reauthenticate();
          }
        } else {
          setView(ViewState.ConfirmCurrent);
        }
      } finally {
        if (!managedReady) {
          setReady(true);
        }
      }
    };

    initAuth();
    // gateKind / offerPasskeyThenVerify are read via refs or stable enough for
    // a one-shot mount init; re-running would re-prompt Face ID / passkey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reauthenticate]);

  const toggleSelection = useCallback(() => {
    setIsSelected((prev) => !prev);
  }, []);

  const handleSeedlessChangePasswordError = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings(
          'reset_password.seedless_change_password_error_modal_title',
        ),
        description: strings(
          'reset_password.seedless_change_password_error_modal_content',
        ),
        primaryButtonLabel: strings(
          'reset_password.seedless_change_password_error_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          navigation.replace(Routes.SETTINGS.SECURITY_SETTINGS);
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [navigation]);

  const handleSeedlessPasswordOutdated = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('login.seedless_password_outdated_modal_title'),
        description: strings('login.seedless_password_outdated_modal_content'),
        primaryButtonLabel: strings(
          'login.seedless_password_outdated_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          await Authentication.lockApp({ locked: true }).catch((lockError) => {
            Logger.error(lockError);
            handleSeedlessChangePasswordError();
          });
        },
        closeOnPrimaryButtonPress: true,
      },
    });
  }, [navigation, handleSeedlessChangePasswordError]);

  const recreateVault = useCallback(async () => {
    await recreateVaultsWithNewPassword(
      originalPassword || '',
      password,
      selectedAddress || '',
    );
  }, [originalPassword, password, selectedAddress]);

  const onPressCreate = useCallback(async () => {
    if (loading) return;
    if (!passwordRequirementsMet(password)) {
      Alert.alert('Error', strings('choose_password.password_length_error'));
      return;
    } else if (password !== confirmPassword) {
      Alert.alert('Error', strings('choose_password.password_dont_match'));
      return;
    }

    try {
      setLoading(true);

      const isGlobalPasswordOutdated =
        await Authentication.checkIsSeedlessPasswordOutdated();
      if (isGlobalPasswordOutdated) {
        setLoading(false);
        handleSeedlessPasswordOutdated();
        return;
      }

      await recreateVault();
      await Authentication.resetPassword();

      try {
        const authData = await Authentication.componentAuthenticationType(
          biometryChoice,
          rememberMe,
        );
        await Authentication.storePassword(
          password,
          authData.currentAuthType,
          true,
        );
      } catch (storeError) {
        Logger.error(storeError as Error);
      }

      dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT));
      dispatch(passwordSet());

      // MFA-1012: no marketing checkbox on this surface — auto opt-in.
      if (isSeedlessOnboardingLoginFlow) {
        dispatch(setDataCollectionForMarketing(true));
        OAuthLoginService.updateMarketingOptInStatus(true).catch((err) => {
          Logger.error(err as Error);
        });
      }

      const eventBuilder = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PASSWORD_CHANGED,
      ).addProperties({
        biometry_type: biometryType,
        biometrics_enabled: Boolean(biometryChoice),
      });
      analytics.trackEvent(eventBuilder.build());

      setLoading(false);
      navigation.navigate(Routes.SETTINGS.SECURITY_SETTINGS);
      InteractionManager.runAfterInteractions(() => {
        // MFA-1012 / Nakul video: seedless toast is a short "Password changed".
        if (isSeedlessOnboardingLoginFlow) {
          NotificationManager.showSimpleNotification({
            status: 'success',
            duration: 5000,
            title: strings('reset_password.password_changed'),
            description: '',
          });
        } else {
          NotificationManager.showSimpleNotification({
            status: 'success',
            duration: 5000,
            title: strings('reset_password.password_updated'),
            description: strings('reset_password.successfully_changed'),
          });
        }
      });
    } catch (err) {
      const castError = err as Error;
      if (castError.toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
        setLoading(false);
      } else if (castError.message.includes('SeedlessOnboardingController')) {
        const cause =
          'cause' in castError
            ? (castError as Error & { cause?: unknown }).cause
            : undefined;
        const causeMessage =
          cause instanceof Error
            ? cause.message
            : typeof cause === 'string'
              ? cause
              : cause != null
                ? JSON.stringify(cause)
                : undefined;
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('ResetPassword: seedless change password failed', {
            message: castError.message,
            causeMessage,
            hasOriginalPassword: Boolean(originalPassword),
          });
        }
        Logger.error(castError, {
          message: 'ResetPassword: seedless change password failed',
          causeMessage,
          hasOriginalPassword: Boolean(originalPassword),
        });
        if (
          castError.message ===
          SeedlessOnboardingControllerErrorMessage.OutdatedPassword
        ) {
          handleSeedlessPasswordOutdated();
        } else {
          handleSeedlessChangePasswordError();
        }
        setLoading(false);
      } else {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('ResetPassword: change password failed (non-seedless)', {
            message: castError.message,
          });
        }
        Logger.error(castError, {
          message: 'ResetPassword: change password failed (non-seedless)',
        });
        setLoading(false);
      }
    }
  }, [
    loading,
    password,
    confirmPassword,
    originalPassword,
    biometryChoice,
    rememberMe,
    biometryType,
    recreateVault,
    handleSeedlessPasswordOutdated,
    handleSeedlessChangePasswordError,
    isSeedlessOnboardingLoginFlow,
    dispatch,
    navigation,
  ]);

  const jumpToConfirmPassword = useCallback(() => {
    confirmPasswordInput.current?.focus();
  }, []);

  const toggleShowPassword = useCallback((index: number) => {
    setShowPasswordIndex((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }, []);

  const onPasswordChange = useCallback((val: string) => {
    passwordRef.current = val;
    setPassword(val);
    setConfirmPassword((prev) => (val === '' ? '' : prev));
  }, []);

  const learnMore = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: isSeedlessOnboardingLoginFlow
          ? PASSWORD_GUIDE_URL
          : RESET_PASSWORD_GUIDE_URL,
        title: 'support.metamask.io',
      },
    });
  }, [navigation, isSeedlessOnboardingLoginFlow]);

  const reauthenticateWithPassword = useCallback(() => {
    const pwd = passwordRef.current;
    if (!pwd) {
      return;
    }
    reauthenticate(pwd);
  }, [reauthenticate]);

  const handleVerifyBack = useCallback(() => {
    if (verifyBusy) {
      return;
    }
    navigation.goBack();
  }, [navigation, verifyBusy]);

  const handleConfirmBack = useCallback(() => {
    if (confirmFromVerify) {
      setWarningIncorrectPassword(undefined);
      setPassword('');
      passwordRef.current = '';
      setView(ViewState.VerifyMfa);
      return;
    }
    navigation.goBack();
  }, [confirmFromVerify, navigation]);

  const handleHeaderBack = useCallback(() => {
    if (loading || verifyBusy) {
      return;
    }
    if (view === ViewState.VerifyMfa) {
      handleVerifyBack();
      return;
    }
    if (view === ViewState.ConfirmCurrent) {
      handleConfirmBack();
      return;
    }
    navigation.goBack();
  }, [
    loading,
    verifyBusy,
    view,
    handleVerifyBack,
    handleConfirmBack,
    navigation,
  ]);

  const handleVerifyMethodSelect = useCallback(
    async (method: WalletRecoveryMethod) => {
      if (method === 'email' && authConnection !== AuthConnection.Telegram) {
        return;
      }

      if (method === 'password') {
        setVerifyError(null);
        setWarningIncorrectPassword(undefined);
        setConfirmFromVerify(true);
        setView(ViewState.ConfirmCurrent);
        return;
      }

      const mfaMethod: MfaMethod = method === 'email' ? 'email_otp' : method;
      setVerifyBusy(true);
      setVerifyError(null);
      try {
        await verifyOrEnroll({
          methods: [mfaMethod],
          verifyWith: mfaMethod,
          verifyOnly: true,
          reason: CHANGE_PASSWORD_MFA_REASON,
        });
        await proceedAfterVerifiedMfa();
      } catch (error) {
        const code = getMfaErrorCode(error);
        Logger.log('ResetPassword: Verify method failed', {
          method: mfaMethod,
          code,
        });
        // Stay on Verify it's you — never navigate to Change password.
        if (isMfaCancelCode(code)) {
          goToVerifyItsYou();
          return;
        }
        goToVerifyItsYou();
        setVerifyError(strings('wallet_recovery_mfa.method_failed'));
      } finally {
        setVerifyBusy(false);
      }
    },
    [authConnection, verifyOrEnroll, proceedAfterVerifiedMfa, goToVerifyItsYou],
  );

  const isError = useCallback(
    () => shouldShowPasswordMismatchError(password, confirmPassword),
    [password, confirmPassword],
  );

  const isPasswordTooShort = useCallback(
    () =>
      !isPasswordFieldFocused &&
      !!password &&
      password.length < MIN_PASSWORD_LENGTH,
    [isPasswordFieldFocused, password],
  );

  const renderPasswordHelperText = () => {
    if (password && password.length >= MIN_PASSWORD_LENGTH) return null;
    const showError = isPasswordTooShort();
    return (
      <Text
        variant={TextVariant.BodySm}
        color={showError ? TextColor.ErrorDefault : TextColor.TextAlternative}
      >
        {strings('reset_password.must_be_at_least', {
          number: MIN_PASSWORD_LENGTH,
        })}
      </Text>
    );
  };

  const renderErrorText = () => {
    if (!isError()) return null;
    return (
      <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
        {strings('choose_password.password_error')}
      </Text>
    );
  };

  const renderWarningText = (warningText?: string) => {
    if (!warningText) return null;
    return (
      <Text color={TextColor.ErrorDefault} style={tw.style('py-[10px]')}>
        {warningText}
      </Text>
    );
  };

  const renderLoadingState = () => (
    <Box
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={10}
      twClassName="flex-1 pb-[30px]"
    >
      <Box
        twClassName={`mt-[30px] mb-[30px] ${
          Device.isIos() ? 'w-[90px] h-[90px]' : 'w-20 h-20'
        }`}
      >
        <LottieView
          style={tw.style('self-center w-20 h-20')}
          autoPlay
          loop
          source={SearchingFox as AnimationObject}
          resizeMode="contain"
        />
      </Box>
      <ActivityIndicator size="large" color={colors.icon.default} />
      <Text
        variant={TextVariant.HeadingLg}
        style={tw.style('mt-5 mb-5 text-center w-full')}
      >
        {strings('reset_password.changing_password')}
      </Text>
      <Text
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        style={tw.style('leading-[23px] text-center')}
      >
        {strings('reset_password.changing_password_subtitle')}
      </Text>
    </Box>
  );

  const renderSwitch = () => (
    <LoginOptionsSwitch
      shouldRenderBiometricOption={biometryType}
      biometryChoiceState={biometryChoice}
      onUpdateBiometryChoice={setBiometryChoice}
      onUpdateRememberMe={setRememberMe}
    />
  );

  const renderLoader = () => (
    <Box
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={10}
      twClassName="flex-1 pb-[30px]"
    >
      <ActivityIndicator size="small" />
    </Box>
  );

  const renderConfirmPassword = () => (
    <KeyboardAvoidingView
      style={tw.style('flex-1 flex-row self-center h-full')}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <KeyboardAwareScrollView
        style={tw.style('flex-1 h-full')}
        enableOnAndroid
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          justifyContent={BoxJustifyContent.Between}
          padding={4}
          twClassName="flex-1 gap-y-4 h-full"
        >
          <Box alignItems={BoxAlignItems.Start} twClassName="flex-1 h-full">
            <Label
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              style={tw.style('mb-1')}
            >
              {strings('manual_backup_step_1.enter_current_password')}
            </Label>
            <TextField
              placeholder={strings('password_reset.password_title')}
              onChangeText={onPasswordChange}
              value={password}
              inputProps={{
                secureTextEntry: true,
                onSubmitEditing: reauthenticateWithPassword,
                testID: ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                accessibilityLabel:
                  ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                keyboardAppearance: themeAppearance,
                autoComplete: 'password',
              }}
            />
            {renderWarningText(warningIncorrectPassword)}
          </Box>
          <Box justifyContent={BoxJustifyContent.End} twClassName="flex-1">
            <Button
              {...getCommonButtonProps()}
              onPress={reauthenticateWithPassword}
              testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
              isDisabled={!password}
            >
              {strings('manual_backup_step_1.confirm')}
            </Button>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  const renderResetPassword = () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    // Nakul password-cohort video + CW: seedless is plain new/confirm + Face ID
    // toggle + Save — no "I understand" / marketing checkbox.
    const showUnderstandCheckbox = !isSeedlessOnboardingLoginFlow;
    const canSubmit =
      passwordsMatch &&
      password.length >= MIN_PASSWORD_LENGTH &&
      (showUnderstandCheckbox ? isSelected : true);
    const description = isSeedlessOnboardingLoginFlow
      ? strings('choose_password.description_social_login')
      : strings('choose_password.description');

    return (
      <Box
        backgroundColor={BoxBackgroundColor.BackgroundDefault}
        twClassName="flex-1"
      >
        {loading ? (
          renderLoadingState()
        ) : (
          <KeyboardAwareScrollView
            style={tw.style('flex-1 px-4')}
            contentContainerStyle={tw.style('flex-grow')}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <Box twClassName="flex-1 flex-col">
              <Box
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
                flexDirection={BoxFlexDirection.Column}
                gap={4}
                twClassName="grow pt-4"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {description}
                </Text>

                {/* New password field */}
                <Box twClassName="relative flex-col gap-2">
                  <Label
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('-mb-1')}
                  >
                    {strings('reset_password.password')}
                  </Label>
                  <TextField
                    value={password}
                    onChangeText={onPasswordChange}
                    onFocus={() => setIsPasswordFieldFocused(true)}
                    onBlur={() => setIsPasswordFieldFocused(false)}
                    placeholder={strings(
                      'reset_password.new_password_placeholder',
                    )}
                    isError={isPasswordTooShort()}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(0)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(0)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={IconColor.IconAlternative}
                          testID={
                            ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID
                          }
                        />
                      </TouchableOpacity>
                    }
                    inputProps={{
                      secureTextEntry: showPasswordIndex.includes(0),
                      testID: ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                      accessibilityLabel:
                        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                      onSubmitEditing: jumpToConfirmPassword,
                      returnKeyType: 'next',
                      autoComplete: 'password-new',
                      autoCapitalize: 'none',
                      keyboardAppearance: themeAppearance,
                    }}
                  />
                  {renderPasswordHelperText()}
                </Box>

                {/* Confirm password field */}
                <Box twClassName="relative flex-col gap-2">
                  <Label
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                    style={tw.style('-mb-1')}
                  >
                    {strings('reset_password.confirm_password')}
                  </Label>
                  <TextField
                    inputRef={confirmPasswordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={strings(
                      'reset_password.confirm_password_placeholder',
                    )}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(1)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(1)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={IconColor.IconAlternative}
                          testID={
                            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID
                          }
                        />
                      </TouchableOpacity>
                    }
                    inputProps={{
                      secureTextEntry: showPasswordIndex.includes(1),
                      testID:
                        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                      accessibilityLabel:
                        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                      returnKeyType: 'done',
                      autoComplete: 'password-new',
                      autoCapitalize: 'none',
                      keyboardAppearance: themeAppearance,
                    }}
                  />
                  {renderErrorText()}
                </Box>

                {showUnderstandCheckbox ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Start}
                    justifyContent={BoxJustifyContent.Start}
                    marginBottom={4}
                    marginTop={2}
                    gap={2}
                  >
                    <Checkbox
                      onChange={toggleSelection}
                      isSelected={isSelected}
                      testID={
                        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                      }
                      accessibilityLabel={
                        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                      }
                      style={tw.style('flex items-start')}
                    />
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                      testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                      onPress={toggleSelection}
                      twClassName="flex-row items-center w-[90%]"
                    >
                      {strings('reset_password.i_understand')}
                      <Text
                        onPress={learnMore}
                        testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
                        variant={TextVariant.BodyMd}
                        color={TextColor.PrimaryDefault}
                      >
                        {' ' + strings('reset_password.learn_more')}
                      </Text>
                    </Text>
                  </Box>
                ) : null}

                <Box
                  flexDirection={BoxFlexDirection.Column}
                  twClassName={`w-full gap-[18px] mt-auto ${
                    Platform.OS === 'android' ? 'mb-6' : 'mb-4'
                  }`}
                >
                  {renderSwitch()}
                  <Button
                    {...getCommonButtonProps()}
                    // Seedless (Nakul video): Save → vault change / Face ID —
                    // no "Are you sure?" warning sheet.
                    onPress={() => {
                      void onPressCreate();
                    }}
                    testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                    isDisabled={!canSubmit}
                  >
                    {strings('reset_password.confirm_btn')}
                  </Button>
                </Box>
              </Box>
            </Box>
          </KeyboardAwareScrollView>
        )}
      </Box>
    );
  };

  // The deterrent stays mounted through the re-authentication loader so
  // capture protection is not released between verifying the current password
  // and showing the new-password form.
  const captureDeterrent = (
    <ScreenshotDeterrent enabled hasNavigation={false} isSRP={false} />
  );

  const renderVerifyMfa = () => (
    <WalletRecoveryVerify
      showPasskey={activeTwoStepMethods.includes('passkey')}
      showPassword
      showEmail={
        authConnection === AuthConnection.Telegram &&
        activeTwoStepMethods.includes('email_otp')
      }
      showTotp={activeTwoStepMethods.includes('totp')}
      isBusy={verifyBusy}
      isOffline={
        netInfo.isConnected === false || netInfo.isInternetReachable === false
      }
      error={verifyError}
      description={strings('reset_password.verify_description')}
      onBack={handleVerifyBack}
      onSelectMethod={(method) => {
        void handleVerifyMethodSelect(method);
      }}
    />
  );

  if (!ready)
    return (
      <>
        {renderLoader()}
        {captureDeterrent}
      </>
    );

  // Verify owns its own header (HeaderStandard) — match WalletRecoveryFlow.
  if (view === ViewState.VerifyMfa) {
    return (
      <>
        {renderVerifyMfa()}
        {captureDeterrent}
      </>
    );
  }

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        testID="header"
        title={strings('password_reset.change_password')}
        onBack={handleHeaderBack}
        backButtonProps={{ isDisabled: loading }}
        includesTopInset
      />
      <Box twClassName="flex-1" testID={'account-backup-step-4-screen'}>
        {view === ViewState.ResetForm
          ? renderResetPassword()
          : renderConfirmPassword()}
      </Box>
      {captureDeterrent}
    </SafeAreaView>
  );
};

export default ResetPassword;
