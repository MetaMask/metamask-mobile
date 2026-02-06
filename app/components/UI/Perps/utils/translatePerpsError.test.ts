// Use fake timers to prevent test hanging
jest.useFakeTimers();

// Mock perpsErrorCodes to avoid heavy import chain
jest.mock('../controllers/perpsErrorCodes', () => ({
  PERPS_ERROR_CODES: {
    CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
    CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
    PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
    TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
    BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
    WITHDRAW_FAILED: 'WITHDRAW_FAILED',
    POSITIONS_FAILED: 'POSITIONS_FAILED',
    ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
    MARKETS_FAILED: 'MARKETS_FAILED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    ORDER_LEVERAGE_REDUCTION_FAILED: 'ORDER_LEVERAGE_REDUCTION_FAILED',
    IOC_CANCEL: 'IOC_CANCEL',
    CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
    WITHDRAW_INSUFFICIENT_BALANCE: 'WITHDRAW_INSUFFICIENT_BALANCE',
    // New error codes for better UX
    TRANSFER_FAILED: 'TRANSFER_FAILED',
    SWAP_FAILED: 'SWAP_FAILED',
    SPOT_PAIR_NOT_FOUND: 'SPOT_PAIR_NOT_FOUND',
    PRICE_UNAVAILABLE: 'PRICE_UNAVAILABLE',
    BATCH_CANCEL_FAILED: 'BATCH_CANCEL_FAILED',
    BATCH_CLOSE_FAILED: 'BATCH_CLOSE_FAILED',
    INSUFFICIENT_MARGIN: 'INSUFFICIENT_MARGIN',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    REDUCE_ONLY_VIOLATION: 'REDUCE_ONLY_VIOLATION',
    POSITION_WOULD_FLIP: 'POSITION_WOULD_FLIP',
    MARGIN_ADJUSTMENT_FAILED: 'MARGIN_ADJUSTMENT_FAILED',
    TPSL_UPDATE_FAILED: 'TPSL_UPDATE_FAILED',
    ORDER_REJECTED: 'ORDER_REJECTED',
    SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
}));

import { strings } from '../../../../../locales/i18n';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import {
  translatePerpsError,
  isPerpsErrorCode,
  handlePerpsError,
} from './translatePerpsError';

// Mock the i18n strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key, params) => {
    if (params) {
      // Simulate string interpolation
      let result = key;
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = `${result} [${paramKey}:${paramValue}]`;
      });
      return result;
    }
    return key;
  }),
}));

describe('translatePerpsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with error codes', () => {
    it('translates CLIENT_NOT_INITIALIZED error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      );

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('translates PROVIDER_NOT_AVAILABLE error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      );

      expect(result).toBe('perps.errors.providerNotAvailable');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {},
      );
    });

    it('translates TOKEN_NOT_SUPPORTED error code with data', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        { token: 'USDT' },
      );

      expect(result).toBe('perps.errors.tokenNotSupported [token:USDT]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'USDT',
      });
    });

    it('translates BRIDGE_CONTRACT_NOT_FOUND error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.BRIDGE_CONTRACT_NOT_FOUND,
      );

      expect(result).toBe('perps.errors.bridgeContractNotFound');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.bridgeContractNotFound',
        {},
      );
    });

    it('translates WITHDRAW_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.WITHDRAW_FAILED);

      expect(result).toBe('perps.errors.withdrawFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.withdrawFailed', {});
    });

    it('translates POSITIONS_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.POSITIONS_FAILED);

      expect(result).toBe('perps.errors.positionsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.positionsFailed', {});
    });

    it('translates ACCOUNT_STATE_FAILED error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED,
      );

      expect(result).toBe('perps.errors.accountStateFailed');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.accountStateFailed',
        {},
      );
    });

    it('translates MARKETS_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.MARKETS_FAILED);

      expect(result).toBe('perps.errors.marketsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.marketsFailed', {});
    });

    it('translates UNKNOWN_ERROR error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.UNKNOWN_ERROR);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError', {});
    });
  });

  describe('with Error objects', () => {
    it('translates Error with error code as message', () => {
      const error = new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('returns Error message if not an error code', () => {
      const error = new Error('Custom error message');
      const result = translatePerpsError(error);

      expect(result).toBe('Custom error message');
      expect(strings).not.toHaveBeenCalled();
    });

    it('translates Error with API pattern matching message', () => {
      const error = new Error('Not enough margin available');
      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.insufficientMargin');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.insufficientMargin',
        {},
      );
    });

    it('translates Error with transfer failed pattern', () => {
      const error = new Error('Transfer failed: network issue');
      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.transferFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.transferFailed', {});
    });
  });

  describe('with string errors', () => {
    it('returns string as-is if not an error code', () => {
      const result = translatePerpsError('Some random error string');

      expect(result).toBe('Some random error string');
    });

    it('translates string error codes', () => {
      const result = translatePerpsError('CLIENT_NOT_INITIALIZED');

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('translates string with API pattern matching', () => {
      const result = translatePerpsError('insufficient margin for this order');

      expect(result).toBe('perps.errors.insufficientMargin');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.insufficientMargin',
        {},
      );
    });

    it('translates string with swap failed pattern', () => {
      const result = translatePerpsError('Swap failed due to price impact');

      expect(result).toBe('perps.errors.swapFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.swapFailed', {});
    });
  });

  describe('with unknown types', () => {
    it('returns unknown error for null', () => {
      const result = translatePerpsError(null);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('returns unknown error for undefined', () => {
      const result = translatePerpsError(undefined);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('returns unknown error for objects', () => {
      const result = translatePerpsError({ some: 'object' });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('returns unknown error for numbers', () => {
      const result = translatePerpsError(123);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });
  });
});

describe('isPerpsErrorCode', () => {
  it('returns true for matching error code string', () => {
    expect(
      isPerpsErrorCode(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      ),
    ).toBe(true);
  });

  it('returns false for non-matching error code string', () => {
    expect(
      isPerpsErrorCode(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
        PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      ),
    ).toBe(false);
  });

  it('returns true for Error with matching error code message', () => {
    const error = new Error(PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED);
    expect(isPerpsErrorCode(error, PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED)).toBe(
      true,
    );
  });

  it('returns false for Error with non-matching message', () => {
    const error = new Error('Some other error');
    expect(isPerpsErrorCode(error, PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED)).toBe(
      false,
    );
  });

  it('returns false for null', () => {
    expect(
      isPerpsErrorCode(null, PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED),
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(
      isPerpsErrorCode(undefined, PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED),
    ).toBe(false);
  });

  it('returns false for objects', () => {
    expect(
      isPerpsErrorCode(
        { code: PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED },
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      ),
    ).toBe(false);
  });
});

describe('handlePerpsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with TOKEN_NOT_SUPPORTED error', () => {
    it('uses token from context', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        context: { token: 'USDT' },
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:USDT]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'USDT',
      });
    });

    it('uses "Unknown" when token is not provided', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:Unknown]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'Unknown',
      });
    });

    it('handles Error object with TOKEN_NOT_SUPPORTED', () => {
      const error = new Error(PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED);
      const result = handlePerpsError({
        error,
        context: { token: 'ETH' },
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:ETH]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'ETH',
      });
    });
  });

  describe('with PROVIDER_NOT_AVAILABLE error', () => {
    it('uses providerId from context', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        context: { providerId: 'hyperliquid' },
      });

      expect(result).toBe(
        'perps.errors.providerNotAvailable [providerId:hyperliquid]',
      );
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {
          providerId: 'hyperliquid',
        },
      );
    });

    it('uses "Unknown" when providerId is not provided', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      });

      expect(result).toBe(
        'perps.errors.providerNotAvailable [providerId:Unknown]',
      );
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {
          providerId: 'Unknown',
        },
      );
    });
  });

  describe('with other error codes', () => {
    it('passes through all context parameters for other errors', () => {
      const context = {
        amount: '100',
        symbol: 'USDC',
        address: '0x123',
      };
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.WITHDRAW_FAILED,
        context,
      });

      expect(result).toBe(
        'perps.errors.withdrawFailed [amount:100] [symbol:USDC] [address:0x123]',
      );
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.withdrawFailed',
        context,
      );
    });

    it('handles errors without specific mapping', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.POSITIONS_FAILED,
      });

      expect(result).toBe('perps.errors.positionsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.positionsFailed', {});
    });
  });

  describe('with non-error-code strings', () => {
    it('returns unknown error for unrecognized strings (for better UX)', () => {
      const result = handlePerpsError({
        error: 'Custom error message',
      });

      // Unrecognized error strings now return the generic unknown error for better UX
      // instead of showing raw technical error messages to users
      expect(result).toBe('perps.errors.unknownError');
    });

    it('uses fallback message for empty string', () => {
      const result = handlePerpsError({
        error: '',
        fallbackMessage: 'Fallback message',
      });

      expect(result).toBe('Fallback message');
    });

    it('uses fallback message when provided for non-error-code strings', () => {
      const result = handlePerpsError({
        error: 'Some error',
        fallbackMessage: 'Fallback message',
      });

      expect(result).toBe('Fallback message');
    });
  });

  describe('with error codes and fallbackMessage', () => {
    it('ignores fallbackMessage when valid error code is provided', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
        fallbackMessage: 'This should be ignored',
      });

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('ignores fallbackMessage for TOKEN_NOT_SUPPORTED with context', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        context: { token: 'WETH' },
        fallbackMessage: 'Should not appear',
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:WETH]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'WETH',
      });
    });

    it('ignores fallbackMessage for PROVIDER_NOT_AVAILABLE with context', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        context: { providerId: 'gmx' },
        fallbackMessage: 'Ignored fallback',
      });

      expect(result).toBe('perps.errors.providerNotAvailable [providerId:gmx]');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {
          providerId: 'gmx',
        },
      );
    });

    it('ignores fallbackMessage for Error object with valid error code', () => {
      const error = new Error(PERPS_ERROR_CODES.WITHDRAW_FAILED);
      const result = handlePerpsError({
        error,
        context: { amount: '500' },
        fallbackMessage: 'Generic withdrawal error',
      });

      expect(result).toBe('perps.errors.withdrawFailed [amount:500]');
      expect(strings).toHaveBeenCalledWith('perps.errors.withdrawFailed', {
        amount: '500',
      });
    });

    it('uses fallbackMessage for Error object without valid error code', () => {
      // Use an unrecognizable error string that won't match any pattern
      const error = new Error('Something unexpected happened xyz123');
      const result = handlePerpsError({
        error,
        fallbackMessage: 'Connection error, please try again',
      });

      expect(result).toBe('Connection error, please try again');
    });
  });

  describe('with unknown types', () => {
    it('handles null', () => {
      const result = handlePerpsError({ error: null });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('handles undefined', () => {
      const result = handlePerpsError({ error: undefined });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('uses fallback message for null', () => {
      const result = handlePerpsError({
        error: null,
        fallbackMessage: 'Custom fallback',
      });

      expect(result).toBe('Custom fallback');
    });

    it('uses fallback message for undefined', () => {
      const result = handlePerpsError({
        error: undefined,
        fallbackMessage: 'Custom fallback',
      });

      expect(result).toBe('Custom fallback');
    });
  });

  describe('with mixed context scenarios', () => {
    it('ignores irrelevant context for TOKEN_NOT_SUPPORTED', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        context: {
          token: 'BTC',
          providerId: 'should-be-ignored',
          amount: 'should-be-ignored',
        },
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:BTC]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'BTC',
      });
    });

    it('ignores irrelevant context for PROVIDER_NOT_AVAILABLE', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        context: {
          providerId: 'dydx',
          token: 'should-be-ignored',
          amount: 'should-be-ignored',
        },
      });

      expect(result).toBe(
        'perps.errors.providerNotAvailable [providerId:dydx]',
      );
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {
          providerId: 'dydx',
        },
      );
    });
  });

  describe('with API error pattern matching', () => {
    it('translates insufficient margin error pattern', () => {
      const result = handlePerpsError({
        error: 'Not enough margin available for this order',
      });

      expect(result).toBe('perps.errors.insufficientMargin');
    });

    it('translates reduce only violation error pattern', () => {
      const result = handlePerpsError({
        error: 'Reduce only order rejected',
      });

      expect(result).toBe('perps.errors.reduceOnlyViolation');
    });

    it('translates insufficient liquidity error pattern', () => {
      const result = handlePerpsError({
        error: 'Insufficient liquidity for this trade',
      });

      expect(result).toBe('perps.errors.insufficientLiquidity');
    });

    it('translates transfer failed error pattern', () => {
      const result = handlePerpsError({
        error: 'Transfer failed with status: error',
      });

      expect(result).toBe('perps.errors.transferFailed');
    });

    it('matches specific network error before generic transfer failed', () => {
      // "Transfer failed: network error" should match NETWORK_ERROR, not TRANSFER_FAILED
      const result = handlePerpsError({
        error: 'Transfer failed: network error',
      });

      expect(result).toBe('perps.errors.networkErrorSimple');
    });

    it('matches specific timeout before generic swap failed', () => {
      // "Swap failed: connection timed out" should match CONNECTION_TIMEOUT, not SWAP_FAILED
      const result = handlePerpsError({
        error: 'Swap failed: connection timed out',
      });

      expect(result).toBe('perps.errors.connectionTimeout');
    });

    it('matches specific service unavailable before generic transfer failed', () => {
      const result = handlePerpsError({
        error: 'Transfer failed: service unavailable',
      });

      expect(result).toBe('perps.errors.serviceUnavailable');
    });

    it('translates slippage exceeded error pattern', () => {
      const result = handlePerpsError({
        error: 'Price moved too much during execution',
      });

      expect(result).toBe('perps.errors.slippageExceeded');
    });

    it('translates rate limit error pattern', () => {
      const result = handlePerpsError({
        error: 'Rate limit exceeded, please try again later',
      });

      expect(result).toBe('perps.errors.rateLimitExceeded');
    });

    it('translates timeout error pattern', () => {
      const result = handlePerpsError({
        error: 'Connection timed out',
      });

      expect(result).toBe('perps.errors.connectionTimeout');
    });

    it('translates insufficient balance error pattern', () => {
      const result = handlePerpsError({
        error: 'Insufficient balance for withdrawal',
      });

      expect(result).toBe('perps.errors.insufficientBalance');
    });

    it('translates position would flip error pattern', () => {
      const result = handlePerpsError({
        error: 'Order rejected: position would flip',
      });

      expect(result).toBe('perps.errors.positionWouldFlip');
    });

    it('translates order rejected error pattern', () => {
      const result = handlePerpsError({
        error: 'Order rejected by exchange',
      });

      expect(result).toBe('perps.errors.orderRejected');
    });

    it('translates swap failed error pattern', () => {
      const result = handlePerpsError({
        error: 'Swap failed: insufficient output',
      });

      expect(result).toBe('perps.errors.swapFailed');
    });

    it('translates spot pair not found error pattern', () => {
      const result = handlePerpsError({
        error: 'USDH to USDC pair not found',
      });

      expect(result).toBe('perps.errors.spotPairNotFound');
    });

    it('translates price unavailable error pattern', () => {
      const result = handlePerpsError({
        error: 'No price available for this asset',
      });

      expect(result).toBe('perps.errors.priceUnavailable');
    });

    it('translates batch cancel failed error pattern', () => {
      const result = handlePerpsError({
        error: 'Batch cancel failed: partial execution',
      });

      expect(result).toBe('perps.errors.batchCancelFailed');
    });

    it('translates cancel all error pattern', () => {
      const result = handlePerpsError({
        error: 'Failed to cancel all orders',
      });

      expect(result).toBe('perps.errors.batchCancelFailed');
    });

    it('does not match single order cancellation as batch cancel', () => {
      const result = handlePerpsError({
        error: 'Order cancellation failed',
        fallbackMessage: 'Order operation failed',
      });

      // Should NOT match batch cancel pattern - should use fallback
      expect(result).toBe('Order operation failed');
    });

    it('translates batch close failed error pattern', () => {
      const result = handlePerpsError({
        error: 'Batch close failed: some positions still open',
      });

      expect(result).toBe('perps.errors.batchCloseFailed');
    });

    it('translates close all error pattern', () => {
      const result = handlePerpsError({
        error: 'Failed to close all positions',
      });

      expect(result).toBe('perps.errors.batchCloseFailed');
    });

    it('does not match single position close as batch close', () => {
      const result = handlePerpsError({
        error: 'Position close failed',
        fallbackMessage: 'Position operation failed',
      });

      // Should NOT match batch close pattern - should use fallback
      expect(result).toBe('Position operation failed');
    });

    it('translates service unavailable error pattern', () => {
      const result = handlePerpsError({
        error: 'Service temporarily unavailable',
      });

      expect(result).toBe('perps.errors.serviceUnavailable');
    });

    it('translates 503 service unavailable error pattern', () => {
      const result = handlePerpsError({
        error: 'HTTP Error 503: Service Unavailable',
      });

      expect(result).toBe('perps.errors.serviceUnavailable');
    });

    it('translates network error pattern', () => {
      const result = handlePerpsError({
        error: 'Network error: connection failed',
      });

      expect(result).toBe('perps.errors.networkErrorSimple');
    });

    it('translates fetch failed error pattern', () => {
      const result = handlePerpsError({
        error: 'Fetch failed: unable to reach server',
      });

      expect(result).toBe('perps.errors.networkErrorSimple');
    });

    it('translates leverage reduction error pattern', () => {
      const result = handlePerpsError({
        error: 'Cannot reduce position leverage below current level',
      });

      expect(result).toBe('perps.errors.orderLeverageReductionFailed');
    });

    it('uses fallback for unrecognized patterns', () => {
      const result = handlePerpsError({
        error: 'Completely random error xyz123',
        fallbackMessage: 'Something went wrong',
      });

      expect(result).toBe('Something went wrong');
    });
  });
});
