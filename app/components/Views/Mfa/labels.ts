import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../util/date';
import type { MfaFlowErrorCode } from '../../../util/identity/mfa';
import type { MfaMethod } from '../../../util/identity/mfa/engine/types';

const METHOD_KEYS: Record<MfaMethod, string> = {
  email_otp: 'mfa.method_email',
  passkey: 'mfa.method_passkey',
  totp: 'mfa.method_totp',
};

const ERROR_KEYS: Partial<Record<MfaFlowErrorCode, string>> = {
  invalid_code: 'mfa.errors.invalid_code',
  flow_expired: 'mfa.errors.code_expired',
  too_many_attempts: 'mfa.errors.too_many_attempts',
  invalid_assertion: 'mfa.errors.invalid_passkey',
  invalid_attestation: 'mfa.errors.invalid_passkey',
  passkey_ceremony_cancelled: 'mfa.errors.passkey_cancelled',
  credential_already_enrolled: 'mfa.errors.email_taken',
  otp_resend_cooldown: 'mfa.errors.cooldown',
  rate_limited: 'mfa.errors.cooldown',
  max_passkeys_reached: 'mfa.errors.limit_reached',
  max_identifiers_reached: 'mfa.errors.limit_reached',
  multi_primary_srp: 'mfa.errors.multi_primary_srp',
  authentication_required: 'mfa.errors.signed_out',
  passkey_unsupported: 'mfa.errors.unsupported',
  flow_in_progress: 'mfa.errors.flow_in_progress',
  totp_already_enrolled: 'mfa.errors.totp_taken',
};

/**
 * Wording for authenticator app codes, which the app shows rather than an
 * email: a new code is in the app, not requested.
 */
const TOTP_ERROR_KEYS: Partial<Record<MfaFlowErrorCode, string>> = {
  invalid_code: 'mfa.errors.invalid_totp_code',
  flow_expired: 'mfa.errors.totp_expired',
  invalid_flow: 'mfa.errors.totp_expired',
  too_many_attempts: 'mfa.errors.totp_too_many_attempts',
};

export const getMethodLabel = (method: MfaMethod): string =>
  strings(METHOD_KEYS[method]);

/**
 * Shows an email's first letter and domain only, as in `c•••@metamask.com`.
 *
 * @param email - The full address.
 * @returns The masked address.
 */
export const maskEmail = (email: string): string =>
  `${email[0]}•••${email.slice(email.indexOf('@'))}`;

/**
 * The message for errors that have their own, rather than the generic one.
 *
 * @param code - The error's code.
 * @param method - The method the error is about, when its wording differs.
 * @returns The message, or `undefined` for the generic case.
 */
export const getSpecificErrorMessage = (
  code: MfaFlowErrorCode,
  method?: MfaMethod,
): string | undefined => {
  const key =
    (method === 'totp' ? TOTP_ERROR_KEYS[code] : undefined) ?? ERROR_KEYS[code];
  return key ? strings(key) : undefined;
};

export const getErrorMessage = (
  code: MfaFlowErrorCode,
  method?: MfaMethod,
): string =>
  getSpecificErrorMessage(code, method) ?? strings('mfa.errors.generic');

/**
 * A passkey's name in settings, as in `Passkey #1 - 1Password`.
 *
 * @param credential - The passkey.
 * @param index - Its position among the active passkeys.
 * @returns The name.
 */
export const getPasskeyName = (
  credential: EnrolledCredential,
  index: number,
): string => {
  const number = index + 1;
  return credential.type === 'passkey' && credential.displayName
    ? strings('mfa.settings.passkey_name_with_provider', {
        number,
        provider: credential.displayName,
      })
    : strings('mfa.settings.passkey_name', { number });
};

/**
 * When a method was set up, as in `Added Sep 17, 2026 at 11:23 AM`.
 *
 * @param credential - The method.
 * @returns The line, or `undefined` when the server didn't say.
 */
export const getAddedOn = (
  credential: EnrolledCredential,
): string | undefined =>
  credential.enrolledAt
    ? strings('mfa.settings.added_on', {
        date: formatTimestampToDateTime(credential.enrolledAt),
      })
    : undefined;
