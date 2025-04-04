import { AuthData } from './Authentication';

class AuthenticationError extends Error {
  public authData: AuthData;
  public customErrorMessage: string;
  constructor(message: string, customErrorMessage: string, authData: AuthData) {
    super(message);
    this.authData = authData;
    this.customErrorMessage = customErrorMessage;
    // Set the prototype explicitly.
    // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export default AuthenticationError;
