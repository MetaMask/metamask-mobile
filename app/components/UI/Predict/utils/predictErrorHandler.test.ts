import { ToastSeverity, toast } from '@metamask/design-system-react-native';
import { addBreadcrumb } from '@sentry/react-native';
import { PREDICT_ERROR_CODES } from '../constants/errors';
import { Side } from '../types';
import {
  ensureError,
  isNetworkError,
  isPredictNoMatchError,
  reportPredictError,
  showDepositErrorToast,
  parseErrorMessage,
  checkPlaceOrderError,
} from './predictErrorHandler';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/design-system-react-native', () => ({
  toast: jest.fn(),
  ToastSeverity: {
    Danger: 'danger',
  },
}));

jest.mock('../constants/errors', () => ({
  ...jest.requireActual('../constants/errors'),
  getPredictErrorMessages: () => ({
    PREDICT_NOT_ELIGIBLE: 'You are not eligible',
    PREDICT_PLACE_ORDER_FAILED: 'Order placement failed',
    PREDICT_UNKNOWN_ERROR: 'Something went wrong',
    PREDICT_BUY_ORDER_NOT_FULLY_FILLED: 'Buy order not fully filled',
    PREDICT_SELL_ORDER_NOT_FULLY_FILLED: 'Sell order not fully filled',
    PREDICT_DEPOSIT_FAILED: 'Deposit failed mapped',
    PREDICT_WITHDRAW_FAILED: 'Withdraw failed mapped',
  }),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

// Byte-exact error.message from Sentry event 21edcb35 (NSURLErrorCannotConnectToHost).
const NSURL_CANNOT_CONNECT_ERROR_MESSAGE = `Error Domain=NSURLErrorDomain Code=-1004 "Could not connect to the server." UserInfo={_kCFStreamErrorCodeKey=61, NSUnderlyingError=0x11e72e040 {Error Domain=kCFErrorDomainCFNetwork Code=-1004 "(null)" UserInfo={_NSURLErrorNWPathKey=satisfied (Path is satisfied), interface: en0[802.11], ipv4, dns, uses wifi, LQM: good, _kCFStreamErrorCodeKey=61, _kCFStreamErrorDomainKey=1}}, _NSURLErrorFailingURLSessionTaskErrorKey=LocalDataTask <23A04505-0604-4F83-ACC2-2F19E3D09182>.<445>, _NSURLErrorRelatedURLSessionTaskErrorKey=(
    "LocalDataTask <23A04505-0604-4F83-ACC2-2F19E3D09182>.<445>"
), NSLocalizedDescription=Could not connect to the server., NSErrorFailingURLStringKey=**, NSErrorFailingURLKey=**, _kCFStreamErrorDomainKey=1}
`;

const NSURL_ERROR_TIMED_OUT = -1001;
const NSURL_ERROR_CANNOT_FIND_HOST = -1003;
const NSURL_ERROR_CANNOT_CONNECT_TO_HOST = -1004;
const NSURL_ERROR_NETWORK_CONNECTION_LOST = -1005;
const NSURL_ERROR_NOT_CONNECTED_TO_INTERNET = -1009;
const NSURL_ERROR_BAD_SERVER_RESPONSE = -1011;
const NSURL_ERROR_SECURE_CONNECTION_FAILED = -1200;

const TIMED_OUT_DESCRIPTION = 'The request timed out.';
const CANNOT_FIND_HOST_DESCRIPTION =
  'A server with the specified hostname could not be found.';
const NETWORK_CONNECTION_LOST_DESCRIPTION = 'The network connection was lost.';
const NOT_CONNECTED_TO_INTERNET_DESCRIPTION =
  'The Internet connection appears to be offline.';
const SECURE_CONNECTION_FAILED_DESCRIPTION =
  'An SSL error has occurred and a secure connection to the server cannot be made.';
const BAD_SERVER_RESPONSE_DESCRIPTION =
  'There was a bad response from the server.';
const LOCALIZED_CANNOT_CONNECT_DESCRIPTION =
  'No se pudo conectar con el servidor.';

function nsurlErrorMessage(code: number, description: string): string {
  return NSURL_CANNOT_CONNECT_ERROR_MESSAGE.replaceAll(
    'Code=-1004',
    `Code=${code}`,
  ).replaceAll('Could not connect to the server.', description);
}

describe('predictErrorHandler', () => {
  describe('ensureError', () => {
    it('returns the same Error instance when given an Error', () => {
      const original = new Error('test error');

      const result = ensureError(original);

      expect(result).toBe(original);
      expect(result.message).toBe('test error');
    });

    it('wraps a string into an Error', () => {
      const result = ensureError('string error');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });

    it('wraps a number into an Error', () => {
      const result = ensureError(42);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('42');
    });

    it('wraps null into an Error', () => {
      const result = ensureError(null);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });

    it('wraps undefined into an Error', () => {
      const result = ensureError(undefined);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('undefined');
    });

    it('wraps an object into an Error using String coercion', () => {
      const result = ensureError({ code: 'FAIL' });

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });
  });

  describe('isNetworkError', () => {
    it.each([
      'java.lang.RuntimeException: Cronet failed: Exception in CronetUrlRequest: net::ERR_CONNECTION_TIMED_OUT',
      'Cronet failed: net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_INTERNET_DISCONNECTED',
      'TypeError: Network request failed',
      'The connection timed out',
      'Connection was reset',
      'Request timeout',
      'The Internet connection appears to be offline.',
      'Network is unreachable',
      'Could not resolve host: example.com',
    ])('returns true for connectivity failure: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(true);
    });

    it('matches network errors passed as plain strings', () => {
      expect(isNetworkError('net::ERR_CONNECTION_REFUSED')).toBe(true);
    });

    it.each([
      // App-level HTTP/logic errors must still reach Sentry, including
      // "Failed to fetch X" messages for non-OK responses.
      'Failed to get positions',
      'Failed to fetch related tags',
      'Failed to fetch carousel data',
      'Address is required',
      'Order not fully filled',
      'Unexpected token in JSON',
      '',
    ])('returns false for non-network error: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('returns true for the iOS cannot-connect NSError fixture', () => {
      expect(
        isNetworkError(new Error(NSURL_CANNOT_CONNECT_ERROR_MESSAGE)),
      ).toBe(true);
    });

    it.each([
      [NSURL_ERROR_TIMED_OUT, TIMED_OUT_DESCRIPTION],
      [NSURL_ERROR_CANNOT_FIND_HOST, CANNOT_FIND_HOST_DESCRIPTION],
      [
        NSURL_ERROR_NETWORK_CONNECTION_LOST,
        NETWORK_CONNECTION_LOST_DESCRIPTION,
      ],
      [
        NSURL_ERROR_NOT_CONNECTED_TO_INTERNET,
        NOT_CONNECTED_TO_INTERNET_DESCRIPTION,
      ],
      [
        NSURL_ERROR_CANNOT_CONNECT_TO_HOST,
        LOCALIZED_CANNOT_CONNECT_DESCRIPTION,
      ],
    ])(
      'returns true for an NSURLErrorDomain connectivity variant %s',
      (code, description) => {
        expect(
          isNetworkError(new Error(nsurlErrorMessage(code, description))),
        ).toBe(true);
      },
    );

    it('returns false for an NSURLErrorDomain secure-connection failure', () => {
      const message = nsurlErrorMessage(
        NSURL_ERROR_SECURE_CONNECTION_FAILED,
        SECURE_CONNECTION_FAILED_DESCRIPTION,
      );

      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it('returns true when the NSURL code is only inside NSUnderlyingError', () => {
      const message =
        'Error Domain=NSPOSIXErrorDomain Code=57 "Socket is not connected" UserInfo={NSUnderlyingError=0x1 {Error Domain=NSURLErrorDomain Code=-1005 "(null)"}}';

      expect(isNetworkError(new Error(message))).toBe(true);
    });

    it('returns false for a -1200 failure whose underlying error is CFNetwork', () => {
      // 5ZC0 (bb1a2c01) puts -1200 on NSURLErrorDomain and again on
      // kCFErrorDomainCFNetwork inside NSUnderlyingError. The inner domain
      // is not NSURLErrorDomain, so it must stay a reported error.
      const message = nsurlErrorMessage(
        NSURL_ERROR_SECURE_CONNECTION_FAILED,
        SECURE_CONNECTION_FAILED_DESCRIPTION,
      );

      expect(message).toContain(
        'NSUnderlyingError=0x11e72e040 {Error Domain=kCFErrorDomainCFNetwork Code=-1200 "(null)"',
      );
      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it('returns false for the same connectivity code on NSCocoaErrorDomain', () => {
      const message = nsurlErrorMessage(
        NSURL_ERROR_CANNOT_CONNECT_TO_HOST,
        LOCALIZED_CANNOT_CONNECT_DESCRIPTION,
      ).replaceAll('NSURLErrorDomain', 'NSCocoaErrorDomain');

      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it.each([408, 504])('returns true for an HTTP %s failure', (status) => {
      expect(
        isNetworkError(new Error(`POST /prices failed: ${status} gateway`)),
      ).toBe(true);
    });

    it('returns false when an HTTP 400 body contains timeout', () => {
      expect(
        isNetworkError(
          new Error(
            'POST /prices failed: 400 {"error":"invalid param timeoutMs"}',
          ),
        ),
      ).toBe(false);
    });

    it('returns false for an HTTP 500 server deadline', () => {
      expect(
        isNetworkError(
          new Error('POST /prices failed: 500 context deadline exceeded'),
        ),
      ).toBe(false);
    });

    it.each([
      'Polymarket request timed out',
      'Predict positions request timed out after 60000ms',
      'Predict balance request timed out after 60000ms',
      'net::ERR_TIMED_OUT',
      'net::ERR_CONNECTION_TIMED_OUT',
      'POST /prices failed: 504 Gateway Timeout',
      'POST /prices failed: 408 gateway',
    ])('returns true for a real transport timeout: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(true);
    });

    it.each([
      'Block tracker update timed out after 10000ms',
      'Failed to sync deposit wallet collateral balance allowance: 500 {"error":"upstream timeout"}',
      'timeout',
      'java.net.SocketTimeoutException: connect timed out',
      'java.net.SocketTimeoutException: timeout',
      'Gateway Timeout',
      '504 Gateway Timeout',
      'Polymarket geoblock check failed with status 504',
    ])(
      'returns false when timeout text is not a transport failure: %s',
      (message) => {
        expect(isNetworkError(new Error(message))).toBe(false);
      },
    );

    it.each([
      'net::ERR_CERT_AUTHORITY_INVALID',
      'net::ERR_CERT_DATE_INVALID',
      'Cronet failed: Exception in CronetUrlRequest: net::ERR_CERT_AUTHORITY_INVALID',
      'net::ERR_SSL_PROTOCOL_ERROR',
      'net::ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN',
      'Cronet failed: Exception in CronetUrlRequest: net::ERR_SSL_PROTOCOL_ERROR',
    ])('returns false for an Android TLS error: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it('returns false for an NSURLErrorDomain bad-server-response failure', () => {
      const message = nsurlErrorMessage(
        NSURL_ERROR_BAD_SERVER_RESPONSE,
        BAD_SERVER_RESPONSE_DESCRIPTION,
      );

      expect(isNetworkError(new Error(message))).toBe(false);
    });
  });

  describe('reportPredictError', () => {
    const errorContext = {
      tags: { feature: 'Predict' },
      context: {
        name: 'PolymarketProvider',
        data: { method: 'getMarkets' },
      },
    };

    beforeEach(() => {
      jest.mocked(Logger.log).mockClear();
      jest.mocked(Logger.error).mockClear();
      jest.mocked(addBreadcrumb).mockClear();
    });

    it('logs a breadcrumb for an iOS connectivity failure', () => {
      const error = new Error(NSURL_CANNOT_CONNECT_ERROR_MESSAGE);

      reportPredictError(error, errorContext);

      expect(addBreadcrumb).toHaveBeenCalledWith({
        category: 'predict.network',
        level: 'warning',
        message: 'getMarkets network failure -1004',
        data: {
          source: 'PolymarketProvider',
          method: 'getMarkets',
          code: '-1004',
        },
      });
      expect(Logger.log).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('reports a non-network error to Sentry', () => {
      const error = new Error('Failed to fetch related tags');

      reportPredictError(error, errorContext);

      expect(Logger.error).toHaveBeenCalledWith(error, errorContext);
      expect(addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('isPredictNoMatchError', () => {
    it.each([
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK,
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_BUY,
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_SELL,
      'no order match',
      'not enough bids to match user share amount',
    ])('returns true for a no-match error: %s', (message) => {
      expect(isPredictNoMatchError(new Error(message))).toBe(true);
      expect(isPredictNoMatchError(message)).toBe(true);
    });

    it.each([
      PREDICT_ERROR_CODES.PREVIEW_FAILED,
      PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
      'net::ERR_CONNECTION_TIMED_OUT',
      'Some other failure',
      '',
    ])('returns false for a non-no-match error: %s', (message) => {
      expect(isPredictNoMatchError(new Error(message))).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isPredictNoMatchError(null)).toBe(false);
      expect(isPredictNoMatchError(undefined)).toBe(false);
    });
  });

  describe('showDepositErrorToast', () => {
    beforeEach(() => {
      jest.mocked(toast).mockClear();
    });

    it('shows a danger toast without a retry action', () => {
      showDepositErrorToast();

      expect(toast).toHaveBeenCalledWith({
        title: 'predict.deposit.error_title',
        description: 'predict.deposit.error_description',
        severity: ToastSeverity.Danger,
        hasNoTimeout: false,
        showCloseButton: false,
      });
    });

    it('includes a try again action when onRetry is provided', () => {
      const onRetry = jest.fn();

      showDepositErrorToast(onRetry);

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'predict.deposit.error_title',
          description: 'predict.deposit.error_description',
          severity: ToastSeverity.Danger,
          actionButtonLabel: 'predict.deposit.try_again',
          actionButtonOnPress: onRetry,
        }),
      );
    });

    it('omits the try again action when onRetry is undefined', () => {
      showDepositErrorToast(undefined);

      expect(toast).toHaveBeenCalledWith(
        expect.not.objectContaining({
          actionButtonLabel: expect.anything(),
          actionButtonOnPress: expect.anything(),
        }),
      );
    });
  });

  describe('parseErrorMessage', () => {
    it('returns mapped message for a known error code', () => {
      const result = parseErrorMessage({
        error: new Error(PREDICT_ERROR_CODES.NOT_ELIGIBLE),
      });

      expect(result).toBe('You are not eligible');
    });

    it('returns mapped message for a different known error code', () => {
      const result = parseErrorMessage({
        error: new Error(PREDICT_ERROR_CODES.PLACE_ORDER_FAILED),
      });

      expect(result).toBe('Order placement failed');
    });

    it('falls back to defaultCode when error message is not in the map', () => {
      const result = parseErrorMessage({
        error: new Error('some random error'),
        defaultCode: PREDICT_ERROR_CODES.UNKNOWN_ERROR,
      });

      expect(result).toBe('Something went wrong');
    });

    it('returns raw error message when neither message nor defaultCode match', () => {
      const result = parseErrorMessage({
        error: new Error('completely unknown'),
      });

      expect(result).toBe('completely unknown');
    });

    it('maps deposit failed code to human-readable copy', () => {
      const result = parseErrorMessage({
        error: new Error(PREDICT_ERROR_CODES.DEPOSIT_FAILED),
      });

      expect(result).toBe('Deposit failed mapped');
    });

    it('maps withdraw failed code to human-readable copy', () => {
      const result = parseErrorMessage({
        error: new Error(PREDICT_ERROR_CODES.WITHDRAW_FAILED),
      });

      expect(result).toBe('Withdraw failed mapped');
    });

    it('falls back to unknown error for unmapped PREDICT_* codes', () => {
      const result = parseErrorMessage({
        error: new Error('PREDICT_SOME_NEW_CODE'),
      });

      expect(result).toBe('Something went wrong');
    });

    it('converts string error to message', () => {
      const result = parseErrorMessage({
        error: 'raw string error',
      });

      expect(result).toBe('raw string error');
    });

    it('converts non-string non-Error to string', () => {
      const result = parseErrorMessage({ error: 404 });

      expect(result).toBe('404');
    });

    it('uses defaultCode when error is not a known code', () => {
      const result = parseErrorMessage({
        error: 12345,
        defaultCode: PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
      });

      expect(result).toBe('Order placement failed');
    });
  });

  describe('checkPlaceOrderError', () => {
    const mockDevLogger = jest.mocked(DevLogger);
    const mockLogger = jest.mocked(Logger);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const createMockOrderParams = () => ({
      preview: {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        timestamp: 1234567890,
        side: Side.BUY,
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 50,
        slippage: 0.01,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      },
      analyticsProperties: {
        marketId: 'market-1',
        transactionType: 'buy',
      },
    });

    it('returns order_not_filled status when error message is BUY_ORDER_NOT_FULLY_FILLED', () => {
      const error = new Error(PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED);
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({ status: 'order_not_filled' });
    });

    it('returns order_not_filled status when error message is SELL_ORDER_NOT_FULLY_FILLED', () => {
      const error = new Error(PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED);
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({ status: 'order_not_filled' });
    });

    it('returns error status with parsed message for generic Error', () => {
      const error = new Error('Some generic error');
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({
        status: 'error',
        error: 'Order placement failed',
      });
    });

    it('returns error status with parsed message for string error', () => {
      const error = 'String error message';
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({
        status: 'error',
        error: 'Order placement failed',
      });
    });

    it('calls Logger.error with wrapped error and context', () => {
      const error = new Error('Test error');
      const orderParams = createMockOrderParams();

      checkPlaceOrderError({ error, orderParams });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'Predict',
            component: 'usePredictPlaceOrder',
          },
          context: expect.objectContaining({
            name: 'usePredictPlaceOrder',
            data: expect.objectContaining({
              method: 'placeOrder',
              action: 'order_placement',
              operation: 'order_management',
              side: 'BUY',
              marketId: 'market-1',
              transactionType: 'buy',
            }),
          }),
        }),
      );
    });

    it('calls DevLogger.log with parsed error message and order params', () => {
      const error = new Error('Test error');
      const orderParams = createMockOrderParams();

      checkPlaceOrderError({ error, orderParams });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'usePredictPlaceOrder: Error placing order',
        expect.objectContaining({
          error: 'Order placement failed',
          orderParams,
        }),
      );
    });

    it('returns error status with mapped message when error code is known', () => {
      const error = new Error(PREDICT_ERROR_CODES.PLACE_ORDER_FAILED);
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({
        status: 'error',
        error: 'Order placement failed',
      });
    });

    it('handles string error that matches BUY_ORDER_NOT_FULLY_FILLED', () => {
      const error = PREDICT_ERROR_CODES.BUY_ORDER_NOT_FULLY_FILLED;
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({ status: 'order_not_filled' });
    });

    it('handles string error that matches SELL_ORDER_NOT_FULLY_FILLED', () => {
      const error = PREDICT_ERROR_CODES.SELL_ORDER_NOT_FULLY_FILLED;
      const orderParams = createMockOrderParams();

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({ status: 'order_not_filled' });
    });

    it('includes side from preview in Logger context', () => {
      const error = new Error('Test error');
      const orderParams = createMockOrderParams();
      orderParams.preview.side = Side.SELL;

      checkPlaceOrderError({ error, orderParams });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              side: Side.SELL,
            }),
          }),
        }),
      );
    });

    it('includes marketId from analyticsProperties in Logger context', () => {
      const error = new Error('Test error');
      const orderParams = createMockOrderParams();
      orderParams.analyticsProperties = {
        marketId: 'custom-market-id',
        transactionType: 'buy',
      };

      checkPlaceOrderError({ error, orderParams });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              marketId: 'custom-market-id',
            }),
          }),
        }),
      );
    });

    it('handles error with minimal analyticsProperties', () => {
      const error = new Error('Test error');
      const orderParams = createMockOrderParams();
      orderParams.analyticsProperties = {
        marketId: 'market-1',
        transactionType: 'buy',
      };

      const result = checkPlaceOrderError({ error, orderParams });

      expect(result).toEqual({
        status: 'error',
        error: 'Order placement failed',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
