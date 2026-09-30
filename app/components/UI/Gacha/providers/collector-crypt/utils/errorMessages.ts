import { strings } from '../../../../../../../locales/i18n';
import type { CollectorCryptErrorCode } from '../types';
import { isCollectorCryptErrorCode } from '../services/errors';

const ERROR_MESSAGE_KEYS: Record<CollectorCryptErrorCode, string> = {
  NETWORK_ERROR: 'gacha.errors.network_error',
  RATE_LIMITED: 'gacha.errors.rate_limited',
  MACHINE_UNAVAILABLE: 'gacha.errors.machine_unavailable',
  INVALID_RESPONSE: 'gacha.errors.invalid_response',
  SIGNING_REJECTED: 'gacha.errors.signing_rejected',
  SNAP_UNSUPPORTED: 'gacha.errors.snap_unsupported',
  SUBMIT_FAILED: 'gacha.errors.submit_failed',
  PACK_EXPIRED: 'gacha.errors.pack_expired',
  PACK_FAILED: 'gacha.errors.pack_failed',
  OPEN_PENDING: 'gacha.errors.open_pending',
  BUYBACK_UNAVAILABLE: 'gacha.errors.buyback_unavailable',
  SALE_PENDING: 'gacha.errors.sale_pending',
  NOT_FOUND: 'gacha.errors.not_found',
  UNKNOWN: 'gacha.errors.unknown',
};

/** Error code carried by a thrown error or a stored error state, else `UNKNOWN`. */
export const getCollectorCryptErrorCode = (
  error: unknown,
): CollectorCryptErrorCode => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
  return isCollectorCryptErrorCode(code) ? code : 'UNKNOWN';
};

/** Localized, user-facing message for an error code. */
export const getCollectorCryptErrorMessage = (
  code: CollectorCryptErrorCode | undefined,
): string => strings(ERROR_MESSAGE_KEYS[code ?? 'UNKNOWN']);

/** Localized message for anything thrown or stored (raw messages are never shown). */
export const getErrorMessageFromUnknown = (error: unknown): string =>
  getCollectorCryptErrorMessage(getCollectorCryptErrorCode(error));
