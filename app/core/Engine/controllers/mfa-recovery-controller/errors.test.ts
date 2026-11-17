import { MfaRecoveryControllerError, getMfaRecoveryErrorCode } from './errors';

describe('MfaRecoveryControllerError', () => {
  it('stores the message and code', () => {
    const error = new MfaRecoveryControllerError(
      'feature off',
      'feature_disabled',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MfaRecoveryControllerError');
    expect(error.message).toBe('feature off');
    expect(error.code).toBe('feature_disabled');
  });
});

describe('getMfaRecoveryErrorCode', () => {
  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('returns unknown_error for %s', (_label, error) => {
    expect(getMfaRecoveryErrorCode(error)).toBe('unknown_error');
  });

  it('returns code when present', () => {
    expect(getMfaRecoveryErrorCode({ code: 'feature_disabled' })).toBe(
      'feature_disabled',
    );
  });

  it('ignores an empty code string', () => {
    expect(getMfaRecoveryErrorCode({ code: '', errorCode: 'from_error' })).toBe(
      'from_error',
    );
  });

  it('returns errorCode when code is missing', () => {
    expect(getMfaRecoveryErrorCode({ errorCode: 'registration_failed' })).toBe(
      'registration_failed',
    );
  });

  it('ignores an empty errorCode string', () => {
    expect(getMfaRecoveryErrorCode({ errorCode: '', status: 503 })).toBe(
      'http_503',
    );
  });

  it('returns http_status when only status is present', () => {
    expect(getMfaRecoveryErrorCode({ status: 401 })).toBe('http_401');
  });

  it('returns unknown_error for an object without usable fields', () => {
    expect(getMfaRecoveryErrorCode({ message: 'nope' })).toBe('unknown_error');
  });

  it('prefers code over errorCode and status', () => {
    expect(
      getMfaRecoveryErrorCode({
        code: 'preferred',
        errorCode: 'secondary',
        status: 500,
      }),
    ).toBe('preferred');
  });
});
