import {
  findProfileServiceError,
  ProfileApiErrorCode,
  type ProfileApiErrorCodeId,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import {
  PROFILE_FIELD_REJECTION_CODES,
  PROFILE_FIELD_REJECTION_MESSAGE_KEYS,
  getProfileSaveErrorCopy,
} from '../errors/profileApiErrorMessageKeys';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';

/**
 * The profile API rejects a field it will not store with 400. The stable code
 * lives in the shared Profile API error module; older API deployments omit it
 * and keep the status fallback below.
 */
const REJECTED_CONTENT_STATUS = 400;

/** Every code that names a refusal of some editor field. */
const FIELD_REJECTION_CODES = new Set<string>(
  Object.values(PROFILE_FIELD_REJECTION_CODES).flatMap((codes) => codes ?? []),
);

/** Whether the code names a refusal of some editor field. */
const isFieldRejectionCode = (code: string): boolean =>
  FIELD_REJECTION_CODES.has(code);

/** Whether the code names a refusal of the field being edited. */
const isRejectedFieldCode = (
  code: string,
  field: ManageProfileTextEditorField,
): boolean =>
  PROFILE_FIELD_REJECTION_CODES[field]?.includes(
    code as ProfileApiErrorCodeId,
  ) ?? false;

/** The copy for a field the server refused, or null when it has none. */
const fieldRejectionCopy = (fieldMessageKey?: string): string | null =>
  fieldMessageKey ? strings(fieldMessageKey) : null;

/**
 * The field copy for a 400 that refuses the value in this field, even when the
 * code has no copy of its own.
 */
const rejectedValueCopy = (
  error: unknown,
  fieldMessageKey?: string,
): string | null =>
  extractHttpStatus(error) === REJECTED_CONTENT_STATUS
    ? fieldRejectionCopy(fieldMessageKey)
    : null;

/**
 * The copy for a field the server refused, or null when the error is not a
 * rejection this screen can explain.
 */
export const getProfileSaveError = (
  error: unknown,
  field: ManageProfileTextEditorField,
): string | null => {
  const code = findProfileServiceError(error)?.code;
  const fieldMessageKey = PROFILE_FIELD_REJECTION_MESSAGE_KEYS[field];

  // Older deployments send no code and rely on the status alone.
  if (!code) {
    return rejectedValueCopy(error, fieldMessageKey);
  }

  if (isRejectedFieldCode(code, field)) {
    return fieldRejectionCopy(fieldMessageKey);
  }

  const messageCopy = getProfileSaveErrorCopy(error);

  if (!messageCopy) {
    // The code refused a different field, so this editor is not the one to
    // explain it.
    return isFieldRejectionCode(code)
      ? null
      : rejectedValueCopy(error, fieldMessageKey);
  }

  // A 400 that refuses the value in this field keeps the field copy, even when
  // the envelope only says VALIDATION_FAILED.
  return code === ProfileApiErrorCode.ValidationFailed
    ? (rejectedValueCopy(error, fieldMessageKey) ?? messageCopy)
    : messageCopy;
};
