import { strings } from '../../../../../../../locales/i18n';
import type { PackPartnerErrorCode } from '../types';
import { isPackPartnerErrorCode } from '../services/errors';

const ERROR_MESSAGE_KEYS: Record<PackPartnerErrorCode, string> = {
  CONFIGURATION_ERROR: 'collectibles.errors.configuration_error',
  NETWORK_ERROR: 'collectibles.errors.network_error',
  RATE_LIMITED: 'collectibles.errors.rate_limited',
  MACHINE_UNAVAILABLE: 'collectibles.errors.machine_unavailable',
  INVALID_RESPONSE: 'collectibles.errors.invalid_response',
  SIGNING_REJECTED: 'collectibles.errors.signing_rejected',
  SNAP_UNSUPPORTED: 'collectibles.errors.snap_unsupported',
  SUBMIT_FAILED: 'collectibles.errors.submit_failed',
  PACK_EXPIRED: 'collectibles.errors.pack_expired',
  PACK_FAILED: 'collectibles.errors.pack_failed',
  OPEN_PENDING: 'collectibles.errors.open_pending',
  BUYBACK_UNAVAILABLE: 'collectibles.errors.buyback_unavailable',
  OFFER_CHANGED: 'collectibles.errors.offer_changed',
  SALE_PENDING: 'collectibles.errors.sale_pending',
  NOT_FOUND: 'collectibles.errors.not_found',
  UNKNOWN: 'collectibles.errors.unknown',
};

/** Error code carried by a thrown error or a stored error state, else `UNKNOWN`. */
export const getPackPartnerErrorCode = (
  error: unknown,
): PackPartnerErrorCode => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
  return isPackPartnerErrorCode(code) ? code : 'UNKNOWN';
};

/** Localized, user-facing message for an error code. */
export const getPackPartnerErrorMessage = (
  code: PackPartnerErrorCode | undefined,
): string => strings(ERROR_MESSAGE_KEYS[code ?? 'UNKNOWN']);

/** Localized message for anything thrown or stored (raw messages are never shown). */
export const getErrorMessageFromUnknown = (error: unknown): string =>
  getPackPartnerErrorMessage(getPackPartnerErrorCode(error));
