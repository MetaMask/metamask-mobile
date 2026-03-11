import { isHttpUnauthorized } from './isHttpUnauthorized';

describe('isHttpUnauthorized', () => {
  it('returns true for HttpError with httpStatus 401', () => {
    expect(isHttpUnauthorized({ httpStatus: 401 })).toBe(true);
  });

  it('returns true for Axios-style error with status 401', () => {
    expect(isHttpUnauthorized({ status: 401 })).toBe(true);
  });

  it('returns false for non-401 httpStatus', () => {
    expect(isHttpUnauthorized({ httpStatus: 403 })).toBe(false);
  });

  it('returns false for non-401 status', () => {
    expect(isHttpUnauthorized({ status: 500 })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isHttpUnauthorized(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isHttpUnauthorized(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isHttpUnauthorized('401')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isHttpUnauthorized(401)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isHttpUnauthorized({})).toBe(false);
  });

  it('returns true when both httpStatus and status are 401', () => {
    expect(isHttpUnauthorized({ httpStatus: 401, status: 401 })).toBe(true);
  });

  it('returns true when only httpStatus is 401 and status is different', () => {
    expect(isHttpUnauthorized({ httpStatus: 401, status: 200 })).toBe(true);
  });

  it('returns true when only status is 401 and httpStatus is different', () => {
    expect(isHttpUnauthorized({ httpStatus: 200, status: 401 })).toBe(true);
  });
});
