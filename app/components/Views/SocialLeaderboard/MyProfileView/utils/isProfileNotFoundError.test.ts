import { isProfileNotFoundError } from './isProfileNotFoundError';

describe('isProfileNotFoundError', () => {
  it('returns true when the error status is 404', () => {
    expect(isProfileNotFoundError({ status: 404, message: 'missing' })).toBe(
      true,
    );
  });

  it('returns true when the error message includes 404', () => {
    expect(isProfileNotFoundError(new Error('GET_PROFILE_FAILED: 404'))).toBe(
      true,
    );
  });

  it('returns true for the HttpError shape thrown by ProfileService', () => {
    const error = Object.assign(
      new Error('ProfileService: failed to get profile: 404'),
      { httpStatus: 404 },
    );

    expect(isProfileNotFoundError(error)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isProfileNotFoundError(new Error('GET_PROFILE_FAILED: 500'))).toBe(
      false,
    );
    expect(
      isProfileNotFoundError(
        Object.assign(new Error('ProfileService: failed: 500'), {
          httpStatus: 500,
        }),
      ),
    ).toBe(false);
    expect(isProfileNotFoundError(null)).toBe(false);
  });
});
