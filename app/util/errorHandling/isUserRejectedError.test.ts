import {
  getErrorCode,
  getErrorLike,
  getErrorMessage,
  isUserRejectedError,
} from './isUserRejectedError';

describe('getErrorLike', () => {
  it('returns an object error with code and message fields', () => {
    const error = { code: 4001, message: 'User rejected request' };

    expect(getErrorLike(error)).toBe(error);
  });

  it('returns undefined for a non-object error', () => {
    expect(getErrorLike('User rejected request')).toBeUndefined();
  });

  it('returns undefined for a null error', () => {
    expect(getErrorLike(null)).toBeUndefined();
  });
});

describe('getErrorCode', () => {
  it('returns a numeric error code', () => {
    expect(getErrorCode({ code: 4001 })).toBe(4001);
  });

  it('converts a numeric string error code', () => {
    expect(getErrorCode({ code: '4001' })).toBe(4001);
  });

  it('returns undefined for a nonnumeric error code', () => {
    expect(getErrorCode({ code: 'USER_REJECTED' })).toBeUndefined();
  });

  it('returns undefined when error has no code', () => {
    expect(getErrorCode({ message: 'User rejected request' })).toBeUndefined();
  });
});

describe('getErrorMessage', () => {
  it('returns a string error message', () => {
    expect(
      getErrorMessage({ message: 'User rejected request' }, 'Fallback'),
    ).toBe('User rejected request');
  });

  it('returns fallback message when error message is not a string', () => {
    expect(getErrorMessage({ message: 4001 }, 'Fallback')).toBe('Fallback');
  });
});

describe('isUserRejectedError', () => {
  it('returns true for a rejected error message', () => {
    expect(
      isUserRejectedError(
        { message: 'User rejected request' },
        'Fallback message',
      ),
    ).toBe(true);
  });

  it('returns true for a rejected error code', () => {
    expect(isUserRejectedError({ code: '4001' }, 'Fallback message')).toBe(
      true,
    );
  });

  it('returns false for an unrelated error', () => {
    expect(isUserRejectedError(new Error('Deposit failed'), 'Fallback')).toBe(
      false,
    );
  });
});
