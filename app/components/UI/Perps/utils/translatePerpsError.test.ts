// Use fake timers to prevent test hanging
jest.useFakeTimers();

// Mock perpsErrorCodes to avoid heavy import chain
jest.mock('@metamask/perps-controller', () => {
  const actual = jest.requireActual('@metamask/perps-controller');
  return {
    ...actual,
    PERPS_ERROR_CODES: {
      CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
      CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
      PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
      PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
      PROVIDER_ROUTE_REQUIRED: 'PROVIDER_ROUTE_REQUIRED',
      TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
      BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
      WITHDRAW_FAILED: 'WITHDRAW_FAILED',
      POSITIONS_FAILED: 'POSITIONS_FAILED',
      POSITION_NOT_FOUND: 'POSITION_NOT_FOUND',
      ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
      MARKETS_FAILED: 'MARKETS_FAILED',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      ORDER_LEVERAGE_REDUCTION_FAILED: 'ORDER_LEVERAGE_REDUCTION_FAILED',
      ORDER_SCALE_PREVIEW_STALE: 'ORDER_SCALE_PREVIEW_STALE',
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
      TPSL_LEG_REPLACE_UNSUPPORTED: 'TPSL_LEG_REPLACE_UNSUPPORTED',
      ORDER_REJECTED: 'ORDER_REJECTED',
      SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
      PRICE_MOVED: 'PRICE_MOVED',
      ORDER_POST_ONLY_WOULD_CROSS: 'ORDER_POST_ONLY_WOULD_CROSS',
      ORDER_POST_ONLY_WINDOW: 'ORDER_POST_ONLY_WINDOW',
      RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
      SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
      NETWORK_ERROR: 'NETWORK_ERROR',
    },
  };
});

import { strings } from '../../../../../locales/i18n';
import {
  PERPS_ERROR_CODES,
  PROVIDER_CONFIG,
  type OrderResult,
} from '@metamask/perps-controller';
import {
  translatePerpsError,
  isPerpsErrorCode,
  isNoPositionFoundError,
  isPostOnlyWindowError,
  isPostOnlyWouldCrossError,
  normalizeOrderEditRejection,
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
    it('translates a stale Scale preview refusal', () => {
      const message = translatePerpsError(
        PERPS_ERROR_CODES.ORDER_SCALE_PREVIEW_STALE,
      );

      expect(message).toBe('perps.errors.orderValidation.scalePreviewStale');
    });

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

      expect(result).toBe(
        'perps.errors.providerNotAvailable [providerId:Unknown]',
      );
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        { providerId: 'Unknown' },
      );
    });

    it('translates a route-required result without provider interpolation', () => {
      const error = {
        success: false,
        error: 'no route',
        errorCode: PERPS_ERROR_CODES.PROVIDER_ROUTE_REQUIRED,
        providerId: 'lighter',
      };

      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.providerRouteRequired');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerRouteRequired',
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

    it('translates a provider-tagged UNKNOWN_ERROR result to the retryable fallback', () => {
      const rawDiagnostic =
        'Hyperliquid signer 0xabc returned an internal stack trace';

      const failure = {
        error: rawDiagnostic,
        errorCode: PERPS_ERROR_CODES.UNKNOWN_ERROR,
        errorDetails: {
          code: PERPS_ERROR_CODES.UNKNOWN_ERROR,
          provider: PROVIDER_CONFIG.DefaultProvider,
        },
      } satisfies OrderResult;

      const result = translatePerpsError(failure);

      expect(result).toBe('perps.errors.unknownError');
      expect(result).not.toContain(rawDiagnostic);
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError', {});
    });

    it('formats structured PRICE_MOVED details for localized copy', () => {
      const result = translatePerpsError({
        error: 'Price moved too much',
        errorCode: PERPS_ERROR_CODES.PRICE_MOVED,
        errorDetails: {
          code: PERPS_ERROR_CODES.PRICE_MOVED,
          priceDeltaBps: 336,
          maxSlippageBps: 300,
          expectedPrice: 788.71,
          currentPrice: 815.22,
        },
      });

      expect(result).toBe(
        'perps.errors.priceMoved [priceDelta:3.36] [maxSlippage:3]',
      );
    });

    it('formats IOC_CANCEL copy with the submitted slippage tolerance', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.IOC_CANCEL,
        errorCode: PERPS_ERROR_CODES.IOC_CANCEL,
        maxSlippageBps: 500,
      });

      expect(result).toBe('perps.errors.iocCancel [maxSlippage:5]');
    });

    it('uses non-numeric IOC_CANCEL copy when tolerance is unavailable', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.IOC_CANCEL);

      expect(result).toBe('perps.errors.iocCancelUnknownTolerance');
    });

    it.each([
      [
        PERPS_ERROR_CODES.INSUFFICIENT_MARGIN,
        'perps.errors.insufficientMargin',
      ],
      [PERPS_ERROR_CODES.IOC_CANCEL, 'perps.errors.iocCancelUnknownTolerance'],
    ])(
      'translates a normalized Hyperliquid %s result with provider details',
      (errorCode, expectedMessage) => {
        const failure = {
          error: errorCode,
          errorCode,
          errorDetails: {
            code: errorCode,
            provider: PROVIDER_CONFIG.DefaultProvider,
          },
        } satisfies OrderResult;

        const result = translatePerpsError(failure);

        expect(result).toBe(expectedMessage);
      },
    );

    it.each([
      null,
      42,
      { code: 'FUTURE_DETAILS', reason: 'new controller variant' },
      {
        code: PERPS_ERROR_CODES.INSUFFICIENT_MARGIN,
        provider: 'unrecognized-provider',
      },
      { code: PERPS_ERROR_CODES.PRICE_MOVED, priceDeltaBps: 'not numeric' },
    ])(
      'translates a valid code despite unrecognized details: %p',
      (errorDetails) => {
        // Deliberately outside the published contract to exercise the unknown boundary.
        const failure = {
          error: 'Unclassified venue diagnostic',
          errorCode: PERPS_ERROR_CODES.INSUFFICIENT_MARGIN,
          errorDetails,
        };

        const result = translatePerpsError(failure);

        expect(result).toBe('perps.errors.insufficientMargin');
        expect(
          isPerpsErrorCode(failure, PERPS_ERROR_CODES.INSUFFICIENT_MARGIN),
        ).toBe(true);
      },
    );
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

    it('replaces an unrecognized Error message with the retryable fallback', () => {
      const error = new Error('Custom error message');

      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.unknownError');
      expect(result).not.toContain('Custom error message');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });
  });

  it.each([
    'Not enough margin available',
    'Transfer failed: network error',
    'Post only order would have immediately matched',
    'No position found for ETH',
  ])('leaves classification of venue prose to Core: %s', (error) => {
    const translated = translatePerpsError(error);
    const handled = handlePerpsError({ error, fallbackMessage: 'Retry' });

    expect(translated).toBe('perps.errors.unknownError');
    expect(handled).toBe('Retry');
    expect(isNoPositionFoundError(error)).toBe(false);
    expect(isPostOnlyWindowError(error)).toBe(false);
    expect(isPostOnlyWouldCrossError(error)).toBe(false);
  });

  describe('with string errors', () => {
    it('replaces an unrecognized string with the retryable fallback', () => {
      const error = 'Some random error string';

      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.unknownError');
      expect(result).not.toContain(error);
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('translates string error codes', () => {
      const result = translatePerpsError('CLIENT_NOT_INITIALIZED');

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
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

describe('isNoPositionFoundError', () => {
  it.each([
    PERPS_ERROR_CODES.POSITION_NOT_FOUND,
    new Error(PERPS_ERROR_CODES.POSITION_NOT_FOUND),
    { error: PERPS_ERROR_CODES.POSITION_NOT_FOUND },
  ])('recognizes POSITION_NOT_FOUND in %p', (error) => {
    const result = isNoPositionFoundError(error);

    expect(result).toBe(true);
  });

  it('returns true for a normalized POSITION_NOT_FOUND result', () => {
    const error = {
      error: 'Position is no longer available',
      errorCode: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
      errorDetails: {
        code: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
        provider: PROVIDER_CONFIG.DefaultProvider,
      },
    } satisfies OrderResult;

    const result = isNoPositionFoundError(error);

    expect(result).toBe(true);
  });

  it('prioritizes errorCode over a conflicting error string', () => {
    const error = {
      error: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
      errorCode: PERPS_ERROR_CODES.UNKNOWN_ERROR,
    } satisfies OrderResult;

    const result = isNoPositionFoundError(error);

    expect(result).toBe(false);
  });

  it('returns false for unrelated close errors', () => {
    // Arrange
    const error = 'Insufficient margin';

    // Act
    const result = isNoPositionFoundError(error);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false for null', () => {
    // Arrange
    const error = null;

    // Act
    const result = isNoPositionFoundError(error);

    // Assert
    expect(result).toBe(false);
  });
});

describe('normalized post-only rejections from Core', () => {
  const WOULD_CROSS_CODE = 'ORDER_POST_ONLY_WOULD_CROSS';
  const WINDOW_CODE = 'ORDER_POST_ONLY_WINDOW';
  const normalizedResult = (
    code: typeof WOULD_CROSS_CODE | typeof WINDOW_CODE,
  ): OrderResult => ({
    success: false,
    error: code,
    errorCode: code,
    errorDetails: { code, provider: PROVIDER_CONFIG.DefaultProvider },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[string, typeof WOULD_CROSS_CODE | typeof WINDOW_CODE, string]>([
    ['would-cross', WOULD_CROSS_CODE, 'perps.errors.postOnlyWouldCross'],
    ['window', WINDOW_CODE, 'perps.errors.postOnlyWindow'],
  ])(
    'translates the %s code from a provider result without venue text',
    (_label, code, expectedKey) => {
      expect(translatePerpsError(normalizedResult(code))).toBe(expectedKey);
      expect(translatePerpsError(code)).toBe(expectedKey);
      expect(
        handlePerpsError({
          error: normalizedResult(code),
          fallbackMessage: 'Fallback message',
        }),
      ).toBe(expectedKey);
    },
  );

  it('classifies the window code and not the would-cross code as the post-only window', () => {
    expect(isPostOnlyWindowError(normalizedResult(WINDOW_CODE))).toBe(true);
    expect(isPostOnlyWindowError(WINDOW_CODE)).toBe(true);
    expect(isPostOnlyWindowError(normalizedResult(WOULD_CROSS_CODE))).toBe(
      false,
    );
  });

  it('classifies the would-cross code and not the window code as a would-cross rejection', () => {
    expect(isPostOnlyWouldCrossError(normalizedResult(WOULD_CROSS_CODE))).toBe(
      true,
    );
    expect(isPostOnlyWouldCrossError(WOULD_CROSS_CODE)).toBe(true);
    expect(isPostOnlyWouldCrossError(normalizedResult(WINDOW_CODE))).toBe(
      false,
    );
  });

  it('reports a cancelled original for a normalized would-cross edit result', () => {
    const result = normalizeOrderEditRejection(
      normalizedResult(WOULD_CROSS_CODE),
    );

    expect(result).toEqual({
      reason: 'post_only_would_cross',
      originalOrder: 'cancelled',
      error: WOULD_CROSS_CODE,
    });
  });

  it('reports a retained original for a normalized window edit result', () => {
    const result = normalizeOrderEditRejection(normalizedResult(WINDOW_CODE));

    expect(result).toEqual({
      reason: 'other',
      originalOrder: 'retained',
      error: WINDOW_CODE,
    });
  });

  it('reports a retained original for a normalized unknown edit result', () => {
    const result = normalizeOrderEditRejection({
      error: PERPS_ERROR_CODES.UNKNOWN_ERROR,
      errorCode: PERPS_ERROR_CODES.UNKNOWN_ERROR,
    });

    expect(result).toEqual({
      reason: 'other',
      originalOrder: 'retained',
      error: PERPS_ERROR_CODES.UNKNOWN_ERROR,
    });
  });
});

describe('handlePerpsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('translates a valid code despite unrecognized details instead of using fallback copy', () => {
    const error = {
      error: 'Unclassified venue diagnostic',
      errorCode: PERPS_ERROR_CODES.INSUFFICIENT_MARGIN,
      errorDetails: { code: 'FUTURE_DETAILS' },
    };

    const result = handlePerpsError({
      error,
      fallbackMessage:
        'We couldn’t check this order. Review the details and try again.',
    });

    expect(result).toBe('perps.errors.insufficientMargin');
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

    it('translates a route-required failure without provider interpolation', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_ROUTE_REQUIRED,
      });

      expect(result).toBe('perps.errors.providerRouteRequired');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerRouteRequired',
        {},
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
});
