import {
  isAbortError,
  ensureError,
  isHyperLiquidUserNotFoundError,
} from './errorUtils';

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

  describe('isHyperLiquidUserNotFoundError', () => {
    it('returns true for the exact SDK rejection (lowercase address, trailing period)', () => {
      // Captured verbatim from the standalone repro
      // (scripts/repro-hl-user-not-found.mjs) and from Sentry issue
      // METAMASK-MOBILE-4XB5 additional context.
      const error = new Error(
        'User or API Wallet 0x341b4cbd00e82fd89414b10869c926bd43324306 does not exist.',
      );

      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('returns true with checksummed address and no trailing period', () => {
      const error = new Error(
        'User or API Wallet 0x341B4cBD00e82fd89414B10869C926bd43324306 does not exist',
      );

      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('returns true regardless of message casing', () => {
      const error = new Error('user or api wallet 0xabc does not exist.');

      expect(isHyperLiquidUserNotFoundError(error)).toBe(true);
    });

    it('returns true when the error is a plain string (via ensureError)', () => {
      expect(
        isHyperLiquidUserNotFoundError(
          'User or API Wallet 0xabc does not exist.',
        ),
      ).toBe(true);
    });

    it('returns false for unrelated SDK errors that must keep reaching Sentry', () => {
      expect(
        isHyperLiquidUserNotFoundError(
          new Error('Insufficient margin to place order'),
        ),
      ).toBe(false);
      expect(
        isHyperLiquidUserNotFoundError(new Error('CLIENT_NOT_INITIALIZED')),
      ).toBe(false);
      expect(
        isHyperLiquidUserNotFoundError(new TypeError('Cannot read x of undef')),
      ).toBe(false);
    });

    it('returns false for abort/cancellation errors', () => {
      const abort = new Error('The operation was aborted');
      abort.name = 'AbortError';

      expect(isHyperLiquidUserNotFoundError(abort)).toBe(false);
    });

    it('returns false for similar-but-not-matching strings', () => {
      expect(
        isHyperLiquidUserNotFoundError(new Error('User does not exist')),
      ).toBe(false);
      expect(
        isHyperLiquidUserNotFoundError(
          new Error('API Wallet 0xabc does not exist'),
        ),
      ).toBe(false);
    });

    it('returns false for non-error inputs that ensureError wraps with a benign message', () => {
      expect(isHyperLiquidUserNotFoundError(undefined)).toBe(false);
      expect(isHyperLiquidUserNotFoundError(null)).toBe(false);
      expect(isHyperLiquidUserNotFoundError(42)).toBe(false);
    });
  });
});
