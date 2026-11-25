import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';

/** Matches kit cost order (passkey → totp → email). Kept local to avoid
 * pulling MFA planner / auth ESM into this pure helper's unit tests. */
const TWO_STEP_METHOD_ORDER = ['passkey', 'totp', 'email_otp'] as const;

export type ChangePasswordTwoStepMethod =
  (typeof TWO_STEP_METHOD_ORDER)[number];

/**
 * Settings change-password gate (MFA-1012).
 *
 * - `legacy`: SRP / no seedless / MFA kit off / no active 2SV — today's flow.
 * - `password_device`: local password is the global password; Face ID alone can unlock the change-password form.
 * - `recovery_device`: recovered with 2SV only; Face ID alone is not enough.
 */
export type ChangePasswordGateKind =
  | 'legacy'
  | 'password_device'
  | 'recovery_device';

export interface ChangePasswordGateInput {
  isSeedlessLoginFlow: boolean;
  isMfaUiKitEnabled: boolean;
  isLocalPassword: boolean;
  /**
   * Active passkey / totp / email_otp from the profile. Empty → legacy.
   */
  activeTwoStepMethods: readonly ChangePasswordTwoStepMethod[];
}

/**
 * Active social MFA factors in kit cost order (passkey → totp → email).
 */
export const getActiveTwoStepMethods = (
  credentials: readonly EnrolledCredential[],
): ChangePasswordTwoStepMethod[] => {
  const active = new Set(
    credentials
      .filter((credential) => credential.status === 'active')
      .map((credential) => credential.type),
  );
  return TWO_STEP_METHOD_ORDER.filter((method) => active.has(method));
};

export const getChangePasswordGateKind = ({
  isSeedlessLoginFlow,
  isMfaUiKitEnabled,
  isLocalPassword,
  activeTwoStepMethods,
}: ChangePasswordGateInput): ChangePasswordGateKind => {
  if (
    !isSeedlessLoginFlow ||
    !isMfaUiKitEnabled ||
    activeTwoStepMethods.length === 0
  ) {
    return 'legacy';
  }
  return isLocalPassword ? 'password_device' : 'recovery_device';
};
