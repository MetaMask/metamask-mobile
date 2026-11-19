import { useState, useEffect, useRef, useCallback } from 'react';
import { AccessibilityInfo, Platform, Keyboard, TextInput } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  passwordRequirementsMet,
  shouldShowPasswordMismatchError,
  MIN_PASSWORD_LENGTH,
} from '../../../../util/password';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getSocialAccountType } from '../../../../constants/onboarding';
import { useOnboardingTrack } from './useOnboardingTrack';

export const confirmValidationShouldArm = (
  nextPassword: string,
  nextConfirm: string,
) =>
  nextPassword.length > 0 &&
  nextPassword.length === nextConfirm.length &&
  passwordRequirementsMet(nextConfirm);

export const getConfirmPasswordStatusMessage = (
  password: string,
  confirmPassword: string,
  confirmValidationArmed: boolean,
  hasLeftConfirmPasswordField: boolean,
): string | undefined => {
  if (
    confirmValidationArmed &&
    shouldShowPasswordMismatchError(password, confirmPassword)
  ) {
    return strings('choose_password.password_error');
  }

  if (
    hasLeftConfirmPasswordField &&
    passwordRequirementsMet(password) &&
    confirmPassword.length > 0 &&
    !passwordRequirementsMet(confirmPassword)
  ) {
    return strings('choose_password.must_be_at_least', {
      number: MIN_PASSWORD_LENGTH,
    });
  }

  return undefined;
};

export const getCreatePasswordDisabledHint = (
  password: string,
  confirmPassword: string,
): string => {
  if (
    !passwordRequirementsMet(password) ||
    !passwordRequirementsMet(confirmPassword)
  ) {
    return strings('choose_password.must_be_at_least', {
      number: MIN_PASSWORD_LENGTH,
    });
  }

  return strings('choose_password.password_error');
};

export interface PasswordSubmissionState {
  isLoading: boolean;
  isAwaitingGeolocation: boolean;
}

export interface PasswordSubmissionValidation {
  valid: boolean;
  shouldTrack: boolean;
}

export const usePasswordFields = ({ provider }: { provider?: string }) => {
  const track = useOnboardingTrack();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasLeftPasswordField, setHasLeftPasswordField] = useState(false);
  const [hasLeftConfirmPasswordField, setHasLeftConfirmPasswordField] =
    useState(false);
  const [confirmValidationArmed, setConfirmValidationArmed] = useState(false);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);

  const validatePasswordSubmission = useCallback(
    ({
      isLoading,
      isAwaitingGeolocation,
    }: PasswordSubmissionState): PasswordSubmissionValidation => {
      const passwordsMatch = password !== '' && password === confirmPassword;
      const socialAccountType = provider
        ? getSocialAccountType(provider, false)
        : undefined;

      if (isLoading) return { valid: false, shouldTrack: false };

      if (!passwordRequirementsMet(password)) {
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_length_error'),
          ...(socialAccountType && { account_type: socialAccountType }),
        });
        return { valid: false, shouldTrack: false };
      }

      if (!passwordsMatch) {
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_dont_match'),
          ...(socialAccountType && { account_type: socialAccountType }),
        });
        return { valid: false, shouldTrack: false };
      }

      if (isAwaitingGeolocation) {
        return { valid: false, shouldTrack: false };
      }

      return { valid: true, shouldTrack: true };
    },
    [password, confirmPassword, provider, track],
  );

  const onPasswordChange = useCallback(
    (val: string) => {
      const nextConfirm = val === '' ? '' : confirmPassword;
      setPassword(val);
      setConfirmPassword(nextConfirm);
      if (val === '') {
        setConfirmValidationArmed(false);
        setHasLeftConfirmPasswordField(false);
        return;
      }
      if (confirmValidationShouldArm(val, nextConfirm)) {
        setConfirmValidationArmed(true);
      }
    },
    [confirmPassword],
  );

  const toggleShowPassword = useCallback((index: number) => {
    setShowPasswordIndex((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }, []);

  const leavePasswordField = useCallback(() => {
    setHasLeftPasswordField(true);
  }, []);

  const jumpToConfirmPassword = useCallback(() => {
    setHasLeftPasswordField(true);
    confirmPasswordInputRef.current?.focus();
  }, []);

  const leaveConfirmPasswordField = useCallback(() => {
    setHasLeftConfirmPasswordField(true);
    if (passwordRequirementsMet(confirmPassword)) {
      setConfirmValidationArmed(true);
    }
  }, [confirmPassword]);

  const submitConfirmPassword = useCallback(() => {
    Keyboard.dismiss();
    leaveConfirmPasswordField();
  }, [leaveConfirmPasswordField]);

  const setConfirmPasswordValue = useCallback(
    (val: string) => {
      setConfirmPassword(val);
      if (confirmValidationShouldArm(password, val)) {
        setConfirmValidationArmed(true);
      }
    },
    [password],
  );

  const confirmPasswordStatusMessage = getConfirmPasswordStatusMessage(
    password,
    confirmPassword,
    confirmValidationArmed,
    hasLeftConfirmPasswordField,
  );

  useEffect(() => {
    if (Platform.OS !== 'ios' || !confirmPasswordStatusMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(confirmPasswordStatusMessage);
  }, [confirmPasswordStatusMessage]);

  return {
    password,
    confirmPassword,
    hasLeftPasswordField,
    hasLeftConfirmPasswordField,
    confirmValidationArmed,
    showPasswordIndex,
    confirmPasswordInputRef,
    confirmPasswordStatusMessage,
    onPasswordChange,
    setConfirmPasswordValue,
    toggleShowPassword,
    leavePasswordField,
    jumpToConfirmPassword,
    leaveConfirmPasswordField,
    submitConfirmPassword,
    validatePasswordSubmission,
  };
};

export type PasswordFields = ReturnType<typeof usePasswordFields>;
