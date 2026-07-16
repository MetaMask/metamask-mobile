import type { ErrorLike } from '../types/error';

export function getErrorLike(error: unknown): ErrorLike | undefined {
  return typeof error === 'object' && error !== null
    ? (error as ErrorLike)
    : undefined;
}

export function getErrorCode(error: unknown): number | undefined {
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

export function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const message = getErrorLike(error)?.message;
  return typeof message === 'string' ? message : fallbackMessage;
}
