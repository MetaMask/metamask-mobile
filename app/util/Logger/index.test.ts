import Logger, { AsyncLogger, type LoggerErrorOptions } from '.';
import { captureException, withScope } from '@sentry/react-native';
import { AGREED, METRICS_OPT_IN } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);
const mockedWithScope = jest.mocked(withScope);

// Mock scope object
const mockScope = {
  setTag: jest.fn(),
  setContext: jest.fn(),
  setExtras: jest.fn(),
};

describe('Logger', () => {
  beforeEach(() => {
    StorageWrapper.getItem = jest.fn((key: string) => {
      switch (key) {
        case METRICS_OPT_IN:
          return Promise.resolve(AGREED);
        default:
          return Promise.resolve('');
      }
    });

    // Setup withScope to call our mockScope
    mockedWithScope.mockImplementation((callback) => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback(mockScope as any);
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockScope.setTag.mockClear();
    mockScope.setContext.mockClear();
    mockScope.setExtras.mockClear();
  });

  describe('error', () => {
    it('warns if error is not defined', async () => {
      const warn = jest.spyOn(console, 'warn');
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Logger.error(undefined as any);
      expect(warn).toBeCalledWith('No error provided');
    });

    it('skips captureException if metrics is opted out', async () => {
      StorageWrapper.getItem = jest.fn((key: string) => {
        switch (key) {
          case METRICS_OPT_IN:
            return Promise.resolve('');
          default:
            return Promise.resolve('');
        }
      });
      const testError = new Error('testError');
      await Logger.error(testError);
      expect(mockedCaptureException).not.toBeCalled();
    });

    it('calls captureException if metrics is opted in', async () => {
      const testError = new Error('testError');
      await Logger.error(testError);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calls withScope if extra is passed in', async () => {
      const testError = new Error('testError');
      await Logger.error(testError, 'extraMessage');
      expect(mockedWithScope).toHaveBeenCalledTimes(1);
    });

    it('calls captureException when string is passed instead of Error object', async () => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testError = 'testError' as any;
      await Logger.error(testError);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    });

    describe('new format with LoggerErrorOptions', () => {
      it('calls Sentry APIs correctly with tags, context, and extras', async () => {
        const error = new Error('Test error');
        const options: LoggerErrorOptions = {
          tags: {
            feature: 'perps',
            provider: 'hyperliquid',
            statusCode: 500,
          },
          context: {
            name: 'perps_controller',
            data: { method: 'placeOrder', coin: 'BTC' },
          },
          extras: { debugInfo: 'test', fullResponse: { status: 500 } },
        };

        await AsyncLogger.error(error, options);

        expect(mockScope.setTag).toHaveBeenCalledWith('feature', 'perps');
        expect(mockScope.setTag).toHaveBeenCalledWith(
          'provider',
          'hyperliquid',
        );
        expect(mockScope.setTag).toHaveBeenCalledWith('statusCode', '500');
        expect(mockScope.setTag).toHaveBeenCalledTimes(3);
        expect(mockScope.setContext).toHaveBeenCalledWith('perps_controller', {
          method: 'placeOrder',
          coin: 'BTC',
        });
        expect(mockScope.setContext).toHaveBeenCalledTimes(1);
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          debugInfo: 'test',
          fullResponse: { status: 500 },
        });
        expect(mockScope.setExtras).toHaveBeenCalledTimes(1);
        expect(mockedCaptureException).toHaveBeenCalledWith(error);
      });

      it('converts non-Error objects to Error instances', async () => {
        const errorObject = { code: 'ERR_001', details: 'Something failed' };
        const options: LoggerErrorOptions = {
          tags: { feature: 'perps' },
        };

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await AsyncLogger.error(errorObject as any, options);

        expect(mockedCaptureException).toHaveBeenCalled();
        const capturedError = mockedCaptureException.mock
          .calls[0][0] as Error & { originalError?: unknown };
        expect(capturedError).toBeInstanceOf(Error);
        expect(capturedError.message).toBe(JSON.stringify(errorObject));
        expect(capturedError.originalError).toEqual(errorObject);
      });
    });

    describe('legacy format (backward compatibility)', () => {
      it('treats object without special keys as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { feature: 'perps', provider: 'hyperliquid' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          feature: 'perps',
          provider: 'hyperliquid',
        });
        expect(mockScope.setTag).not.toHaveBeenCalled();
        expect(mockScope.setContext).not.toHaveBeenCalled();
        expect(mockedCaptureException).toHaveBeenCalledWith(error);
      });

      it('treats string extra as legacy format with message key', async () => {
        const error = new Error('Test error');
        const legacyExtra = 'Additional error context';

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          message: 'Additional error context',
        });
      });

      it('treats legacy object with tags string as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { tags: 'some-string-tag', userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          tags: 'some-string-tag',
          userId: '123',
        });
        expect(mockScope.setTag).not.toHaveBeenCalled();
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });

      it('treats legacy object with context string as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { context: 'user checkout flow', userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          context: 'user checkout flow',
          userId: '123',
        });
        expect(mockScope.setTag).not.toHaveBeenCalled();
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });

      it('treats legacy object with extras string as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { extras: 'debug info', userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          extras: 'debug info',
          userId: '123',
        });
        expect(mockScope.setTag).not.toHaveBeenCalled();
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });

      it('treats legacy object with tags null as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { tags: null, userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          tags: null,
          userId: '123',
        });
        expect(mockScope.setTag).not.toHaveBeenCalled();
      });

      it('treats legacy object with context missing name as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { context: { data: 'test' }, userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          context: { data: 'test' },
          userId: '123',
        });
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });

      it('treats legacy object with context missing data as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = { context: { name: 'test' }, userId: '123' };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          context: { name: 'test' },
          userId: '123',
        });
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });

      it('treats legacy object with context data null as legacy format', async () => {
        const error = new Error('Test error');
        const legacyExtra = {
          context: { name: 'test', data: null },
          userId: '123',
        };

        await AsyncLogger.error(error, legacyExtra);

        expect(mockScope.setExtras).toHaveBeenCalledWith({
          context: { name: 'test', data: null },
          userId: '123',
        });
        expect(mockScope.setContext).not.toHaveBeenCalled();
      });
    });

    describe('unknown field preservation', () => {
      it('preserves unknown fields when using new format with tags', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          tags: { feature: 'perps' },
          userId: '123',
          operation: 'checkout',
        });

        expect(mockScope.setTag).toHaveBeenCalledWith('feature', 'perps');
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          userId: '123',
          operation: 'checkout',
        });
      });

      it('preserves unknown fields when using new format with context', async () => {
        const error = new Error('Test error');
        const timestamp = Date.now();
        await AsyncLogger.error(error, {
          context: { name: 'test', data: { method: 'placeOrder' } },
          userId: '123',
          timestamp,
        });

        expect(mockScope.setContext).toHaveBeenCalledWith('test', {
          method: 'placeOrder',
        });
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          userId: '123',
          timestamp,
        });
      });

      it('merges extras and unknown fields into a single setExtras call', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          tags: { feature: 'perps' },
          context: { name: 'test', data: { method: 'test' } },
          extras: { debugInfo: 'test' },
          userId: '123',
          customField: 'value',
        });

        expect(mockScope.setTag).toHaveBeenCalled();
        expect(mockScope.setContext).toHaveBeenCalled();
        expect(mockScope.setExtras).toHaveBeenCalledTimes(1);
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          debugInfo: 'test',
          userId: '123',
          customField: 'value',
        });
      });

      it('does not call setExtras for unknown fields when none exist', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          tags: { feature: 'perps' },
        });

        expect(mockScope.setTag).toHaveBeenCalled();
        expect(mockScope.setExtras).not.toHaveBeenCalled();
      });

      it('does not lose extras data when both extras and unknown fields exist', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          extras: {
            requestId: '123',
            timestamp: 1234567890,
            debugData: { nested: 'value' },
          },
          unknownField: 'should-not-overwrite',
          anotherField: 42,
        });

        expect(mockScope.setExtras).toHaveBeenCalledTimes(1);
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          requestId: '123',
          timestamp: 1234567890,
          debugData: { nested: 'value' },
          unknownField: 'should-not-overwrite',
          anotherField: 42,
        });
      });

      it('handles only extras without unknown fields', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          extras: { requestId: '123', timestamp: 1234567890 },
        });

        expect(mockScope.setExtras).toHaveBeenCalledTimes(1);
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          requestId: '123',
          timestamp: 1234567890,
        });
      });

      it('handles only unknown fields without extras', async () => {
        const error = new Error('Test error');
        await AsyncLogger.error(error, {
          tags: { feature: 'perps' },
          unknownField: 'value',
        });

        expect(mockScope.setExtras).toHaveBeenCalledTimes(1);
        expect(mockScope.setExtras).toHaveBeenCalledWith({
          unknownField: 'value',
        });
      });
    });
  });
});
