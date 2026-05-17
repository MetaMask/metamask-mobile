import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { PREDICT_ERROR_CODES } from '../constants/errors';
import { Side } from '../types';
import {
  ensureError,
  createDepositErrorToast,
  parseErrorMessage,
  checkPlaceOrderError,
} from './predictErrorHandler';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../constants/errors', () => ({
  ...jest.requireActual('../constants/errors'),
  getPredictErrorMessages: () => ({
    PREDICT_NOT_ELIGIBLE: 'You are not eligible',
    PREDICT_PLACE_ORDER_FAILED: 'Order placement failed',
    PREDICT_UNKNOWN_ERROR: 'Something went wrong',
    PREDICT_BUY_ORDER_NOT_FULLY_FILLED: 'Buy order not fully filled',
    PREDICT_SELL_ORDER_NOT_FULLY_FILLED: 'Sell order not fully filled',
  }),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockTheme = {
  colors: {
    error: { default: 'error-color' },
    accent04: { normal: 'accent-color' },
  },
};

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

  describe('createDepositErrorToast', () => {
    it('returns base toast config without retry', () => {
      const toast = createDepositErrorToast(mockTheme);

      expect(toast).toEqual({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: 'predict.deposit.error_title', isBold: true },
          { label: '\n', isBold: false },
          { label: 'predict.deposit.error_description', isBold: false },
        ],
        iconName: IconName.Error,
        iconColor: 'error-color',
        backgroundColor: 'accent-color',
        hasNoTimeout: false,
      });
    });

    it('includes linkButtonOptions when onRetry is provided', () => {
      const onRetry = jest.fn();

      const toast = createDepositErrorToast(mockTheme, onRetry);

      expect(toast.linkButtonOptions).toEqual({
        label: 'predict.deposit.try_again',
        onPress: onRetry,
      });
    });

    it('does not include linkButtonOptions when onRetry is undefined', () => {
      const toast = createDepositErrorToast(mockTheme, undefined);

      expect(toast).not.toHaveProperty('linkButtonOptions');
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
