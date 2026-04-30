import { isAbortError, ensureError } from './errorUtils';

describe('errorUtils', () => {
  describe('isAbortError', () => {
    it('returns true for Error with name AbortError', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';

      expect(isAbortError(error)).toBe(true);
    });

    it('returns true for Error with "signal is aborted" message', () => {
      const error = new Error('AbortError: signal is aborted without reason');

      expect(isAbortError(error)).toBe(true);
    });

    it('returns true for Error with "The operation was aborted" message', () => {
      const error = new Error('The operation was aborted');

      expect(isAbortError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
      const error = new Error('Network timeout');

      expect(isAbortError(error)).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isAbortError('some string')).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
      expect(isAbortError(42)).toBe(false);
    });

    it('returns false for DOMException with non-abort name', () => {
      const error = new Error('Something failed');
      error.name = 'TypeError';

      expect(isAbortError(error)).toBe(false);
    });
  });

  describe('ensureError', () => {
    it('returns Error instance unchanged', () => {
      const error = new Error('test');

      expect(ensureError(error)).toBe(error);
    });

    it('wraps string in Error', () => {
      const result = ensureError('string error');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });

    it('wraps undefined with context', () => {
      const result = ensureError(undefined, 'TestContext');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('Unknown error');
      expect(result.message).toContain('TestContext');
    });

    it('wraps null with context', () => {
      const result = ensureError(null, 'TestContext');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('Unknown error');
    });
  });
});
