import { parseUserFacingError } from './parseUserFacingError';

const FALLBACK = 'Something went wrong';

describe('parseUserFacingError', () => {
  it('extracts nested error.message from an HTTP error string', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/otp/verify failed with status '400': {"error":{"statusCode":400,"message":"Invalid OTP"}}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe('Invalid OTP');
  });

  it('extracts top-level message from JSON body', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/user failed with status '422': {"message":"Email already registered"}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(
      'Email already registered',
    );
  });

  it('extracts string error field from JSON body', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/order failed with status '500': {"error":"Internal server error"}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(
      'Internal server error',
    );
  });

  it('returns fallback for HTTP-looking error with unparseable JSON', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/data failed with status '502': not json`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for HTTP-looking error with no JSON', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/data failed with status '500'`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the raw message for non-HTTP errors', () => {
    const plainError = new Error(
      'State token is required for OTP verification',
    );
    expect(parseUserFacingError(plainError, FALLBACK)).toBe(
      'State token is required for OTP verification',
    );
  });

  it('returns fallback when error is null', () => {
    expect(parseUserFacingError(null, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback when error is undefined', () => {
    expect(parseUserFacingError(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('handles string errors directly', () => {
    expect(parseUserFacingError('Network timeout', FALLBACK)).toBe(
      'Network timeout',
    );
  });

  it('returns fallback for empty string errors', () => {
    expect(parseUserFacingError('', FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for Error with empty message', () => {
    expect(parseUserFacingError(new Error(''), FALLBACK)).toBe(FALLBACK);
  });

  it('handles JSON body where error.message is empty', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/x failed with status '400': {"error":{"statusCode":400,"message":""}}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(FALLBACK);
  });

  it('handles deeply nested error objects gracefully', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/x failed with status '400': {"error":{"statusCode":400}}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe(FALLBACK);
  });

  it('handles non-Error objects', () => {
    expect(parseUserFacingError({ foo: 'bar' }, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for numeric errors', () => {
    expect(parseUserFacingError(42, FALLBACK)).toBe(FALLBACK);
  });

  it('trims whitespace from extracted messages', () => {
    const httpError = new Error(
      `Fetching https://api.example.com/x failed with status '400': {"error":{"statusCode":400,"message":"  Invalid OTP  "}}`,
    );
    expect(parseUserFacingError(httpError, FALLBACK)).toBe('Invalid OTP');
  });
});
