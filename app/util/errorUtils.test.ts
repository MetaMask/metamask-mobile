import { ensureError } from './errorUtils';

describe('ensureError', () => {
  it('returns the same Error instance when passed an Error', () => {
    const originalError = new Error('Test error');

    const result = ensureError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe('Test error');
  });

  it('converts string to Error with the string as message', () => {
    const result = ensureError('String error message');

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('String error message');
  });

  it('converts number to Error with number as string message', () => {
    const result = ensureError(42);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('42');
  });

  it('converts null to Error with descriptive message', () => {
    const result = ensureError(null);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error (no details provided)');
  });

  it('converts undefined to Error with descriptive message', () => {
    const result = ensureError(undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Unknown error (no details provided)');
  });

  it('includes context in message when provided with undefined', () => {
    const result = ensureError(undefined, 'PerpsConnectionProvider.connect');

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(
      'Unknown error (no details provided) [PerpsConnectionProvider.connect]',
    );
  });

  it('includes context in message when provided with null', () => {
    const result = ensureError(null, 'PerpsStreamManager.prewarm');

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(
      'Unknown error (no details provided) [PerpsStreamManager.prewarm]',
    );
  });

  it('does not modify Error instance when context is provided', () => {
    const originalError = new Error('Original error');

    const result = ensureError(originalError, 'SomeContext');

    expect(result).toBe(originalError);
    expect(result.message).toBe('Original error');
  });

  it('does not include context for string errors', () => {
    const result = ensureError('String error', 'SomeContext');

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('String error');
  });

  it('converts object to Error with stringified object as message', () => {
    const obj = { code: 'ERROR_CODE', details: 'Some details' };

    const result = ensureError(obj);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('[object Object]');
  });

  it('converts boolean to Error with string representation', () => {
    const result = ensureError(false);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('false');
  });

  it('preserves Error subclasses', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const customError = new CustomError('Custom error message');

    const result = ensureError(customError);

    expect(result).toBe(customError);
    expect(result).toBeInstanceOf(CustomError);
    expect(result.name).toBe('CustomError');
    expect(result.message).toBe('Custom error message');
  });
});
