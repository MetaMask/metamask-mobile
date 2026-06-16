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
  GoogleLoginUserDisabledOneTapFeature = 10015,
  GoogleLoginOneTapFailure = 10016,
  GoogleLoginNoProviderDependencies = 10017,
  TelegramLoginError = 10018,
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
  [OAuthErrorType.GoogleLoginUserDisabledOneTapFeature]:
    'Google login user disabled one tap feature',
  [OAuthErrorType.GoogleLoginOneTapFailure]: 'Google login one tap failure',
  [OAuthErrorType.GoogleLoginNoProviderDependencies]:
    'Google login credential provider not available',
  [OAuthErrorType.TelegramLoginError]: 'Telegram login error',
} as const;

/**
 * Returns true when an OAuth provider error message indicates the user aborted
 * sign-in (cancel, dismiss, close) rather than a server or configuration failure.
 */
export function isOAuthUserCancellationMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('the user canceled the authorization attempt') ||
    normalized.includes('authorization error error 1001') ||
    normalized.includes('err_request_canceled') ||
    /user\s+cancel/.test(normalized) ||
    /\bcanceled\b/.test(normalized) ||
    /\bcancelled\b/.test(normalized) ||
    /16:\s*\[.*\]\s*cancel/.test(normalized) ||
    /\bdismiss/.test(normalized)
  );
}

export class OAuthError extends Error {
  public readonly code: OAuthErrorType;
  public readonly data: Record<string, unknown>;

  constructor(
    errMessage: string | Error,
    code: OAuthErrorType,
    data?: Record<string, unknown>,
  ) {
    if (errMessage instanceof Error) {
      super(errMessage.message);
      this.stack = errMessage.stack;
      this.name = errMessage.name;
    } else {
      super(errMessage);
    }
    this.message = `${OAuthErrorMessages[code]} - ${errMessage instanceof Error ? errMessage.message : errMessage}`;
    this.code = code;
    this.data = data || {};
  }
}

/**
 * Returns true when a social login attempt ended because the user closed or
 * cancelled the provider UI before completing authentication.
 */
export function isSocialLoginAuthSessionDismissed(error: unknown): boolean {
  if (!(error instanceof OAuthError)) {
    return false;
  }

  if (
    error.code === OAuthErrorType.UserCancelled ||
    error.code === OAuthErrorType.UserDismissed
  ) {
    return true;
  }

  if (
    error.code === OAuthErrorType.GoogleLoginError ||
    error.code === OAuthErrorType.AppleLoginError ||
    error.code === OAuthErrorType.UnknownError ||
    error.code === OAuthErrorType.GoogleLoginOneTapFailure
  ) {
    return isOAuthUserCancellationMessage(error.message);
  }

  return false;
}
