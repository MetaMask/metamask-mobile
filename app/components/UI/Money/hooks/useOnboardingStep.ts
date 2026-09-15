import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOnboardingStepperProgress } from '../../../../reducers/user/selectors';
import { setOnboardingStepperStep } from '../../../../actions/user';

/**
 * Registry of stepper IDs used across products.
 * Add a new entry here when a new onboarding stepper is introduced.
 */
export const STEPPER_IDS = {
  MONEY: 'money-home-onboarding-stepper',
  MONEY_FINISH_SETUP: 'money-finish-setup',
  MONEY_PASSKEY_COUNT: 'money-passkey-count',
  MONEY_PASSKEY_METHOD: 'money-passkey-method',
  MONEY_PASSKEY_CREATED_AT: 'money-passkey-created-at',
  MONEY_SECURITY_SOCIAL: 'money-security-social',
  MONEY_SECURITY_SOCIAL_REMOVED: 'money-security-social-removed',
  MONEY_SECURITY_SOCIAL_PROVIDER: 'money-security-social-provider',
  MONEY_SECURITY_SOCIAL_CREATED_AT: 'money-security-social-created-at',
  MONEY_SECURITY_AUTHENTICATOR: 'money-security-authenticator',
  MONEY_SECURITY_AUTHENTICATOR_CREATED_AT:
    'money-security-authenticator-created-at',
  MONEY_SECURITY_SMS_REMOVED: 'money-security-sms-removed',
  MONEY_SECURITY_SMS_CREATED_AT: 'money-security-sms-created-at',
  MONEY_TRANSACTION_VERIFICATION: 'money-transaction-verification',
  MONEY_RECOVERY_VERIFICATION_PENDING: 'money-recovery-verification-pending',
  MONEY_RECOVERY_PROTOTYPE_COMPLETED: 'money-recovery-prototype-completed',
  MONEY_RECOVERY_SOCIAL_LOGIN_WALLET: 'money-recovery-social-login-wallet',
  MONEY_TWO_WEEKS_LATER: 'money-two-weeks-later',
} as const;

/**
 * Generic hook for tracking onboarding stepper progress.
 *
 * Keyed by `stepperId` so multiple independent steppers can coexist
 * without adding new Redux fields per product. Pass `totalSteps` to
 * derive the `isVisible` flag (true while `currentStep < totalSteps`).
 */
export const useOnboardingStep = ({
  stepperId,
  totalSteps,
}: {
  stepperId: string;
  totalSteps?: number;
}) => {
  const dispatch = useDispatch();
  const progress = useSelector(selectOnboardingStepperProgress);
  const currentStep = progress[stepperId] ?? 0;

  const incrementStep = useCallback(() => {
    dispatch(setOnboardingStepperStep(stepperId, currentStep + 1));
  }, [dispatch, stepperId, currentStep]);

  const isVisible =
    totalSteps !== undefined ? currentStep < totalSteps : undefined;

  return { currentStep, incrementStep, isVisible };
};
