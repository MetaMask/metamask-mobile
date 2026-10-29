export enum XAuthErrorType {
  UserCancelled = 'USER_CANCELLED',
  NetworkFailure = 'NETWORK_FAILURE',
  StateMismatch = 'STATE_MISMATCH',
  MissingCode = 'MISSING_CODE',
  BackendError = 'BACKEND_ERROR',
  NotSignedIn = 'NOT_SIGNED_IN',
  NoEvmAccount = 'NO_EVM_ACCOUNT',
}

export class XAuthError extends Error {
  public readonly type: XAuthErrorType;

  constructor(
    type: XAuthErrorType,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.type = type;
    this.name = 'XAuthError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
