import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { PREDICT_ERROR_CODES } from '../constants/errors';
import {
  ensureError,
  createDepositErrorToast,
  parseErrorMessage,
} from './predictErrorHandler';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../constants/errors', () => ({
  ...jest.requireActual('../constants/errors'),
  getPredictErrorMessages: () => ({
    PREDICT_NOT_ELIGIBLE: 'You are not eligible',
    PREDICT_PLACE_ORDER_FAILED: 'Order placement failed',
    PREDICT_UNKNOWN_ERROR: 'Something went wrong',
  }),
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
});
