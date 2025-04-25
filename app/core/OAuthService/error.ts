export enum OAuthErrorType {
  UnknownError = 'UnknownError',
  UserCancelled = 'UserCancelled',
  UserDismissed = 'UserDismissed',
  LoginError = 'LoginError',
  InvalidProvider = 'InvalidProvider',
  UnsupportedPlatform = 'UnsupportedPlatform',
  LoginInProgress = 'LoginInProgress',
  AuthServerError = 'AuthServerError',
}

export class OAuthError extends Error {
  public readonly code: OAuthErrorType;
  constructor(message: string | Error, code: OAuthErrorType) {
    super(message instanceof Error ? message.message : message);
    this.code = code;
  }
}
