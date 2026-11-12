import {
  findProfileServiceError,
  ProfileApiErrorCode,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { extractHttpStatus } from '../../../../../util/social/socialServiceTelemetry';
import { LINKED_ADDRESS_COOLDOWN_MESSAGE_KEY } from '../errors/profileApiErrorMessageKeys';

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
 * The cooldown window in days. The message carries the full window; the
 * `RETRY_AFTER` detail carries the remaining time, which is the whole window
 * on the race path where the message has no day count. Both are read
 * defensively: an error without either keeps the generic save copy.
 */
const getCooldownDays = (error: unknown): string | undefined => {
  const serviceError = findProfileServiceError(error);
  const message =
    serviceError?.message ?? (error instanceof Error ? error.message : '');
  const fromMessage = LINKED_ADDRESS_COOLDOWN_PATTERN.exec(message)?.[1];

  if (fromMessage) {
    return fromMessage;
  }

  const retryAfterSeconds = serviceError?.details?.find(
    (detail) => detail.code === 'RETRY_AFTER',
  )?.meta?.retry_after_seconds;

  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    return String(Math.ceil(retryAfterSeconds / SECONDS_PER_DAY));
  }

  return undefined;
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
    const message = error instanceof Error ? error.message : '';
    if (
      extractHttpStatus(error) !== LINKED_ADDRESS_COOLDOWN_STATUS ||
      !LINKED_ADDRESS_COOLDOWN_PATTERN.test(message)
    ) {
      return null;
    }
  }

  const cooldownDays = getCooldownDays(error);
  if (!cooldownDays) {
    return null;
  }

  return strings(LINKED_ADDRESS_COOLDOWN_MESSAGE_KEY, {
    days: cooldownDays,
  });
};
