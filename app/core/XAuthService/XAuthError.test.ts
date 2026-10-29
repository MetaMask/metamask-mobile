import { XAuthError, XAuthErrorType } from './XAuthError';

describe('XAuthError', () => {
  it('is an instance of Error with the given type and message', () => {
    const error = new XAuthError(
      XAuthErrorType.UserCancelled,
      'User cancelled the login process',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(XAuthError);
    expect(error.type).toBe(XAuthErrorType.UserCancelled);
    expect(error.message).toBe('User cancelled the login process');
  });

  it('supports each defined error type', () => {
    const types = [
      XAuthErrorType.UserCancelled,
      XAuthErrorType.NetworkFailure,
      XAuthErrorType.StateMismatch,
      XAuthErrorType.MissingCode,
      XAuthErrorType.BackendError,
    ];

    for (const type of types) {
      const error = new XAuthError(type, `message for ${type}`);
      expect(error.type).toBe(type);
    }
  });

  it('preserves the underlying cause when provided', () => {
    const cause = new Error('original failure');
    const error = new XAuthError(XAuthErrorType.BackendError, 'wrapped', {
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});
