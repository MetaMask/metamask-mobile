export enum OAuthErrorType {
  UnknownError = 10001,
  UserCancelled = 10002,
  UserDismissed = 10003,
  LoginError = 10004,
  InvalidProvider = 10005,
  UnsupportedPlatform = 10006,
  LoginInProgress = 10007,
  AuthServerError = 10008,
  InvalidGetAuthTokenParams = 10009,
  InvalidOauthStateError = 10010,
  GoogleLoginError = 10011,
  AppleLoginError = 10012,
  GoogleLoginNoCredential = 10013,
  GoogleLoginNoMatchingCredential = 10014,
}

export const OAuthErrorMessages: Record<OAuthErrorType, string> = {
  [OAuthErrorType.UnknownError]: 'Unknown error',
  [OAuthErrorType.UserCancelled]: 'User cancelled',
  [OAuthErrorType.UserDismissed]: 'User dismissed',
  [OAuthErrorType.LoginError]: 'Login error',
  [OAuthErrorType.InvalidProvider]: 'Invalid provider',
  [OAuthErrorType.UnsupportedPlatform]: 'Unsupported platform',
  [OAuthErrorType.LoginInProgress]: 'Login in progress',
  [OAuthErrorType.AuthServerError]: 'Auth server error',
  [OAuthErrorType.InvalidGetAuthTokenParams]: 'Invalid auth token params',
  [OAuthErrorType.InvalidOauthStateError]: 'Invalid OAuth state',
  [OAuthErrorType.GoogleLoginError]: 'Google login error',
  [OAuthErrorType.AppleLoginError]: 'Apple login error',
  [OAuthErrorType.GoogleLoginNoCredential]: 'Google login has no credential',
  [OAuthErrorType.GoogleLoginNoMatchingCredential]:
    'Google login has no matching credential',
} as const;

export class OAuthError extends Error {
  public readonly code: OAuthErrorType;

  constructor(errMessage: string | Error, code: OAuthErrorType) {
    if (errMessage instanceof Error) {
      super(errMessage.message);
      this.stack = errMessage.stack;
      this.name = errMessage.name;
    } else {
      super(errMessage);
    }
    this.message = `${OAuthErrorMessages[code]} - ${errMessage}`;
    this.code = code;
  }
}
