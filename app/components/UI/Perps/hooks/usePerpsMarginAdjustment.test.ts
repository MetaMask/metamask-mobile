import { renderHook, act } from '@testing-library/react-native';
import Logger from '../../../../util/Logger';
import { usePerpsMarginAdjustment } from './usePerpsMarginAdjustment';

const mockUpdateMargin = jest.fn();
const mockGetPositions = jest.fn();
const mockShowToast = jest.fn();
const mockTrack = jest.fn();

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    updateMargin: mockUpdateMargin,
    getPositions: mockGetPositions,
  }),
}));

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
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
          removeAmountChanged: jest.fn((maxAmount) => ({
            type: 'remove_amount_changed',
            maxAmount,
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

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../utils/translatePerpsError', () => ({
  translatePerpsError: (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : 'perps.errors.unknownError';
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../constants/perpsConfig', () => ({
  MARGIN_REMOVAL_PRICE_MOVE_BUFFER: 0.01,
}));

jest.mock('@metamask/perps-controller', () => ({
  MARGIN_ADJUSTMENT_CONFIG: { MarginRemovalSafetyBuffer: 0.1 },
  PERPS_CONSTANTS: { FeatureName: 'perps' },
  PERPS_EVENT_PROPERTY: {
    ACTION: 'action',
    ASSET: 'asset',
    ERROR_MESSAGE: 'error_message',
    STATUS: 'status',
  },
  PERPS_EVENT_VALUE: {
    STATUS: { FAILED: 'failed', SUCCESS: 'success' },
  },
  getPerpsDisplaySymbol: jest.fn((symbol: string) => symbol),
}));

describe('usePerpsMarginAdjustment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Positions with ample margin so removals are not stopped by re-validation
    mockGetPositions.mockResolvedValue(
      ['ETH', 'BTC'].map((symbol) => ({
        symbol,
        size: '1',
        entryPrice: '1000',
        positionValue: '1000',
        marginUsed: '100000',
        leverage: { type: 'isolated', value: 10 },
      })),
    );
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
        symbol: 'ETH',
        amount: '100',
      });
    });

    it('ignores duplicate submissions while an adjustment is pending', async () => {
      let resolveMargin: (value: { success: boolean }) => void;
      mockUpdateMargin.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMargin = resolve;
          }),
      );

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      act(() => {
        result.current.handleAddMargin('ETH', 100);
        result.current.handleAddMargin('ETH', 100);
      });

      expect(mockUpdateMargin).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveMargin({ success: true });
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
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Perp Margin Adjustment Transaction',
        }),
        {
          action: 'add',
          asset: 'BTC',
          status: 'success',
        },
      );
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
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Perp Margin Adjustment Transaction',
        }),
        {
          action: 'add',
          asset: 'ETH',
          error_message: 'Insufficient funds',
          status: 'failed',
        },
      );
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
        symbol: 'ETH',
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

  describe('handleRemoveMargin re-validation', () => {
    // 10x on $300 notional: required = max($30, 10% = $30) = $30, so the
    // exchange accepts up to $10 and the 1% headroom leaves $7 safe to offer.
    const freshPosition = {
      symbol: 'ETH',
      size: '0.1',
      entryPrice: '3000',
      positionValue: '300',
      marginUsed: '40',
      leverage: { type: 'isolated', value: 10 },
    };

    it('reads a fresh position before submitting a removal', async () => {
      mockGetPositions.mockResolvedValue([freshPosition]);
      mockUpdateMargin.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 5);
      });

      expect(mockGetPositions).toHaveBeenCalledWith({ skipCache: true });
      expect(mockUpdateMargin).toHaveBeenCalledWith({
        symbol: 'ETH',
        amount: '-5',
      });
    });

    it('stops a removal the fresh position no longer covers and reports the new safe max', async () => {
      mockGetPositions.mockResolvedValue([freshPosition]);
      const mockOnAmountChanged = jest.fn();
      const mockOnError = jest.fn();
      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({
          onAmountChanged: mockOnAmountChanged,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 12);
      });

      expect(mockUpdateMargin).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'remove_amount_changed',
        maxAmount: '7.00',
      });
      expect(mockOnAmountChanged).toHaveBeenCalledWith(7);
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockTrack).not.toHaveBeenCalled();
      expect(result.current.isAdjusting).toBe(false);
    });

    it('submits a removal above the safe max that the exchange still accepts', async () => {
      mockGetPositions.mockResolvedValue([freshPosition]);
      mockUpdateMargin.mockResolvedValue({ success: true });
      const mockOnAmountChanged = jest.fn();
      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onAmountChanged: mockOnAmountChanged }),
      );

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 9);
      });

      expect(mockOnAmountChanged).not.toHaveBeenCalled();
      expect(mockUpdateMargin).toHaveBeenCalledWith({
        symbol: 'ETH',
        amount: '-9',
      });
    });

    it('submits the removal when the fresh position read fails', async () => {
      mockGetPositions.mockRejectedValue(new Error('network down'));
      mockUpdateMargin.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 12);
      });

      expect(mockUpdateMargin).toHaveBeenCalledWith({
        symbol: 'ETH',
        amount: '-12',
      });
    });

    it.each([
      ['leverage is missing', { leverage: undefined }],
      ['marginUsed is not a number', { marginUsed: 'NaN' }],
      ['positionValue is zero', { positionValue: '0' }],
    ])(
      'submits the removal when the fresh position is unusable (%s)',
      async (_label, override) => {
        mockGetPositions.mockResolvedValue([{ ...freshPosition, ...override }]);
        mockUpdateMargin.mockResolvedValue({ success: true });
        const { result } = renderHook(() => usePerpsMarginAdjustment());

        await act(async () => {
          await result.current.handleRemoveMargin('ETH', 12);
        });

        expect(mockUpdateMargin).toHaveBeenCalledWith({
          symbol: 'ETH',
          amount: '-12',
        });
      },
    );

    it('submits the removal when the fresh read no longer has the position', async () => {
      // The provider returns [] for a failed fetch too, so a missing position
      // is not proof that it closed.
      mockGetPositions.mockResolvedValue([]);
      mockUpdateMargin.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('ETH', 5);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(1);
      expect(mockUpdateMargin).toHaveBeenCalledWith({
        symbol: 'ETH',
        amount: '-5',
      });
    });

    it('does not read positions when adding margin', async () => {
      mockUpdateMargin.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleAddMargin('ETH', 12);
      });

      expect(mockGetPositions).not.toHaveBeenCalled();
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

      expect(mockOnError).toHaveBeenCalledWith('perps.errors.unknownError');
    });

    it('handles exceptions and logs via Logger.error', async () => {
      const testError = new Error('Network error');
      mockUpdateMargin.mockRejectedValue(testError);
      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        usePerpsMarginAdjustment({ onError: mockOnError }),
      );

      await act(async () => {
        await result.current.handleAddMargin('ETH', 100);
      });

      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'perps',
            component: 'usePerpsMarginAdjustment',
            action: 'margin_add',
            operation: 'position_management',
          }),
          context: expect.objectContaining({
            name: 'usePerpsMarginAdjustment',
            data: expect.objectContaining({
              symbol: 'ETH',
              amount: 100,
              action: 'add',
              adjustmentAmount: 100,
            }),
          }),
        }),
      );
      expect(mockOnError).toHaveBeenCalledWith('Network error');
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Perp Margin Adjustment Transaction',
        }),
        {
          action: 'add',
          asset: 'ETH',
          error_message: 'Network error',
          status: 'failed',
        },
      );
    });

    it('captures remove action in Logger context', async () => {
      const testError = new Error('API error');
      mockUpdateMargin.mockRejectedValue(testError);

      const { result } = renderHook(() => usePerpsMarginAdjustment());

      await act(async () => {
        await result.current.handleRemoveMargin('BTC', 50);
      });

      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'perps',
            action: 'margin_remove',
          }),
          context: expect.objectContaining({
            data: expect.objectContaining({
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

      const [loggedError, loggerContext] = (Logger.error as jest.Mock).mock
        .calls[0];
      expect(loggedError).toBeInstanceOf(Error);
      expect((loggedError as Error).message).toBe('String error');
      expect(loggerContext).toEqual(
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              rawError: 'String error',
            }),
          }),
        }),
      );
      expect(mockOnError).toHaveBeenCalledWith('String error');
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
