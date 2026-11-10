import { findProfileServiceError } from '@metamask/profile-controller';
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

/**
 * The copy for a field the server refused, or null when the error is not a
 * rejection this screen can explain.
 */
export const getProfileSaveError = (
  error: unknown,
  field: ManageProfileTextEditorField,
): string | null => {
  const code = findProfileServiceError(error)?.code;

  if (code) {
    const fieldCodes = PROFILE_FIELD_REJECTION_CODES[field];
    const fieldMessageKey = PROFILE_FIELD_REJECTION_MESSAGE_KEYS[field];

    if (
      fieldCodes?.some((fieldCode) => fieldCode === code) &&
      fieldMessageKey
    ) {
      return strings(fieldMessageKey);
    }

    const messageKey = PROFILE_SAVE_ERROR_MESSAGE_KEYS[code];
    return messageKey ? strings(messageKey) : null;
  }

  // Older responses omit the code; keep the existing status-based mapping so
  // the copy does not regress before the API change ships.
  const fallbackMessageKey = PROFILE_FIELD_REJECTION_MESSAGE_KEYS[field];
  return fallbackMessageKey &&
    extractHttpStatus(error) === REJECTED_CONTENT_STATUS
    ? strings(fallbackMessageKey)
    : null;
};
