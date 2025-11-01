import { strings } from '../../../../../locales/i18n';
import { PERPS_ERROR_CODES } from '../controllers/PerpsController';
import { translatePerpsError, isPerpsErrorCode } from './translatePerpsError';

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
      const result = translatePerpsError(
        PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED,
      );

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('should translate PROVIDER_NOT_AVAILABLE error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      );

      expect(result).toBe('perps.errors.providerNotAvailable');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.providerNotAvailable',
        {},
      );
    });

    it('should translate TOKEN_NOT_SUPPORTED error code with data', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.TOKEN_NOT_SUPPORTED,
        { token: 'USDT' },
      );

      expect(result).toBe('perps.errors.tokenNotSupported [token:USDT]');
      expect(strings).toHaveBeenCalledWith('perps.errors.tokenNotSupported', {
        token: 'USDT',
      });
    });

    it('should translate BRIDGE_CONTRACT_NOT_FOUND error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.BRIDGE_CONTRACT_NOT_FOUND,
      );

      expect(result).toBe('perps.errors.bridgeContractNotFound');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.bridgeContractNotFound',
        {},
      );
    });

    it('should translate WITHDRAW_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.WITHDRAW_FAILED);

      expect(result).toBe('perps.errors.withdrawFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.withdrawFailed', {});
    });

    it('should translate POSITIONS_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.POSITIONS_FAILED);

      expect(result).toBe('perps.errors.positionsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.positionsFailed', {});
    });

    it('should translate ACCOUNT_STATE_FAILED error code', () => {
      const result = translatePerpsError(
        PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED,
      );

      expect(result).toBe('perps.errors.accountStateFailed');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.accountStateFailed',
        {},
      );
    });

    it('should translate MARKETS_FAILED error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.MARKETS_FAILED);

      expect(result).toBe('perps.errors.marketsFailed');
      expect(strings).toHaveBeenCalledWith('perps.errors.marketsFailed', {});
    });

    it('should translate UNKNOWN_ERROR error code', () => {
      const result = translatePerpsError(PERPS_ERROR_CODES.UNKNOWN_ERROR);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError', {});
    });
  });

  describe('with Error objects', () => {
    it('should translate Error with error code as message', () => {
      const error = new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
      const result = translatePerpsError(error);

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });

    it('should return Error message if not an error code', () => {
      const error = new Error('Custom error message');
      const result = translatePerpsError(error);

      expect(result).toBe('Custom error message');
      expect(strings).not.toHaveBeenCalled();
    });
  });

  describe('with string errors', () => {
    it('should return string as-is if not an error code', () => {
      const result = translatePerpsError('Some random error string');

      expect(result).toBe('Some random error string');
    });

    it('should translate string error codes', () => {
      const result = translatePerpsError('CLIENT_NOT_INITIALIZED');

      expect(result).toBe('perps.errors.clientNotInitialized');
      expect(strings).toHaveBeenCalledWith(
        'perps.errors.clientNotInitialized',
        {},
      );
    });
  });

  describe('with unknown types', () => {
    it('should return unknown error for null', () => {
      const result = translatePerpsError(null);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('should return unknown error for undefined', () => {
      const result = translatePerpsError(undefined);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('should return unknown error for objects', () => {
      const result = translatePerpsError({ some: 'object' });

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('should return unknown error for numbers', () => {
      const result = translatePerpsError(123);

      expect(result).toBe('perps.errors.unknownError');
      expect(strings).toHaveBeenCalledWith('perps.errors.unknownError');
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
