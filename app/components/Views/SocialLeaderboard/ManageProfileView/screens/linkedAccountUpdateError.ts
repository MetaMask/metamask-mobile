import {
  findProfileServiceError,
  ProfileApiErrorCode,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import { LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS } from '../errors/profileApiErrorMessageKeys';

/**
 * The Profile API refuses a change inside the cooldown window with
 * `PROFILE_LINKED_ADDRESSES_COOLDOWN`. The stable code is preferred; older
 * API deployments omit it, and a 403 plus the message remains the fallback.
 */
const LINKED_ADDRESS_COOLDOWN_STATUS = 403;

/** The API's cooldown explanation, capturing the length of the window. */
const LINKED_ADDRESS_COOLDOWN_PATTERN =
  /linked addresses can only be updated once every (\d+) days?/i;

/**
 * The message carried by a thrown error, or '' for a value that is not one.
 * Envelope-shaped API errors are read through `findProfileServiceError`; this
 * covers the older deployments that throw a plain `Error`.
 */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '';

/**
 * The cooldown copy: the window the refusal states, so it never overstates how
 * long the user must wait. The `RETRY_AFTER` detail is deliberately not used —
 * it is the time left, which shrinks as the cooldown elapses, and this copy
 * states the window. A refusal that states no day count uses the fallback key,
 * which spells out the 30-day policy window.
 */
const getCooldownCopy = (error: unknown): string => {
  const serviceError = findProfileServiceError(error);
  const message = serviceError?.message ?? getErrorMessage(error);
  const fromMessage = LINKED_ADDRESS_COOLDOWN_PATTERN.exec(message)?.[1];

  if (!fromMessage) {
    return strings(LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS.default);
  }

  return strings(LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS.other, {
    days: Number(fromMessage),
  });
};

/**
 * The copy explaining why the linked account could not be changed, or null
 * when the error is not a refusal this screen can explain. A dropped
 * connection, a server fault, or any other 403 keeps the generic save error.
 */
export const getLinkedAccountUpdateError = (error: unknown): string | null => {
  const code = findProfileServiceError(error)?.code;

  if (code) {
    if (code !== ProfileApiErrorCode.ProfileLinkedAddressesCooldown) {
      return null;
    }
  } else {
    const message = getErrorMessage(error);
    if (
      extractHttpStatus(error) !== LINKED_ADDRESS_COOLDOWN_STATUS ||
      !LINKED_ADDRESS_COOLDOWN_PATTERN.test(message)
    ) {
      return null;
    }
  }

  return getCooldownCopy(error);
};
