import { strings } from '../../../../locales/i18n';
import type { MfaFlowErrorCode } from '../../../util/identity/mfa';
import type { MfaMethod } from '../../../util/identity/mfa/engine/types';

const METHOD_KEYS: Record<MfaMethod, string> = {
  email_otp: 'mfa.method_email',
  passkey: 'mfa.method_passkey',
};

const ERROR_KEYS: Partial<Record<MfaFlowErrorCode, string>> = {
  invalid_code: 'mfa.errors.invalid_code',
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
};

export const getMethodLabel = (method: MfaMethod): string =>
  strings(METHOD_KEYS[method]);

export const getErrorMessage = (code: MfaFlowErrorCode): string =>
  strings(ERROR_KEYS[code] ?? 'mfa.errors.generic');
