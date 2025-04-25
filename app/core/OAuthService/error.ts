export enum Oauth2LoginErrors {
  UnknownError = 'UnknownError',
  UserCancelled = 'UserCancelled',
  UserDismissed = 'UserDismissed',
  LoginError = 'LoginError',
  InvalidProvider = 'InvalidProvider',
  UnsupportedPlatform = 'UnsupportedPlatform',
  LoginInProgress = 'LoginInProgress',
  AuthServerError = 'AuthServerError',
}

export class Oauth2LoginError extends Error {
    public readonly code: Oauth2LoginErrors;
    constructor(message: string | Error, code: Oauth2LoginErrors) {
      super(message instanceof Error ? message.message : message);
      this.code = code;
    }
}
