import { isAuthenticationError } from './isAuthenticationError';
import { CardError, CardErrorType } from '../types';

describe('isAuthenticationError', () => {
  describe('CardError instances', () => {
    it('returns true for INVALID_CREDENTIALS CardError', () => {
      const error = new CardError(
        CardErrorType.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns false for NETWORK_ERROR CardError', () => {
      const error = new CardError(CardErrorType.NETWORK_ERROR, 'Network error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for SERVER_ERROR CardError', () => {
      const error = new CardError(CardErrorType.SERVER_ERROR, 'Server error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for TIMEOUT_ERROR CardError', () => {
      const error = new CardError(CardErrorType.TIMEOUT_ERROR, 'Timeout error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for UNKNOWN_ERROR CardError', () => {
      const error = new CardError(CardErrorType.UNKNOWN_ERROR, 'Unknown error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for VALIDATION_ERROR CardError', () => {
      const error = new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Validation error',
      );
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for API_KEY_MISSING CardError', () => {
      const error = new CardError(
        CardErrorType.API_KEY_MISSING,
        'API key missing',
      );
      expect(isAuthenticationError(error)).toBe(false);
    });
  });

  describe('Standard Error instances with authentication messages', () => {
    it('returns true for error with "unauthorized" message', () => {
      const error = new Error('Unauthorized access');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "UNAUTHORIZED" (uppercase)', () => {
      const error = new Error('UNAUTHORIZED');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "invalid credentials" message', () => {
      const error = new Error('Invalid credentials provided');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "authentication failed" message', () => {
      const error = new Error('Authentication failed');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "Authentication Failed" (mixed case)', () => {
      const error = new Error('Authentication Failed');
      expect(isAuthenticationError(error)).toBe(true);
    });
  });

  describe('Standard Error instances with token-related messages', () => {
    it('returns true for error with "token expired" message', () => {
      const error = new Error('Token expired');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "token is expired" message', () => {
      const error = new Error('The access token is expired');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "invalid token" message', () => {
      const error = new Error('Invalid token provided');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns true for error with "token invalid" message', () => {
      const error = new Error('Token invalid');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('returns false for error with only "token" (without expired or invalid)', () => {
      const error = new Error('Token refresh successful');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for error with only "expired" (without token)', () => {
      const error = new Error('Session expired');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for error with only "invalid" (without token)', () => {
      const error = new Error('Invalid request format');
      expect(isAuthenticationError(error)).toBe(false);
    });
  });

  describe('Standard Error instances with non-authentication messages', () => {
    it('returns false for network error', () => {
      const error = new Error('Network request failed');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for server error', () => {
      const error = new Error('Internal server error');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for timeout error', () => {
      const error = new Error('Request timeout');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for validation error', () => {
      const error = new Error('Validation failed');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('returns false for generic error', () => {
      const error = new Error('Something went wrong');
      expect(isAuthenticationError(error)).toBe(false);
    });
  });

  describe('Non-Error values', () => {
    it('returns false for null', () => {
      expect(isAuthenticationError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAuthenticationError(undefined)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isAuthenticationError('unauthorized')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isAuthenticationError(401)).toBe(false);
    });

    it('returns false for boolean', () => {
      expect(isAuthenticationError(false)).toBe(false);
    });

    it('returns false for plain object', () => {
      expect(isAuthenticationError({ message: 'unauthorized' })).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isAuthenticationError({})).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles error with empty message', () => {
      const error = new Error('');
      expect(isAuthenticationError(error)).toBe(false);
    });

    it('handles complex authentication message', () => {
      const error = new Error(
        'Failed to fetch: 401 Unauthorized - Invalid credentials provided',
      );
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('handles message with token expired in middle', () => {
      const error = new Error(
        'Request failed because the token expired before completion',
      );
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('is case-insensitive for all checks', () => {
      expect(isAuthenticationError(new Error('UNAUTHORIZED ACCESS'))).toBe(
        true,
      );
      expect(isAuthenticationError(new Error('Token Expired'))).toBe(true);
      expect(isAuthenticationError(new Error('INVALID CREDENTIALS'))).toBe(
        true,
      );
      expect(isAuthenticationError(new Error('Authentication Failed'))).toBe(
        true,
      );
    });
  });
});
