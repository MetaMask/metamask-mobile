import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import type { ManageProfileTextEditorField } from './manageProfileTextEditorFields';

/**
 * The profile API rejects a field it will not store with 400. `ProfileService`
 * appends the API's own message to the thrown `HttpError`, but that message
 * describes the value the user typed, not which field was being edited, so the
 * field is read from the editor rather than from the error.
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
  displayName: 'social_leaderboard.errors.display_name_invalid',
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
