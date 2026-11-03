import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';

/**
 * The profile API rejects a field it will not store with 400. `ProfileService`
 * throws `HttpError(400, 'ProfileService: failed to update profile: 400')` and
 * drops the response body, so the status is all that reaches the client. Which
 * field was refused is therefore read from the editor, not from the error.
 */
const REJECTED_CONTENT_STATUS = 400;

/**
 * Copy for a field the server refused, keyed by the field being edited. Fields
 * left out keep the generic save error, which is the right answer for a
 * dropped connection.
 *
 * The handle is left out because its rules already have copy, and the
 * availability check runs before the save, so a 400 there adds nothing.
 */
const REJECTED_CONTENT_MESSAGE_KEYS: Partial<
  Record<ManageProfileTextEditorField, string>
> = {
  displayName: 'social_leaderboard.manage_profile.display_name_unavailable',
  bio: 'social_leaderboard.manage_profile.bio_prohibited',
};

/**
 * The copy for a field the server refused, or null when the error is not a
 * rejection this screen can explain.
 */
export const getProfileSaveError = (
  error: unknown,
  field: ManageProfileTextEditorField,
): string | null => {
  const messageKey = REJECTED_CONTENT_MESSAGE_KEYS[field];

  if (!messageKey || extractHttpStatus(error) !== REJECTED_CONTENT_STATUS) {
    return null;
  }

  return strings(messageKey);
};
