import { strings } from '../../../../../locales/i18n';
import { PERPS_ERROR_CODES } from '../controllers/PerpsController';
import {
  translatePerpsError,
  isPerpsErrorCode,
  handlePerpsError,
} from './perpsErrorHandler';

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
    it('should translate CLIENT_NOT_INITIALIZED error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      });

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('should translate TOKEN_NOT_SUPPORTED with data', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        data: { token: 'USDT' },
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:USDT]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'USDT',
      });
    });

    it('should translate PROVIDER_NOT_AVAILABLE error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      });

      expect(result).toBe('perps.errors.providerNotAvailable');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {},
      );
    });

    it('should translate BRIDGE_CONTRACT_NOT_FOUND error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.BRIDGE_CONTRACT_NOT_FOUND,
      });

      expect(result).toBe('perps.errors.bridgeContractNotFound');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.bridgeContractNotFound',
        {},
      );
    });

    it('should translate WITHDRAW_FAILED error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.WITHDRAW_FAILED,
      });

      expect(result).toBe('perps.errors.withdrawFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.withdrawFailed', {});
    });

    it('should translate POSITIONS_FAILED error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.POSITIONS_FAILED,
      });

      expect(result).toBe('perps.errors.positionsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.positionsFailed', {});
    });

    it('should translate ACCOUNT_STATE_FAILED error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED,
      });

      expect(result).toBe('perps.errors.accountStateFailed');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.accountStateFailed',
        {},
      );
    });

    it('should translate MARKETS_FAILED error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.MARKETS_FAILED,
      });

      expect(result).toBe('perps.errors.marketsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.marketsFailed', {});
    });

    it('should translate UNKNOWN_ERROR error code', () => {
      const result = translatePerpsError({
        error: PERPS_ERROR_CODES.UNKNOWN_ERROR,
      });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError', {});
    });
  });

  describe('with Error objects', () => {
    it('should translate Error with error code as message', () => {
      const error = new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
      const result = translatePerpsError({ error });

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('should return Error message if not an error code', () => {
      const error = new Error('Custom error message');
      const result = translatePerpsError({ error });

      expect(result).toBe('Custom error message');
    });
  });

  describe('with string errors', () => {
    it('should return string as-is if not an error code', () => {
      const result = translatePerpsError({
        error: 'Some random error string',
      });

      expect(result).toBe('Some random error string');
    });

    it('should translate string error codes', () => {
      const result = translatePerpsError({
        error: 'CLIENT_NOT_INITIALIZED',
      });

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });
  });
});

describe('isPerpsErrorCode', () => {
  it('should return true for matching error code string', () => {
    expect(
      isPerpsErrorCode(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      ),
    ).toBe(true);
  });

  it('should return false for non-matching error code string', () => {
    expect(
      isPerpsErrorCode(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
        PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      ),
    ).toBe(false);
  });

  it('should return true for Error with matching error code message', () => {
    const error = new Error(PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED);
    expect(isPerpsErrorCode(error, PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED)).toBe(
      true,
    );
  });

  it('should return false for Error with non-matching message', () => {
    const error = new Error('Some other error');
    expect(isPerpsErrorCode(error, PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED)).toBe(
      false,
    );
  });

  it('should return false for null', () => {
    expect(
      isPerpsErrorCode(null, PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED),
    ).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(
      isPerpsErrorCode(undefined, PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED),
    ).toBe(false);
  });

  it('should return false for objects', () => {
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
    it('should use token from context', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        context: { token: 'USDT' },
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:USDT]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'USDT',
      });
    });

    it('should use "Unknown" when token is not provided', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
      });

      expect(result).toBe('perps.errors.tokenNotSupported [token:Unknown]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'Unknown',
      });
    });

    it('should handle Error object with TOKEN_NOT_SUPPORTED', () => {
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
    it('should use providerId from context', () => {
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

    it('should use "Unknown" when providerId is not provided', () => {
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
    it('should pass through all context parameters for other errors', () => {
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

    it('should handle errors without specific mapping', () => {
      const result = handlePerpsError({
        error: PERPS_ERROR_CODES.POSITIONS_FAILED,
      });

      expect(result).toBe('perps.errors.positionsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.positionsFailed', {});
    });
  });

  describe('with non-error-code strings', () => {
    it('should return string as-is', () => {
      const result = handlePerpsError({
        error: 'Custom error message',
      });

      expect(result).toBe('Custom error message');
    });

    it('should use fallback message for empty string', () => {
      const result = handlePerpsError({
        error: '',
        fallbackMessage: 'Fallback message',
      });

      expect(result).toBe('Fallback message');
    });

    it('should prefer error string over fallback', () => {
      const result = handlePerpsError({
        error: 'Some error',
        fallbackMessage: 'Fallback message',
      });

      expect(result).toBe('Some error');
    });
  });

  describe('with unknown types', () => {
    it('should handle null', () => {
      const result = handlePerpsError({ error: null });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('should handle undefined', () => {
      const result = handlePerpsError({ error: undefined });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('should use fallback message for null', () => {
      const result = handlePerpsError({
        error: null,
        fallbackMessage: 'Custom fallback',
      });

      expect(result).toBe('Custom fallback');
    });

    it('should use fallback message for undefined', () => {
      const result = handlePerpsError({
        error: undefined,
        fallbackMessage: 'Custom fallback',
      });

      expect(result).toBe('Custom fallback');
    });
  });

  describe('with mixed context scenarios', () => {
    it('should ignore irrelevant context for TOKEN_NOT_SUPPORTED', () => {
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

    it('should ignore irrelevant context for PROVIDER_NOT_AVAILABLE', () => {
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
