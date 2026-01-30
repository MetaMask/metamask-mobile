import ToastService from './ToastService';
import Logger from '../../util/Logger';
import type {
  ToastRef,
  ToastOptions,
} from '../../component-library/components/Toast/Toast.types';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';

jest.mock('../../util/Logger');

describe('ToastService', () => {
  let mockToastRef: React.RefObject<ToastRef>;
  let mockShowToast: jest.Mock;
  let mockCloseToast: jest.Mock;
  let mockLoggerError: jest.SpyInstance;

  const createPlainToastOptions = (
    overrides: Partial<{
      labelOptions: ToastOptions['labelOptions'];
      hasNoTimeout: boolean;
    }> = {},
  ): ToastOptions => ({
    variant: ToastVariants.Plain,
    labelOptions: [{ label: 'Test message' }],
    hasNoTimeout: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ToastService.resetForTesting();

    mockShowToast = jest.fn();
    mockCloseToast = jest.fn();

    mockToastRef = {
      current: {
        showToast: mockShowToast,
        closeToast: mockCloseToast,
      },
    };

    mockLoggerError = jest.spyOn(Logger, 'error');
  });

  afterEach(() => {
    mockLoggerError.mockRestore();
  });

  describe('toastRef getter', () => {
    it('returns null when toastRef is not set', () => {
      const result = ToastService.toastRef;

      expect(result).toBeNull();
    });

    it('returns the toastRef when set', () => {
      ToastService.toastRef = mockToastRef;

      const result = ToastService.toastRef;

      expect(result).toBe(mockToastRef);
    });
  });

  describe('toastRef setter', () => {
    it('sets the toastRef', () => {
      ToastService.toastRef = mockToastRef;

      expect(ToastService.toastRef).toBe(mockToastRef);
    });

    it('sets toastRef to null', () => {
      ToastService.toastRef = mockToastRef;

      ToastService.toastRef = null;

      expect(ToastService.toastRef).toBeNull();
    });
  });

  describe('showToast', () => {
    it('calls showToast on the toast ref with provided options', () => {
      ToastService.toastRef = mockToastRef;
      const options = createPlainToastOptions({ hasNoTimeout: true });

      ToastService.showToast(options);

      expect(mockShowToast).toHaveBeenCalledWith(options);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('throws error when toastRef is null', () => {
      const options = createPlainToastOptions();

      expect(() => ToastService.showToast(options)).toThrow(
        'Toast reference is not available: showToast',
      );
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Toast reference is not available: showToast'),
      );
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('throws error when toastRef.current is null', () => {
      ToastService.toastRef = { current: null };
      const options = createPlainToastOptions();

      expect(() => ToastService.showToast(options)).toThrow(
        'Toast reference is not available: showToast',
      );
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Toast reference is not available: showToast'),
      );
    });

    it('passes all toast options to the ref', () => {
      ToastService.toastRef = mockToastRef;
      const options = createPlainToastOptions({
        labelOptions: [
          { label: 'Bold text', isBold: true },
          { label: ' normal text' },
        ],
        hasNoTimeout: true,
      });

      ToastService.showToast(options);

      expect(mockShowToast).toHaveBeenCalledWith(options);
    });
  });

  describe('closeToast', () => {
    it('calls closeToast on the toast ref', () => {
      ToastService.toastRef = mockToastRef;

      ToastService.closeToast();

      expect(mockCloseToast).toHaveBeenCalledTimes(1);
    });

    it('throws error when toastRef is null', () => {
      expect(() => ToastService.closeToast()).toThrow(
        'Toast reference is not available: closeToast',
      );
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Toast reference is not available: closeToast'),
      );
      expect(mockCloseToast).not.toHaveBeenCalled();
    });

    it('throws error when toastRef.current is null', () => {
      ToastService.toastRef = { current: null };

      expect(() => ToastService.closeToast()).toThrow(
        'Toast reference is not available: closeToast',
      );
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('Toast reference is not available: closeToast'),
      );
    });
  });

  describe('resetForTesting', () => {
    it('resets toastRef to null', () => {
      ToastService.toastRef = mockToastRef;

      ToastService.resetForTesting();

      expect(ToastService.toastRef).toBeNull();
    });
  });
});
