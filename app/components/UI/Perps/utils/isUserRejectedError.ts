import { containsUserRejectedError } from '../../../../util/middlewares';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

function getErrorLike(error: unknown): ErrorLike | undefined {
  return typeof error === 'object' && error !== null
    ? (error as ErrorLike)
    : undefined;
}

function getErrorCode(error: unknown): number | undefined {
  const code = getErrorLike(error)?.code;

  if (typeof code === 'number') {
    return code;
  }

  if (typeof code === 'string') {
    const numericCode = Number(code);
    return Number.isNaN(numericCode) ? undefined : numericCode;
  }

  return undefined;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  const message = getErrorLike(error)?.message;
  return typeof message === 'string' ? message : fallbackMessage;
}

/**
 * Whether an error was caused by the user rejecting/cancelling a request
 * (EIP-1193 code 4001 or a "user rejected/denied/cancelled" message).
 * These are expected outcomes and should not be reported to Sentry.
 */
export function isUserRejectedError(
  error: unknown,
  fallbackMessage: string,
): boolean {
  return containsUserRejectedError(
    getErrorMessage(error, fallbackMessage),
    getErrorCode(error),
  );
}
