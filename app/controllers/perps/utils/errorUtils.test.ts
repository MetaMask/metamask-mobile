import {
  isAbortError,
  ensureError,
  isHyperLiquidUserNotFoundError,
} from './errorUtils';

describe('errorUtils', () => {
  describe('isHyperLiquidUserNotFoundError', () => {
    it('returns true for the canonical HL error message', () => {
      const error = new Error(
        'User or API Wallet 0x8e05901d9ef496a220067a0d0841a1728269fc8f does not exist.',
      );
      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('returns true for a short address variant', () => {
      const error = new Error(
        'User or API Wallet 0x0000000000000000000000000000000000000000 does not exist.',
      );
      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('is case-insensitive', () => {
      const error = new Error('user or api wallet 0xabc does not exist');
      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('returns false for an unrelated API error', () => {
      const error = new Error('Insufficient margin');
      expect(isHyperLiquidUserNotFoundError(error)).toBe(false);
    });

    it('returns false for a generic network error', () => {
      const error = new Error('Network request failed');
      expect(isHyperLiquidUserNotFoundError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isHyperLiquidUserNotFoundError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isHyperLiquidUserNotFoundError(undefined)).toBe(false);
    });

    it('returns false for a plain string that does not match', () => {
      expect(isHyperLiquidUserNotFoundError('some random error')).toBe(false);
    });

    it('returns false for a non-Error object', () => {
      expect(
        isHyperLiquidUserNotFoundError({ message: 'does not exist' }),
      ).toBe(false);
    });
  });

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
