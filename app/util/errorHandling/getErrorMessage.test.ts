import { ErrorWithMessage, toErrorWithMessage } from './getErrorMessage';

describe('toErrorWithMessage()', () => {
  it('should return the input error if it is already an ErrorWithMessage', () => {
    const error: ErrorWithMessage = {
      message: 'Test error message',
    };
    const result = toErrorWithMessage(error);
    expect(result).toBe(error);
  });

  it('should return a new Error object with the JSON stringified input error if it is not an ErrorWithMessage', () => {
    const error = {
      code: 500,
      message: 'Internal Server Error',
    };
    const result = toErrorWithMessage(error);
    expect(result.message).toBe(error.message);
  });

  it('should return a new Error object with the string representation of the input error if JSON stringification fails', () => {
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
