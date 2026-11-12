import {
  findProfileServiceError,
  type ProfileApiErrorCodeId,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import {
  PROFILE_FIELD_REJECTION_CODES,
  PROFILE_FIELD_REJECTION_MESSAGE_KEYS,
  PROFILE_SAVE_ERROR_MESSAGE_KEYS,
} from '../errors/profileApiErrorMessageKeys';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';

/**
 * The profile API rejects a field it will not store with 400. The stable code
 * lives in the shared Profile API error module; older API deployments omit it
 * and keep the status fallback below.
 */
const REJECTED_CONTENT_STATUS = 400;

/** Whether the code names a refusal of some editor field. */
const isFieldRejectionCode = (code: string): boolean =>
  Object.values(PROFILE_FIELD_REJECTION_CODES).some((codes) =>
    codes?.includes(code as ProfileApiErrorCodeId),
  );

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

  if (code) {
    const fieldCodes = PROFILE_FIELD_REJECTION_CODES[field];

    if (fieldCodes?.some((fieldCode) => fieldCode === code)) {
      return fieldMessageKey ? strings(fieldMessageKey) : null;
    }

    const messageKey = PROFILE_SAVE_ERROR_MESSAGE_KEYS[code];
    if (messageKey) {
      return strings(messageKey);
    }

    // The code refused a different field, so this editor is not the one to
    // explain it.
    if (isFieldRejectionCode(code)) {
      return null;
    }
  }

  // A 400 still refuses the value in the field when its code has no copy of
  // its own: older deployments send no code, and newer ones can answer a
  // field rejection with a generic `VALIDATION_FAILED`.
  return fieldMessageKey &&
    extractHttpStatus(error) === REJECTED_CONTENT_STATUS
    ? strings(fieldMessageKey)
    : null;
};
