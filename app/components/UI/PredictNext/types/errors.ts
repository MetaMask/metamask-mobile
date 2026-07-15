/**
 * Canonical PredictNext error codes. The POC backend echoes these in its error
 * envelope; mobile maps unknown codes to `UNKNOWN_ERROR`.
 *
 * Trimmed to the codes the Kalshi POC actually uses. Full error taxonomy is in
 * `docs/error-handling.md`.
 */
export enum PredictErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  VENUE_ERROR = 'VENUE_ERROR',
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  VENUE_UNAUTHENTICATED = 'VENUE_UNAUTHENTICATED',
  VENUE_PERMISSION_DENIED = 'VENUE_PERMISSION_DENIED',
  UNSUPPORTED_VENUE_CAPABILITY = 'UNSUPPORTED_VENUE_CAPABILITY',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  ACCOUNT_EXISTS = 'ACCOUNT_EXISTS',
  EXTERNAL_USER_ID_TAKEN = 'EXTERNAL_USER_ID_TAKEN',
  INVALID_OR_EXPIRED_CODE = 'INVALID_OR_EXPIRED_CODE',
  KYC_PENDING = 'KYC_PENDING',
  PAYOUT_METHOD_INVALID = 'PAYOUT_METHOD_INVALID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SETUP_REQUIRED = 'SETUP_REQUIRED',
}

export class PredictError extends Error {
  readonly code: PredictErrorCode;
  readonly venueDetails?: unknown;
  constructor(code: PredictErrorCode, message: string, venueDetails?: unknown) {
    super(message);
    this.name = 'PredictError';
    this.code = code;
    this.venueDetails = venueDetails;
  }
}
