import { getErrorMessage, hasProperty } from '@metamask/utils';
import { HttpError, isFetchNetworkError } from '../../../services/http';
import type {
  CollectorCryptErrorCode,
  CollectorCryptErrorState,
} from '../types';

/** Provider-specific error exposed by CollectorCrypt operations. */
export interface CollectorCryptError extends Error {
  name: 'CollectorCryptError';
  code: CollectorCryptErrorCode;
  /** Whether retrying the same call later can succeed. */
  retryable: boolean;
  /** HTTP status, when the error comes from an HTTP response. */
  status?: number;
  cause?: unknown;
}

/** Exhaustive map of the codes, used to validate unknown values. */
const ERROR_CODES: Record<CollectorCryptErrorCode, true> = {
  NETWORK_ERROR: true,
  RATE_LIMITED: true,
  MACHINE_UNAVAILABLE: true,
  INVALID_RESPONSE: true,
  SIGNING_REJECTED: true,
  SNAP_UNSUPPORTED: true,
  SUBMIT_FAILED: true,
  PACK_EXPIRED: true,
  PACK_FAILED: true,
  OPEN_PENDING: true,
  BUYBACK_UNAVAILABLE: true,
  SALE_PENDING: true,
  NOT_FOUND: true,
  UNKNOWN: true,
};

/** Codes that are retryable unless the caller says otherwise. */
const RETRYABLE_BY_DEFAULT: readonly CollectorCryptErrorCode[] = [
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'OPEN_PENDING',
];

/** Whether a value is a known CollectorCrypt error code. */
export const isCollectorCryptErrorCode = (
  value: unknown,
): value is CollectorCryptErrorCode =>
  typeof value === 'string' && hasProperty(ERROR_CODES, value);

/** Builds a `CollectorCryptError`. `retryable` defaults per code. */
export const createCollectorCryptError = ({
  code,
  message,
  retryable,
  status,
  cause,
}: {
  code: CollectorCryptErrorCode;
  message?: string;
  retryable?: boolean;
  status?: number;
  cause?: unknown;
}): CollectorCryptError =>
  Object.assign(new Error(message ?? code), {
    name: 'CollectorCryptError' as const,
    code,
    retryable: retryable ?? RETRYABLE_BY_DEFAULT.includes(code),
    ...(status === undefined ? {} : { status }),
    ...(cause === undefined ? {} : { cause }),
  });

/** Type guard for `CollectorCryptError`. */
export const isCollectorCryptError = (
  error: unknown,
): error is CollectorCryptError =>
  error instanceof Error &&
  error.name === 'CollectorCryptError' &&
  isCollectorCryptErrorCode((error as Partial<CollectorCryptError>).code) &&
  typeof (error as Partial<CollectorCryptError>).retryable === 'boolean';

/**
 * Wraps anything: fetch TypeError/AbortError -> NETWORK_ERROR retryable;
 * CollectorCryptError passthrough; else fallback code.
 */
export const toCollectorCryptError = (
  error: unknown,
  fallback: CollectorCryptErrorCode = 'UNKNOWN',
): CollectorCryptError => {
  if (isCollectorCryptError(error)) {
    return error;
  }
  if (error instanceof HttpError) {
    return createCollectorCryptError({
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      status: error.status,
      cause: error,
    });
  }
  if (isFetchNetworkError(error)) {
    return createCollectorCryptError({
      code: 'NETWORK_ERROR',
      message: getErrorMessage(error) || undefined,
      retryable: true,
      cause: error,
    });
  }
  return createCollectorCryptError({
    code: fallback,
    message: getErrorMessage(error) || undefined,
    cause: error,
  });
};

/** Serializable form stored in controller state. */
export const toErrorState = (error: unknown): CollectorCryptErrorState => {
  const { code, message } = toCollectorCryptError(error);
  return message && message !== code ? { code, message } : { code };
};
