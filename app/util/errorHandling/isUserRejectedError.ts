import { containsUserRejectedError } from '../middlewares';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

export const getErrorLike = (error: unknown): ErrorLike | undefined =>
  typeof error === 'object' && error !== null
    ? (error as ErrorLike)
    : undefined;

export const getErrorCode = (error: unknown): number | undefined => {
  const code = getErrorLike(error)?.code;

  if (typeof code === 'number') {
    return code;
  }

  if (typeof code === 'string') {
    const numericCode = Number(code);
    return Number.isNaN(numericCode) ? undefined : numericCode;
  }

  return undefined;
};

export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const message = getErrorLike(error)?.message;
  return typeof message === 'string' ? message : fallbackMessage;
};

export const isUserRejectedError = (
  error: unknown,
  fallbackMessage: string,
): boolean =>
  containsUserRejectedError(
    getErrorMessage(error, fallbackMessage),
    getErrorCode(error),
  );
