import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';

/**
 * A change to `linked_addresses` inside the 30-day window is refused with 403,
 * but 403 is also what the API answers when it will not let this user touch the
 * linked account at all. Only the body tells them apart, and `ProfileService`
 * puts it on the error:
 * `ProfileService: failed to update profile: 403: Linked addresses can only be
 * updated once every 30 days`.
 *
 * Matching the message rather than the status keeps a refusal the user can wait
 * out from being reported as one they cannot.
 */
const LINKED_ADDRESS_COOLDOWN_STATUS = 403;

/** The API's cooldown explanation, capturing the length of the window. */
const LINKED_ADDRESS_COOLDOWN_PATTERN =
  /linked addresses can only be updated once every (\d+) days/i;

/**
 * The copy explaining why the linked account could not be changed, or null
 * when the error is not a refusal this screen can explain. A dropped
 * connection, a server fault, or any other 403 keeps the generic save error.
 */
export const getLinkedAccountUpdateError = (error: unknown): string | null => {
  if (extractHttpStatus(error) !== LINKED_ADDRESS_COOLDOWN_STATUS) {
    return null;
  }

  const message = error instanceof Error ? error.message : '';
  const cooldownDays = LINKED_ADDRESS_COOLDOWN_PATTERN.exec(message)?.[1];

  if (!cooldownDays) {
    return null;
  }

  return strings('social_leaderboard.manage_profile.linked_account_cooldown', {
    days: cooldownDays,
  });
};
