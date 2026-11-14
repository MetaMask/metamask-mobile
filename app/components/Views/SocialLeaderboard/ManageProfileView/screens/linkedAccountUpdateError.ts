import {
  findProfileServiceError,
  ProfileApiErrorCode,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import {
  LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS,
  LINKED_ADDRESS_COOLDOWN_POLICY_DAYS,
} from '../errors/profileApiErrorMessageKeys';

/**
 * The Profile API refuses a change inside the cooldown window with
 * `PROFILE_LINKED_ADDRESSES_COOLDOWN`. The stable code is preferred; older
 * API deployments omit it, and a 403 plus the message remains the fallback.
 */
const LINKED_ADDRESS_COOLDOWN_STATUS = 403;

/** The API's cooldown explanation, capturing the length of the window. */
const LINKED_ADDRESS_COOLDOWN_PATTERN =
  /linked addresses can only be updated once every (\d+) days/i;

const SECONDS_PER_DAY = 86_400;

/**
 * The message carried by a thrown error, or '' for a value that is not one.
 * Envelope-shaped API errors are read through `findProfileServiceError`; this
 * covers the older deployments that throw a plain `Error`.
 */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '';

/**
 * The time left in the cooldown, from the `RETRY_AFTER` detail. The message
 * carries the full window and does not shrink as the cooldown elapses, so it
 * is not a time left. A refusal without the detail returns null.
 */
const getCooldownDays = (error: unknown): number | null => {
  const retryAfterSeconds = findProfileServiceError(error)?.details?.find(
    (detail) => detail.code === 'RETRY_AFTER',
  )?.meta?.retry_after_seconds;

  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    return Math.ceil(retryAfterSeconds / SECONDS_PER_DAY);
  }

  return null;
};

/**
 * The cooldown copy: the time left when the refusal reports it. Otherwise the
 * window the message states, so the user is not told to wait longer than they
 * need to.
 */
const getCooldownCopy = (error: unknown): string => {
  const days = getCooldownDays(error);

  if (days !== null) {
    return strings(LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS.timeLeft, { days });
  }

  const serviceError = findProfileServiceError(error);
  const message = serviceError?.message ?? getErrorMessage(error);
  const fromMessage = LINKED_ADDRESS_COOLDOWN_PATTERN.exec(message)?.[1];

  return strings(LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS.window, {
    days: fromMessage
      ? Number(fromMessage)
      : LINKED_ADDRESS_COOLDOWN_POLICY_DAYS,
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
