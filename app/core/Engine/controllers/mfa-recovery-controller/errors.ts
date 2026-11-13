/** Error raised by the MFA recovery integration. */
export class MfaRecoveryControllerError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MfaRecoveryControllerError';
    this.code = code;
  }
}

/** Returns a stable error code without exposing tokens or secrets. */
export function getMfaRecoveryErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'unknown_error';
  }
  const { code, errorCode, status } = error as Record<string, unknown>;
  if (typeof code === 'string' && code.length > 0) {
    return code;
  }
  if (typeof errorCode === 'string' && errorCode.length > 0) {
    return errorCode;
  }
  if (typeof status === 'number') {
    return `http_${status}`;
  }
  return 'unknown_error';
}
