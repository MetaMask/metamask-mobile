import Logger from '../../../../util/Logger';
import { PolymarketRequestTimeoutError } from '../providers/polymarket/fetchWithTimeout';
import {
  getNSURLErrorCode,
  isNetworkError,
  logPredictError,
  PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS,
  PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
  recordPredictNetworkError,
  resetPredictNetworkErrorThrottle,
} from './predictNetworkError';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const context = {
  tags: { feature: 'Predict', provider: 'polymarket' },
  context: { name: 'PolymarketProvider', data: { method: 'getPrices' } },
};

const CRONET_MESSAGE =
  'java.lang.RuntimeException: Cronet failed: Exception in CronetUrlRequest: net::ERR_CONNECTION_TIMED_OUT, ErrorCode=6, InternalErrorCode=-118, Retryable=true';
const NSURL_OFFLINE_MESSAGE =
  'Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline."';

describe('predictNetworkError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPredictNetworkErrorThrottle();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isNetworkError', () => {
    it.each([
      // fetchWithTimeout's own timeout error.
      new PolymarketRequestTimeoutError(new Error('aborted')).message,
      // iOS URLSession / RN fetch / POSIX / OkHttp client timeouts.
      'The request timed out.',
      'Network request timed out',
      'Request timeout',
      'request timeout after 30s',
      'Operation timed out',
      'The connection timed out',
      'timeout',
      'connect ETIMEDOUT 104.18.0.1:443',
      // OkHttp (Android RN default fetch).
      'java.net.SocketTimeoutException: timeout',
      'java.net.SocketTimeoutException: failed to connect to gamma-api.polymarket.com/104.18.0.1 (port 443) after 10000ms',
      // Intentional: HTTP 408 is a client-side timeout, unlike 504.
      'Failed to fetch markets: 408 Request Timeout',
    ])('returns true for client-side timeout: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(true);
    });

    it.each([
      // HTTP 5xx: the server answered, so this is not connectivity noise.
      'Request failed with status 500',
      'Failed to fetch markets: 504 Gateway Timeout',
      'Failed to fetch markets: 504 Gateway Time-out',
      // Shape produced by parseJsonOrThrow (providers/polymarket/utils.ts)
      // for an HTML error page.
      'Polymarket fetch returned non-JSON (status 504) from https://clob.polymarket.com/auth/api-key: <html> <head><title>504 Gateway Timeout</title></head> <body> <h1>504 Gateway Timeout</h1> </body> </html>',
      // Cloudflare 522 page body contains "Connection timed out".
      'Polymarket fetch returned non-JSON (status 522) from https://gamma-api.polymarket.com/events: <!DOCTYPE html> <title>gamma-api.polymarket.com | 522: Connection timed out</title>',
      // WebSocket heartbeat timeouts are not fetch connectivity failures.
      'WebSocketManager: market WebSocket heartbeat timeout',
      // depositWallet.ts write-path waits must stay real Sentry errors.
      'Timed out waiting for Polymarket deposit wallet relayer transaction 0193a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
      'Timed out waiting for Polymarket deposit wallet 0x1234567890abcdef1234567890abcdef12345678 to be recognized by relayer',
      // PolymarketProvider optimistic-update log wording.
      'PolymarketProvider: Removing optimistic update due to timeout',
    ])('returns false for server/app timeout wording: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(false);
    });

    it.each([
      'Error Domain=NSURLErrorDomain Code=-10090 "Unknown"',
      'Error Domain=NSURLErrorDomain Code=-100 "Unknown"',
      'Error Domain=NSURLErrorDomain Code=-12000 "Unknown"',
    ])(
      'returns false for NSURL codes that only share a prefix: %s',
      (message) => {
        expect(isNetworkError(new Error(message))).toBe(false);
      },
    );

    it.each([
      'The operation couldn’t be completed. (NSURLErrorDomain error -1009.)',
      'The operation couldn’t be completed. (NSURLErrorDomain error -1200.)',
      '(NSURLErrorDomain error -1005.)',
    ])('returns true for the alternate NSURL format: %s', (message) => {
      expect(isNetworkError(new Error(message))).toBe(true);
    });

    it.each([
      'The operation couldn’t be completed. (NSURLErrorDomain error -999.)',
      '(NSURLErrorDomain error -1011.)',
      '(NSURLErrorDomain error -10090.)',
      // Domain must start on a word boundary.
      'Error Domain=XNSURLErrorDomain Code=-1009 "offline"',
      '(XNSURLErrorDomain error -1009.)',
    ])(
      'returns false for alternate-format codes outside the set: %s',
      (message) => {
        expect(isNetworkError(new Error(message))).toBe(false);
      },
    );

    it('matches NSURL connectivity codes even when the body mentions HTTP wording', () => {
      expect(
        isNetworkError(
          'Error Domain=NSURLErrorDomain Code=-1001 "The request timed out." gateway timeout',
        ),
      ).toBe(true);
    });
  });

  describe('getNSURLErrorCode', () => {
    it('parses the anchored NSURLErrorDomain code', () => {
      expect(getNSURLErrorCode(new Error(NSURL_OFFLINE_MESSAGE))).toBe(-1009);
    });

    it('parses the alternate "(NSURLErrorDomain error N.)" format', () => {
      expect(
        getNSURLErrorCode(
          'The operation couldn’t be completed. (NSURLErrorDomain error -1009.)',
        ),
      ).toBe(-1009);
      expect(getNSURLErrorCode('(NSURLErrorDomain error -999.)')).toBe(-999);
    });

    it.each(['Code=-1009', 'error -1009', CRONET_MESSAGE, ''])(
      'returns undefined without an NSURLErrorDomain code: %s',
      (message) => {
        expect(getNSURLErrorCode(message)).toBeUndefined();
      },
    );
  });

  describe('logPredictError', () => {
    it('records Cronet network errors as a breadcrumb without nsurl_code', () => {
      logPredictError(new Error(CRONET_MESSAGE), context);

      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
        CRONET_MESSAGE,
        context,
      );
    });

    it('adds nsurl_code to the breadcrumb data for iOS errors', () => {
      logPredictError(new Error(NSURL_OFFLINE_MESSAGE), context);

      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
        NSURL_OFFLINE_MESSAGE,
        {
          tags: context.tags,
          context: {
            name: 'PolymarketProvider',
            data: { method: 'getPrices', nsurl_code: -1009 },
          },
        },
      );
      // Caller's context object is not mutated.
      expect(context.context.data).toEqual({ method: 'getPrices' });
    });

    it('records iOS TLS failures (-1200) as a breadcrumb with nsurl_code', () => {
      const message =
        'Error Domain=NSURLErrorDomain Code=-1200 "A TLS error caused the secure connection to fail." UserInfo={_kCFStreamErrorCodeKey=-9816}';

      expect(isNetworkError(new Error(message))).toBe(true);

      logPredictError(new Error(message), context);

      expect(Logger.error).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
        message,
        expect.objectContaining({
          context: {
            name: 'PolymarketProvider',
            data: { method: 'getPrices', nsurl_code: -1200 },
          },
        }),
      );
    });

    it('adds nsurl_code for the alternate NSURL format', () => {
      const message = '(NSURLErrorDomain error -1005.)';

      logPredictError(new Error(message), context);

      expect(Logger.log).toHaveBeenCalledWith(
        PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
        message,
        expect.objectContaining({
          context: {
            name: 'PolymarketProvider',
            data: { method: 'getPrices', nsurl_code: -1005 },
          },
        }),
      );
    });

    it("falls back to context name 'Predict' when nsurl_code is added without a context", () => {
      const tagsOnly = { tags: { feature: 'Predict' } };

      logPredictError(new Error(NSURL_OFFLINE_MESSAGE), tagsOnly);

      expect(Logger.log).toHaveBeenCalledWith(
        PREDICT_NETWORK_ERROR_BREADCRUMB_MESSAGE,
        NSURL_OFFLINE_MESSAGE,
        {
          tags: { feature: 'Predict' },
          context: { name: 'Predict', data: { nsurl_code: -1009 } },
        },
      );
    });

    it('reports non-network errors to Sentry with the given context', () => {
      const error = new Error('Failed to fetch related tags');

      logPredictError(error, context);

      expect(Logger.error).toHaveBeenCalledWith(error, context);
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('reports HTTP 504 Gateway Timeout errors to Sentry', () => {
      const error = new Error('Failed to fetch markets: 504 Gateway Timeout');

      logPredictError(error, context);

      expect(Logger.error).toHaveBeenCalledWith(error, context);
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('normalizes non-Error values before reporting', () => {
      logPredictError('boom', context);

      expect(Logger.error).toHaveBeenCalledWith(new Error('boom'), context);
    });

    it('does not throttle non-network errors', () => {
      logPredictError(new Error('boom'), context);
      logPredictError(new Error('boom'), context);

      expect(Logger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('network breadcrumb throttle', () => {
    it('records at most one breadcrumb per call site per throttle window', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);

      logPredictError(new Error(CRONET_MESSAGE), context);
      logPredictError(new Error(NSURL_OFFLINE_MESSAGE), context);
      nowSpy.mockReturnValue(
        1_000 + PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS - 1,
      );
      logPredictError(new Error(CRONET_MESSAGE), context);

      expect(Logger.log).toHaveBeenCalledTimes(1);

      nowSpy.mockReturnValue(1_000 + PREDICT_NETWORK_BREADCRUMB_THROTTLE_MS);
      logPredictError(new Error(CRONET_MESSAGE), context);

      expect(Logger.log).toHaveBeenCalledTimes(2);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('throttles each method independently', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);

      logPredictError(new Error(CRONET_MESSAGE), context);
      logPredictError(new Error(CRONET_MESSAGE), {
        ...context,
        context: { name: 'PolymarketProvider', data: { method: 'getMarkets' } },
      });
      logPredictError(new Error(CRONET_MESSAGE), {
        ...context,
        context: { name: 'PredictController', data: { method: 'getPrices' } },
      });

      expect(Logger.log).toHaveBeenCalledTimes(3);
    });

    it("uses the 'unknown' key fallback when context name or method is missing", () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);

      // No context at all -> 'unknown:unknown'; a non-string method is
      // treated the same as a missing one.
      logPredictError(new Error(CRONET_MESSAGE), {
        tags: { feature: 'Predict' },
      });
      logPredictError(new Error(CRONET_MESSAGE), {
        context: { name: 'unknown', data: { method: 42 } },
      });
      expect(Logger.log).toHaveBeenCalledTimes(1);

      // A named context without a method gets its own 'name:unknown' key.
      logPredictError(new Error(CRONET_MESSAGE), {
        context: { name: 'PolymarketProvider', data: {} },
      });
      logPredictError(new Error(CRONET_MESSAGE), {
        context: { name: 'PolymarketProvider', data: {} },
      });
      expect(Logger.log).toHaveBeenCalledTimes(2);
    });

    it('throttles per call site, not per error code', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);

      logPredictError(new Error(NSURL_OFFLINE_MESSAGE), context);
      logPredictError(
        new Error('Error Domain=NSURLErrorDomain Code=-1200 "TLS"'),
        context,
      );

      expect(Logger.log).toHaveBeenCalledTimes(1);
    });

    it('shares the throttle between logPredictError and recordPredictNetworkError', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);

      recordPredictNetworkError(new Error(CRONET_MESSAGE), context);
      logPredictError(new Error(CRONET_MESSAGE), context);

      expect(Logger.log).toHaveBeenCalledTimes(1);
    });

    it('resetPredictNetworkErrorThrottle clears the window', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);

      logPredictError(new Error(CRONET_MESSAGE), context);
      resetPredictNetworkErrorThrottle();
      logPredictError(new Error(CRONET_MESSAGE), context);

      expect(Logger.log).toHaveBeenCalledTimes(2);
    });
  });
});
