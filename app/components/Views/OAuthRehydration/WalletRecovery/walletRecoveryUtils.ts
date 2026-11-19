import type { VerificationToken } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import type { AuthData } from '../../../../core/Authentication/Authentication';
import { getMfaRecoveryErrorCode } from '../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import {
  PasswordlessRecoveryError,
  type PasswordlessRecoveryStage,
} from '../../../../core/MfaRecovery/passwordlessSocialRecovery';

/** Label for Figma "Since {{biometryType}} isn't enabled…" copy. */
export const labelForBiometryType = (
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
export const isHeldAal2Valid = (token: VerificationToken | null): boolean => {
  if (!token) {
    return false;
  }
  return Date.now() < token.obtainedAt + token.expiresIn * 1000;
};

/** Whether the device can show a biometrics / device-auth sheet. */
export const offersDeviceBiometrics = (authData: AuthData): boolean =>
  Boolean(authData.availableBiometryType) ||
  authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC ||
  authData.currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION;

/** Auth type to prompt for: keeps device auth, otherwise biometrics. */
export const biometricAuthTypeFor = (
  currentAuthType: AUTHENTICATION_TYPE,
): AUTHENTICATION_TYPE =>
  currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC ||
  currentAuthType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
    ? currentAuthType
    : AUTHENTICATION_TYPE.BIOMETRIC;

/** Loggable summary of a recovery failure. Never includes secrets. */
export const describeRecoveryError = (
  error: unknown,
): { stage?: PasswordlessRecoveryStage; code: string } =>
  error instanceof PasswordlessRecoveryError
    ? { stage: error.stage, code: error.code }
    : { code: getMfaRecoveryErrorCode(error) };
