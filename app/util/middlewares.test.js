import Logger from './Logger';
import trackErrorAsAnalytics from './metrics/TrackError/trackErrorAsAnalytics';
import {
  createOriginMiddleware,
  containsUserRejectedError,
  createLoggerMiddleware,
} from './middlewares';

// Mock dependencies
jest.mock('./Logger');
jest.mock('./metrics/TrackError/trackErrorAsAnalytics');

describe('middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createOriginMiddleware', () => {
    it('appends origin to request', () => {
      const origin = 'https://example.com';
      const middleware = createOriginMiddleware({ origin });
      const req = {};
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.origin).toBe(origin);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('initializes params as empty array if not present', () => {
      const middleware = createOriginMiddleware({ origin: 'https://test.com' });
      const req = {};
      const next = jest.fn();

      middleware(req, {}, next);

      expect(req.params).toEqual([]);
    });

    it('does not override existing params', () => {
      const existingParams = [1, 2, 3];
      const middleware = createOriginMiddleware({ origin: 'https://test.com' });
      const req = { params: existingParams };
      const next = jest.fn();

      middleware(req, {}, next);

      expect(req.params).toBe(existingParams);
    });
  });

  describe('containsUserRejectedError', () => {
    describe('returns true', () => {
      it('when error message contains "user rejected"', () => {
        expect(containsUserRejectedError('User rejected the transaction')).toBe(
          true,
        );
      });

      it('when error message contains "user denied"', () => {
        expect(
          containsUserRejectedError(
            'MetaMask Message Signature: User denied message signature.',
          ),
        ).toBe(true);
      });

      it('when error message contains "user cancelled"', () => {
        expect(
          containsUserRejectedError('User cancelled the transaction'),
        ).toBe(true);
      });

      it('when error message is case insensitive', () => {
        expect(containsUserRejectedError('USER REJECTED')).toBe(true);
        expect(containsUserRejectedError('UsEr DeNiEd')).toBe(true);
      });

      it('when error code is 4001', () => {
        expect(containsUserRejectedError('Some error', 4001)).toBe(true);
      });

      it('when both message and code indicate user rejection', () => {
        expect(containsUserRejectedError('User rejected', 4001)).toBe(true);
      });
    });

    describe('returns false', () => {
      it('when error message is null', () => {
        expect(containsUserRejectedError(null)).toBe(false);
      });

      it('when error message is undefined', () => {
        expect(containsUserRejectedError(undefined)).toBe(false);
      });

      it('when error message is not a string', () => {
        expect(containsUserRejectedError(123)).toBe(false);
        expect(containsUserRejectedError({})).toBe(false);
        expect(containsUserRejectedError([])).toBe(false);
      });

      it('when error message does not contain user rejection phrases', () => {
        expect(containsUserRejectedError('Internal JSON-RPC error')).toBe(
          false,
        );
      });

      it('when error code is not 4001', () => {
        expect(containsUserRejectedError('Some error', 4000)).toBe(false);
        expect(containsUserRejectedError('Some error', 4002)).toBe(false);
      });

      it('when an exception occurs during checking', () => {
        // Pass an object that will cause toLowerCase to throw
        const errorMessage = {
          toLowerCase: () => {
            throw new Error('Test error');
          },
        };
        expect(containsUserRejectedError(errorMessage)).toBe(false);
      });
    });
  });

  describe('createLoggerMiddleware', () => {
    let middleware;
    const origin = 'https://example.com';
    let req;
    let res;
    let next;
    let callback;

    beforeEach(() => {
      middleware = createLoggerMiddleware({ origin });
      req = { method: 'eth_sendTransaction' };
      res = {};
      next = jest.fn((cb) => {
        callback = cb;
      });
    });

    describe('when response has no error', () => {
      it('logs RPC activity', () => {
        res = { result: 'success' };

        middleware(req, res, next);
        callback(jest.fn());

        expect(Logger.log).toHaveBeenCalledWith(
          `RPC (${origin}):`,
          req,
          '->',
          res,
        );
      });

      it('does not log when request is internal', () => {
        req.isMetamaskInternal = true;
        res = { result: 'success' };

        middleware(req, res, next);
        callback(jest.fn());

        expect(Logger.log).not.toHaveBeenCalled();
      });
    });

    describe('when response has user rejection error', () => {
      it('tracks user rejection to analytics', () => {
        const errorMessage = 'User rejected the transaction';
        res = {
          error: {
            message: errorMessage,
            code: 4001,
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response: User rejected',
          errorMessage,
        );
        expect(Logger.log).toHaveBeenCalledWith(
          `RPC (${origin}):`,
          req,
          '->',
          res,
        );
      });

      it('does not log RPC activity for user rejection with isMetamaskInternal', () => {
        req.isMetamaskInternal = true;
        res = {
          error: {
            message: 'User denied',
            code: 4001,
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalled();
        expect(Logger.log).not.toHaveBeenCalled();
      });
    });

    describe('when response has non-user-rejection error', () => {
      it('tracks error with nested data.message to analytics', () => {
        const nestedMessage = 'gas required exceeds allowance (59956966)';
        res = {
          error: {
            code: -32603,
            message: 'Internal JSON-RPC error.',
            data: {
              code: -32000,
              message: nestedMessage,
            },
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          nestedMessage,
        );
      });

      it('tracks error with top-level message when data.message is missing', () => {
        const errorMessage = 'Unrecognized chain ID "0x999"';
        res = {
          error: {
            code: 4902,
            message: errorMessage,
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          errorMessage,
        );
      });

      it('tracks error with fallback message when both are missing', () => {
        res = {
          error: {
            code: -32603,
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          'Unknown RPC error',
        );
      });

      it('prioritizes data.message over message', () => {
        const nestedMessage = 'Specific nested error';
        res = {
          error: {
            message: 'Generic error',
            data: {
              message: nestedMessage,
            },
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          nestedMessage,
        );
      });

      it('logs RPC activity after tracking error', () => {
        res = {
          error: {
            message: 'Some error',
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalled();
        expect(Logger.log).toHaveBeenCalledWith(
          `RPC (${origin}):`,
          req,
          '->',
          res,
        );
      });

      it('does not log RPC activity when request is internal', () => {
        req.isMetamaskInternal = true;
        res = {
          error: {
            message: 'Some error',
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalled();
        expect(Logger.log).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('handles error with empty string message', () => {
        res = {
          error: {
            message: '',
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          'Unknown RPC error',
        );
      });

      it('handles error with null message', () => {
        res = {
          error: {
            message: null,
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          'Unknown RPC error',
        );
      });

      it('handles error with data but no data.message', () => {
        res = {
          error: {
            message: 'Top level message',
            data: {
              code: -32000,
            },
          },
        };

        middleware(req, res, next);
        callback(jest.fn());

        expect(trackErrorAsAnalytics).toHaveBeenCalledWith(
          'Error in RPC response',
          'Top level message',
        );
      });
    });

    it('calls next with callback', () => {
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(typeof next.mock.calls[0][0]).toBe('function');
    });

    it('invokes callback passed to middleware callback', () => {
      const cb = jest.fn();

      middleware(req, res, next);
      callback(cb);

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
