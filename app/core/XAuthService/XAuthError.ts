export enum XAuthErrorType {
  UserCancelled = 'USER_CANCELLED',
  NetworkFailure = 'NETWORK_FAILURE',
  TokenExchangeFailed = 'TOKEN_EXCHANGE_FAILED',
  StateMismatch = 'STATE_MISMATCH',
  NoStoredTokens = 'NO_STORED_TOKENS',
}

export class XAuthError extends Error {
  public readonly type: XAuthErrorType;

  constructor(type: XAuthErrorType, message: string) {
    super(message);
    this.type = type;
    this.name = 'XAuthError';
  }
}
