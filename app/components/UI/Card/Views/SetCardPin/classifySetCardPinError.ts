import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';

export type SetCardPinErrorKind =
  | 'invalid_pin'
  | 'forbidden'
  | 'auth'
  | 'retryable'
  | 'unknown';

const AUTH_ERROR_CODES = new Set(['FORBIDDEN', 'LIVENESS_MISMATCH']);

/**
 * Maps provider/API errors for the set-PIN flow without disclosing which
 * Immersve rule matched, and without including the PIN.
 */
export function classifySetCardPinError(error: unknown): SetCardPinErrorKind {
  if (!(error instanceof CardProviderError)) {
    return 'unknown';
  }

  if (
    error.code === CardProviderErrorCode.InvalidCredentials ||
    (error.code === CardProviderErrorCode.Forbidden &&
      error.errorCode != null &&
      AUTH_ERROR_CODES.has(error.errorCode))
  ) {
    return 'auth';
  }

  if (
    error.code === CardProviderErrorCode.Forbidden &&
    error.errorCode === 'CARD_SET_PIN_FORBIDDEN'
  ) {
    return 'forbidden';
  }

  if (
    error.code === CardProviderErrorCode.Forbidden &&
    error.errorCode === 'INVALID_PIN_FORMAT'
  ) {
    return 'invalid_pin';
  }

  if (error.statusCode === 400) {
    return 'invalid_pin';
  }

  if (
    error.code === CardProviderErrorCode.Network ||
    error.code === CardProviderErrorCode.Timeout ||
    error.code === CardProviderErrorCode.ServerError
  ) {
    return 'retryable';
  }

  return 'retryable';
}
