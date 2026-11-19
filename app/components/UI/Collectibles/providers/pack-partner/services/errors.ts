import { hasProperty } from '@metamask/utils';
import type {
  PackPartnerErrorCode,
  PackPartnerErrorState,
} from '../types/packPartner';

/** Whether a fetch exception represents a network failure or timeout. */
export const isFetchNetworkError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    (error instanceof TypeError &&
      /network request failed|failed to fetch|fetch failed|load failed|network ?error|timed? ?out|aborted/iu.test(
        error.message,
      )));

/** Provider-specific error exposed by PackPartner operations. */
export interface PackPartnerError extends Error {
  name: 'PackPartnerError';
  code: PackPartnerErrorCode;
  /** Whether retrying the same call later can succeed. */
  retryable: boolean;
  /** HTTP status, when the error comes from an HTTP response. */
  status?: number;
  /** Allowlisted operation context, never a URL, account or received payload. */
  context?: string;
}

const ERROR_CONTEXTS = new Set([
  'GET /machines',
  'GET /status',
  'GET /getAllWinners',
  'GET /getNfts',
  'GET /cards',
  'GET /pack/status',
  'GET /buyback/available',
  'GET /buyback/check',
  'POST /generatePack',
  'POST /generateYoloPacks',
  'POST /submitTransaction',
  'POST /openPack',
  'POST /buyback',
  'Solana snap',
]);

/** Only errors created here may pass through without being normalized again. */
const safeErrors = new WeakSet<PackPartnerError>();

/** Exhaustive map of the codes, used to validate unknown values. */
const ERROR_CODES: Record<PackPartnerErrorCode, true> = {
  CONFIGURATION_ERROR: true,
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
  OFFER_CHANGED: true,
  SALE_PENDING: true,
  NOT_FOUND: true,
  UNKNOWN: true,
};

/** Codes that are retryable unless the caller says otherwise. */
const RETRYABLE_BY_DEFAULT: readonly PackPartnerErrorCode[] = [
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'OPEN_PENDING',
];

/** Whether a value is a known PackPartner error code. */
export const isPackPartnerErrorCode = (
  value: unknown,
): value is PackPartnerErrorCode =>
  typeof value === 'string' && hasProperty(ERROR_CODES, value);

/** Builds an error from safe fields only. Never retain raw messages or causes. */
export const createPackPartnerError = ({
  code,
  retryable,
  status,
  context,
}: {
  code: PackPartnerErrorCode;
  retryable?: boolean;
  status?: number;
  context?: string;
}): PackPartnerError => {
  const safeContext =
    context && ERROR_CONTEXTS.has(context) ? context : undefined;
  const safeStatus =
    status !== undefined &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
      ? status
      : undefined;
  const message = `${safeContext ? `${safeContext}: ` : ''}${code}${
    safeStatus === undefined ? '' : ` (HTTP ${safeStatus})`
  }`;
  const error = Object.assign(new Error(message), {
    name: 'PackPartnerError' as const,
    code,
    retryable: retryable ?? RETRYABLE_BY_DEFAULT.includes(code),
    ...(safeStatus === undefined ? {} : { status: safeStatus }),
    ...(safeContext === undefined ? {} : { context: safeContext }),
  });
  safeErrors.add(error);
  return error;
};

/** Type guard for `PackPartnerError`. */
export const isPackPartnerError = (error: unknown): error is PackPartnerError =>
  error instanceof Error &&
  error.name === 'PackPartnerError' &&
  isPackPartnerErrorCode((error as Partial<PackPartnerError>).code) &&
  typeof (error as Partial<PackPartnerError>).retryable === 'boolean';

/**
 * Wraps anything: fetch TypeError/AbortError -> NETWORK_ERROR retryable;
 * PackPartnerError passthrough; else fallback code.
 */
export const toPackPartnerError = (
  error: unknown,
  fallback: PackPartnerErrorCode = 'UNKNOWN',
): PackPartnerError => {
  if (isPackPartnerError(error)) {
    return safeErrors.has(error)
      ? error
      : createPackPartnerError({
          code: error.code,
          status: error.status,
          retryable: error.retryable,
          context: error.context,
        });
  }
  if (isFetchNetworkError(error)) {
    return createPackPartnerError({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  }
  return createPackPartnerError({
    code: fallback,
  });
};

/** Serializable form stored in controller state. */
export const toErrorState = (error: unknown): PackPartnerErrorState => ({
  code: toPackPartnerError(error).code,
});
