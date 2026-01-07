import { renderHook, act } from '@testing-library/react-native';
import { usePerpsMarginAdjustment } from './usePerpsMarginAdjustment';

const mockUpdateMargin = jest.fn();
const mockShowToast = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    updateMargin: mockUpdateMargin,
  }),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      positionManagement: {
        margin: {
          addSuccess: jest.fn((symbol, amount) => ({
            type: 'add_success',
            symbol,
            amount,
          })),
          removeSuccess: jest.fn((symbol, amount) => ({
            type: 'remove_success',
            symbol,
            amount,
          })),
          adjustmentFailed: jest.fn((error) => ({
            type: 'error',
            error,
          })),
        },
      },
    },
  }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: (error: Error, context: unknown) =>
    mockCaptureException(error, context),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../utils/marketUtils', () => ({
  getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
}));

describe('usePerpsMarginAdjustment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns handleAddMargin, handleRemoveMargin functions and isAdjusting state', () => {
    const { result } = renderHook(() => usePerpsMarginAdjustment());

    expect(result.current.handleAddMargin).toBeDefined();
    expect(typeof result.current.handleAddMargin).toBe('function');
    expect(result.current.handleRemoveMargin).toBeDefined();
    expect(typeof result.current.handleRemoveMargin).toBe('function');
    expect(result.current.isAdjusting).toBe(false);
  });

  describe('handleAddMargin', () => {
    it('sets isAdjusting to true while adding margin', async () => {
      let resolveMargin: (value: { success: boolean }) => void;
      mockUpdateMargin.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMargin = resolve;
          }),
      );

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      // Start the margin operation
      act(() => {
        result.current.handleAddMargin('ETH', 100);
      });

      // Check that isAdjusting is true during the operation
      expect(result.current.isAdjusting).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveMargin({ success: true });
      });

      // Check that isAdjusting is false after completion
      expect(result.current.isAdjusting).toBe(false);
    });

    it('calls updateMargin with positive amount for add', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(mockUpdateMargin).toHaveBeenCalledWith({
        coin: 'ETH',
        amount: '100',
      });
    });

    it('shows success toast on successful add margin', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onSuccess: mockOnSuccess }),
      );

      await act(async () => {
        await result.current.handleAddMargin('BTC', 50);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add_success',
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('shows error toast on failed add margin', async () => {
      mockUpdateMargin.mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      });
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleAddMargin('ETH', 1000);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );
      expect(mockOnError).toHaveBeenCalledWith('Insufficient funds');
    });
  });

  describe('handleRemoveMargin', () => {
    it('calls updateMargin with negative amount for remove', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 100);
      });

      expect(mockUpdateMargin).toHaveBeenCalledWith({
        coin: 'ETH',
        amount: '-100',
      });
    });

    it('shows success toast on successful remove margin', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onSuccess: mockOnSuccess }),
      );

      await act(async () => {
        await result.current.handleRemoveMargin('BTC', 25);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'remove_success',
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('shows error toast on failed remove margin', async () => {
      mockUpdateMargin.mockResolvedValue({
        success: false,
        error: 'Cannot reduce below minimum',
      });
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 500);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );
      expect(mockOnError).toHaveBeenCalledWith('Cannot reduce below minimum');
    });
  });

  describe('error handling', () => {
    it('shows default error message when no error provided', async () => {
      mockUpdateMargin.mockResolvedValue({ success: false });
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(mockOnError).toHaveBeenCalledWith('perps.errors.unknown');
    });

    it('handles exceptions and captures to Sentry', async () => {
      const testError = new Error('Network error');
      mockUpdateMargin.mockRejectedValue(testError);
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'usePerpsMarginAdjustment',
            action: 'margin_add',
          }),
          extra: expect.objectContaining({
            marginContext: expect.objectContaining({
              coin: 'ETH',
              amount: 100,
              action: 'add',
            }),
          }),
        }),
      );
      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });

    it('captures remove action in Sentry context', async () => {
      const testError = new Error('API error');
      mockUpdateMargin.mockRejectedValue(testError);

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('BTC', 50);
      });

      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            action: 'margin_remove',
          }),
          extra: expect.objectContaining({
            marginContext: expect.objectContaining({
              action: 'remove',
              adjustmentAmount: -50,
            }),
          }),
        }),
      );
    });

    it('handles non-Error exceptions', async () => {
      mockUpdateMargin.mockRejectedValue('String error');
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.anything(),
      );
      expect(mockOnError).toHaveBeenCalledWith('perps.errors.unknown');
    });
  });

  describe('state management', () => {
    it('resets isAdjusting to false after successful operation', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('resets isAdjusting to false after failed operation', async () => {
      mockUpdateMargin.mockResolvedValue({ success: false, error: 'Failed' });

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('resets isAdjusting to false after exception', async () => {
      mockUpdateMargin.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(result.current.isAdjusting).toBe(false);
    });

    it('works without options provided', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(mockUpdateMargin).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });
  });
});
