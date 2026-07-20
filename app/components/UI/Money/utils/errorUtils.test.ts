import { getErrorCode, getErrorLike, getErrorMessage } from './errorUtils';

describe('getErrorLike', () => {
  it('returns an object error with code and message fields', () => {
    const error = { code: 4001, message: 'User rejected request' };

    const result = getErrorLike(error);

    expect(result).toBe(error);
  });

  it('returns undefined for a non-object error', () => {
    const error = 'User rejected request';

    const result = getErrorLike(error);

    expect(result).toBeUndefined();
  });

  it('returns undefined for a null error', () => {
    const error = null;

    const result = getErrorLike(error);

    expect(result).toBeUndefined();
  });
});

describe('getErrorCode', () => {
  it('returns a numeric error code', () => {
    const error = { code: 4001 };

    const result = getErrorCode(error);

    expect(result).toBe(4001);
  });

  it('converts a numeric string error code', () => {
    const error = { code: '4001' };

    const result = getErrorCode(error);

    expect(result).toBe(4001);
  });

  it('returns undefined for a nonnumeric error code', () => {
    const error = { code: 'USER_REJECTED' };

    const result = getErrorCode(error);

    expect(result).toBeUndefined();
  });

  it('returns undefined when error has no code', () => {
    const error = { message: 'User rejected request' };

    const result = getErrorCode(error);

    expect(result).toBeUndefined();
  });
});

describe('getErrorMessage', () => {
  it('returns a string error message', () => {
    const error = { message: 'User rejected request' };

    const result = getErrorMessage(error, 'Fallback message');

    expect(result).toBe('User rejected request');
  });

  it('returns fallback message when error message is not a string', () => {
    const error = { message: 4001 };

    const result = getErrorMessage(error, 'Fallback message');

    expect(result).toBe('Fallback message');
  });
});
