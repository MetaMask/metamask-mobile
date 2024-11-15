import { ErrorWithMessage, toErrorWithMessage } from './getErrorMessage';

describe('toErrorWithMessage()', () => {
  it('returns the input when error is an ErrorWithMessage', () => {
    const error: ErrorWithMessage = {
      message: 'Test error message',
    };
    const result = toErrorWithMessage(error);
    expect(result).toBe(error);
  });

  it('returns an Error object using input message when error is not an ErrorWithMessage', () => {
    const error = {
      code: 500,
      message: 'Internal Server Error',
    };
    const result = toErrorWithMessage(error);
    expect(result.message).toBe(error.message);
  });

  it('returns an Error object with input error as string when JSON stringification fails', () => {
    const error = new Error('Test error');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularReference: { error: Error; circularReference?: any } = {
      error,
    };
    circularReference.circularReference = circularReference;
    const result = toErrorWithMessage(circularReference);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(String(circularReference));
  });
});
