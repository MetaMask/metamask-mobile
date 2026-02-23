import {
  mapCardStatus,
  mapTokenizationStatus,
  isValidCardStatus,
  isValidTokenizationStatus,
  isValidTokenInfo,
  validateTokenArray,
  createProvisioningError,
  createErrorResult,
  logAdapterError,
} from './utils';
import { ProvisioningError, ProvisioningErrorCode } from '../../types';
import Logger from '../../../../../../util/Logger';

// Mock Logger
jest.mock('../../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('Wallet Adapter Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidCardStatus', () => {
    it('returns true for valid card statuses', () => {
      expect(isValidCardStatus('not found')).toBe(true);
      expect(isValidCardStatus('active')).toBe(true);
      expect(isValidCardStatus('pending')).toBe(true);
      expect(isValidCardStatus('suspended')).toBe(true);
      expect(isValidCardStatus('deactivated')).toBe(true);
      expect(isValidCardStatus('requireActivation')).toBe(true);
    });

    it('returns false for invalid card statuses', () => {
      expect(isValidCardStatus('invalid')).toBe(false);
      expect(isValidCardStatus('')).toBe(false);
      expect(isValidCardStatus(null)).toBe(false);
      expect(isValidCardStatus(undefined)).toBe(false);
      expect(isValidCardStatus(123)).toBe(false);
      expect(isValidCardStatus({})).toBe(false);
    });
  });

  describe('isValidTokenizationStatus', () => {
    it('returns true for valid tokenization statuses', () => {
      expect(isValidTokenizationStatus('success')).toBe(true);
      expect(isValidTokenizationStatus('canceled')).toBe(true);
      expect(isValidTokenizationStatus('error')).toBe(true);
    });

    it('returns false for invalid tokenization statuses', () => {
      expect(isValidTokenizationStatus('invalid')).toBe(false);
      expect(isValidTokenizationStatus('')).toBe(false);
      expect(isValidTokenizationStatus(null)).toBe(false);
      expect(isValidTokenizationStatus(undefined)).toBe(false);
      expect(isValidTokenizationStatus(123)).toBe(false);
    });
  });

  describe('mapCardStatus', () => {
    it('maps valid card statuses correctly', () => {
      expect(mapCardStatus('not found')).toBe('not_found');
      expect(mapCardStatus('active')).toBe('active');
      expect(mapCardStatus('pending')).toBe('pending');
      expect(mapCardStatus('suspended')).toBe('suspended');
      expect(mapCardStatus('deactivated')).toBe('deactivated');
      expect(mapCardStatus('requireActivation')).toBe('requires_activation');
    });

    it('returns not_found for invalid statuses and logs warning', () => {
      expect(mapCardStatus('invalid')).toBe('not_found');
      expect(Logger.log).toHaveBeenCalledWith(
        'mapCardStatus: Invalid status received',
        { status: 'invalid' },
      );
    });

    it('returns not_found for null/undefined', () => {
      expect(mapCardStatus(null)).toBe('not_found');
      expect(mapCardStatus(undefined)).toBe('not_found');
    });
  });

  describe('mapTokenizationStatus', () => {
    it('maps valid tokenization statuses correctly', () => {
      expect(mapTokenizationStatus('success')).toBe('success');
      expect(mapTokenizationStatus('canceled')).toBe('canceled');
      expect(mapTokenizationStatus('error')).toBe('error');
    });

    it('returns error for invalid statuses and logs warning', () => {
      expect(mapTokenizationStatus('invalid')).toBe('error');
      expect(Logger.log).toHaveBeenCalledWith(
        'mapTokenizationStatus: Invalid status received',
        { status: 'invalid' },
      );
    });

    it('returns error for null/undefined', () => {
      expect(mapTokenizationStatus(null)).toBe('error');
      expect(mapTokenizationStatus(undefined)).toBe('error');
    });
  });

  describe('isValidTokenInfo', () => {
    it('returns true for valid token info', () => {
      expect(
        isValidTokenInfo({
          identifier: 'token-123',
          lastDigits: '1234',
          tokenState: 1,
        }),
      ).toBe(true);
    });

    it('returns false for invalid token info', () => {
      expect(isValidTokenInfo(null)).toBe(false);
      expect(isValidTokenInfo(undefined)).toBe(false);
      expect(isValidTokenInfo({})).toBe(false);
      expect(isValidTokenInfo({ identifier: 'test' })).toBe(false);
      expect(isValidTokenInfo({ identifier: 'test', lastDigits: '1234' })).toBe(
        false,
      );
      expect(
        isValidTokenInfo({
          identifier: 123, // wrong type
          lastDigits: '1234',
          tokenState: 1,
        }),
      ).toBe(false);
      expect(
        isValidTokenInfo({
          identifier: 'test',
          lastDigits: 1234, // wrong type
          tokenState: 1,
        }),
      ).toBe(false);
      expect(
        isValidTokenInfo({
          identifier: 'test',
          lastDigits: '1234',
          tokenState: '1', // wrong type
        }),
      ).toBe(false);
    });
  });

  describe('validateTokenArray', () => {
    it('returns valid tokens from array', () => {
      const tokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { identifier: 'token-2', lastDigits: '5678', tokenState: 2 },
      ];
      expect(validateTokenArray(tokens)).toEqual(tokens);
    });

    it('filters out invalid tokens', () => {
      const tokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { invalid: true },
        { identifier: 'token-2', lastDigits: '5678', tokenState: 2 },
        null,
      ];
      expect(validateTokenArray(tokens)).toEqual([
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { identifier: 'token-2', lastDigits: '5678', tokenState: 2 },
      ]);
    });

    it('returns empty array for non-array input', () => {
      expect(validateTokenArray(null)).toEqual([]);
      expect(validateTokenArray(undefined)).toEqual([]);
      expect(validateTokenArray({})).toEqual([]);
      expect(validateTokenArray('string')).toEqual([]);
      expect(Logger.log).toHaveBeenCalled();
    });

    it('returns empty array for empty array input', () => {
      expect(validateTokenArray([])).toEqual([]);
    });
  });

  describe('createProvisioningError', () => {
    it('returns existing ProvisioningError unchanged', () => {
      const existingError = new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        'Wallet not available',
      );
      expect(createProvisioningError(existingError)).toBe(existingError);
    });

    it('wraps Error with default code', () => {
      const error = new Error('Something went wrong');
      const result = createProvisioningError(error);

      expect(result).toBeInstanceOf(ProvisioningError);
      expect(result.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe(error);
    });

    it('wraps Error with custom code', () => {
      const error = new Error('Invalid card');
      const result = createProvisioningError(
        error,
        ProvisioningErrorCode.INVALID_CARD_DATA,
      );

      expect(result.code).toBe(ProvisioningErrorCode.INVALID_CARD_DATA);
    });

    it('creates error from non-Error with default message', () => {
      const result = createProvisioningError('string error');

      expect(result).toBeInstanceOf(ProvisioningError);
      // Non-Error values use the default message 'An unknown error occurred'
      expect(result.message).toBe('An unknown error occurred');
      expect(result.originalError).toBeUndefined();
    });

    it('uses custom default message for non-Error', () => {
      const result = createProvisioningError(
        null,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Custom message',
      );

      expect(result.message).toBe('Custom message');
    });

    it('prefers defaultMessage over Error.message for user-facing errors', () => {
      const error = new Error('PKPassKitErrorDomain error 2');
      const result = createProvisioningError(
        error,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Something went wrong. Please try again.',
      );

      expect(result).toBeInstanceOf(ProvisioningError);
      expect(result.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
      // defaultMessage takes precedence to avoid exposing raw SDK errors
      expect(result.message).toBe('Something went wrong. Please try again.');
      // Original error is preserved for debugging
      expect(result.originalError).toBe(error);
    });
  });

  describe('createErrorResult', () => {
    it('creates error result from Error', () => {
      const error = new Error('Test error');
      const result = createErrorResult(error);

      expect(result.status).toBe('error');
      expect(result.error).toBeInstanceOf(ProvisioningError);
      expect(result.error?.message).toBe('Test error');
    });

    it('creates error result with custom code and message', () => {
      const result = createErrorResult(
        null,
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        'Wallet not found',
      );

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
      );
      expect(result.error?.message).toBe('Wallet not found');
    });
  });

  describe('logAdapterError', () => {
    it('logs error to Sentry with tags and context', () => {
      const error = new Error('Test error');
      logAdapterError('GoogleWalletAdapter', 'provisionCard', error);

      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: {
          feature: 'push_provisioning',
          adapter: 'GoogleWalletAdapter',
          method: 'provisionCard',
          error_code: 'NATIVE_SDK_ERROR',
        },
        context: {
          name: 'push_provisioning_error',
          data: {
            adapter: 'GoogleWalletAdapter',
            method: 'provisionCard',
            errorMessage: 'Test error',
            errorCode: 'NATIVE_SDK_ERROR',
          },
        },
      });
    });

    it('logs ProvisioningError with correct error code', () => {
      const error = new ProvisioningError(
        ProvisioningErrorCode.INVALID_CARD_DATA,
        'Invalid card data',
      );
      logAdapterError('AppleWalletAdapter', 'provisionCard', error);

      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: {
          feature: 'push_provisioning',
          adapter: 'AppleWalletAdapter',
          method: 'provisionCard',
          error_code: ProvisioningErrorCode.INVALID_CARD_DATA,
        },
        context: {
          name: 'push_provisioning_error',
          data: {
            adapter: 'AppleWalletAdapter',
            method: 'provisionCard',
            errorMessage: 'Invalid card data',
            errorCode: ProvisioningErrorCode.INVALID_CARD_DATA,
          },
        },
      });
    });

    it('creates Error object for non-Error values', () => {
      logAdapterError('TestAdapter', 'testMethod', 'string error');

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'TestAdapter.testMethod: string error',
        }),
        {
          tags: {
            feature: 'push_provisioning',
            adapter: 'TestAdapter',
            method: 'testMethod',
            error_code: 'NATIVE_SDK_ERROR',
          },
          context: {
            name: 'push_provisioning_error',
            data: {
              adapter: 'TestAdapter',
              method: 'testMethod',
              errorMessage: 'string error',
              errorCode: 'NATIVE_SDK_ERROR',
            },
          },
        },
      );
    });
  });
});
