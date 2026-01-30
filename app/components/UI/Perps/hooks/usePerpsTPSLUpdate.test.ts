import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ToastContext } from '../../../../component-library/components/Toast';
import { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsStream } from '../providers/PerpsStreamManager';

jest.mock('./usePerpsTrading');
jest.mock('./usePerpsToasts');
jest.mock('../providers/PerpsStreamManager');
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));
jest.mock('../../../../component-library/components/Toast', () => ({
  ToastContext: jest.requireActual('react').createContext(null),
  ToastVariants: {
    Icon: 'icon',
  },
}));
jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    CheckBold: 'CheckBold',
    Warning: 'Warning',
    Loading: 'Loading',
  },
}));
jest.mock('../../../../component-library/components/Buttons/Button', () => ({
  ButtonVariants: {
    Secondary: 'secondary',
  },
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

describe('usePerpsTPSLUpdate', () => {
  const mockUpdatePositionTPSL = jest.fn();
  const mockShowToast = jest.fn();
  const mockUpdatePositionTPSLOptimistic = jest.fn();
  const mockToastContext = {
    toastRef: {
      current: {
        showToast: mockShowToast,
        closeToast: jest.fn(),
      },
    },
  };

  const mockStream = {
    positions: {
      updatePositionTPSLOptimistic: mockUpdatePositionTPSLOptimistic,
    },
  };

  const mockPerpsToastOptions = {
    positionManagement: {
      tpsl: {
        updateTPSLSuccess: {
          variant: 'icon',
          iconName: 'CheckBold',
          iconColor: 'mockSuccessColor',
          backgroundColor: 'mockSuccessBackground',
          hapticsType: 'success',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'perps.position.tpsl.update_success',
              isBold: true,
            },
          ],
        },
        updateTPSLError: jest.fn((error?: string | null) => ({
          variant: 'icon',
          iconName: 'Warning',
          iconColor: 'mockErrorColor',
          backgroundColor: 'mockErrorBackground',
          hapticsType: 'error',
          hasNoTimeout: false,
          labelOptions: [
            {
              label: 'perps.position.tpsl.update_failed',
              isBold: true,
            },
            {
              label: '\n',
              isBold: false,
            },
            {
              label: error || 'perps.errors.unknown',
              isBold: false,
            },
          ],
        })),
      },
    },
  };

  const createMockPosition = (overrides = {}) => ({
    coin: 'ETH',
    size: '1.5',
    entryPrice: '3000',
    positionValue: '4500',
    unrealizedPnl: '100',
    marginUsed: '450',
    leverage: {
      type: 'cross' as const,
      value: 10,
    },
    liquidationPrice: '2700',
    maxLeverage: 50,
    returnOnEquity: '0.22',
    cumulativeFunding: {
      allTime: '5',
      sinceOpen: '2',
      sinceChange: '1',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      updatePositionTPSL: mockUpdatePositionTPSL,
    });

    (usePerpsToasts as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: mockPerpsToastOptions,
    });

    (usePerpsStream as jest.Mock).mockReturnValue(mockStream);
  });

  const renderHookWithToast = (options = {}) => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        ToastContext.Provider,
        { value: mockToastContext },
        children,
      );
    return renderHook(() => usePerpsTPSLUpdate(options), { wrapper });
  };

  it('should call updatePositionTPSL with correct parameters', async () => {
    const { result } = renderHookWithToast();
    const position = createMockPosition();
    const takeProfitPrice = '3300';
    const stopLossPrice = '2700';

    mockUpdatePositionTPSL.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleUpdateTPSL(
        position,
        takeProfitPrice,
        stopLossPrice,
      );
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      coin: 'ETH',
      takeProfitPrice,
      stopLossPrice,
      trackingData: undefined,
      position,
    });
  });

  it('should show success toast and call onSuccess callback', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHookWithToast({ onSuccess });
    const position = createMockPosition();

    mockUpdatePositionTPSL.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleUpdateTPSL(position, '3300', '2700');
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLSuccess,
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show error toast on API failure response', async () => {
    const onError = jest.fn();
    const { result } = renderHookWithToast({ onError });
    const position = createMockPosition();

    mockUpdatePositionTPSL.mockResolvedValue({
      success: false,
      error: 'Network error',
    });

    await act(async () => {
      await result.current.handleUpdateTPSL(position, '3300', '2700');
    });

    expect(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError,
    ).toHaveBeenCalledWith('Network error');
    expect(mockShowToast).toHaveBeenCalledWith(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError(
        'Network error',
      ),
    );
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('should show error toast and call onError callback on exception', async () => {
    const onError = jest.fn();
    const { result } = renderHookWithToast({ onError });
    const position = createMockPosition();
    const error = new Error('Network error');

    mockUpdatePositionTPSL.mockRejectedValue(error);

    await act(async () => {
      await result.current.handleUpdateTPSL(position, '3300', '2700');
    });

    expect(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError,
    ).toHaveBeenCalledWith('Network error');
    expect(mockShowToast).toHaveBeenCalledWith(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError(
        'Network error',
      ),
    );
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('should handle undefined TP/SL prices', async () => {
    const { result } = renderHookWithToast();
    const position = createMockPosition();

    mockUpdatePositionTPSL.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleUpdateTPSL(position, undefined, undefined);
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      coin: 'ETH',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      trackingData: undefined,
      position,
    });
  });

  it('should handle error without message', async () => {
    const { result } = renderHookWithToast();
    const position = createMockPosition();

    mockUpdatePositionTPSL.mockResolvedValue({
      success: false,
      error: null,
    });

    await act(async () => {
      await result.current.handleUpdateTPSL(position, '3300', '2700');
    });

    // When error is null, the mock falls back to 'perps.errors.unknown'
    expect(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError,
    ).toHaveBeenCalledWith('perps.errors.unknown');
    expect(mockShowToast).toHaveBeenCalledWith(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError(
        'perps.errors.unknown',
      ),
    );
  });

  it('uses toast configurations with correct haptics types', () => {
    // Verify success toast has correct haptics type
    expect(
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLSuccess
        .hapticsType,
    ).toBe('success');

    // Verify error toast has correct haptics type
    const errorToast =
      mockPerpsToastOptions.positionManagement.tpsl.updateTPSLError(
        'test error',
      );
    expect(errorToast.hapticsType).toBe('error');
  });

  describe('optimistic updates', () => {
    it('applies optimistic update to position cache on successful API response', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition();
      const takeProfitPrice = '3300';
      const stopLossPrice = '2700';

      mockUpdatePositionTPSL.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleUpdateTPSL(
          position,
          takeProfitPrice,
          stopLossPrice,
        );
      });

      expect(mockUpdatePositionTPSLOptimistic).toHaveBeenCalledWith(
        'ETH',
        takeProfitPrice,
        stopLossPrice,
      );
    });

    it('applies optimistic update with undefined take profit price', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition();
      const stopLossPrice = '2700';

      mockUpdatePositionTPSL.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleUpdateTPSL(
          position,
          undefined,
          stopLossPrice,
        );
      });

      expect(mockUpdatePositionTPSLOptimistic).toHaveBeenCalledWith(
        'ETH',
        undefined,
        stopLossPrice,
      );
    });

    it('applies optimistic update with undefined stop loss price', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition();
      const takeProfitPrice = '3300';

      mockUpdatePositionTPSL.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleUpdateTPSL(
          position,
          takeProfitPrice,
          undefined,
        );
      });

      expect(mockUpdatePositionTPSLOptimistic).toHaveBeenCalledWith(
        'ETH',
        takeProfitPrice,
        undefined,
      );
    });

    it('applies optimistic update with both TP/SL undefined (removing both)', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition({
        takeProfitPrice: '3500',
        stopLossPrice: '2500',
      });

      mockUpdatePositionTPSL.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleUpdateTPSL(position, undefined, undefined);
      });

      expect(mockUpdatePositionTPSLOptimistic).toHaveBeenCalledWith(
        'ETH',
        undefined,
        undefined,
      );
    });

    it('does not apply optimistic update on API failure response', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition();

      mockUpdatePositionTPSL.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      await act(async () => {
        await result.current.handleUpdateTPSL(position, '3300', '2700');
      });

      expect(mockUpdatePositionTPSLOptimistic).not.toHaveBeenCalled();
    });

    it('does not apply optimistic update on exception', async () => {
      const { result } = renderHookWithToast();
      const position = createMockPosition();
      const error = new Error('Network error');

      mockUpdatePositionTPSL.mockRejectedValue(error);

      await act(async () => {
        await result.current.handleUpdateTPSL(position, '3300', '2700');
      });

      expect(mockUpdatePositionTPSLOptimistic).not.toHaveBeenCalled();
    });

    it('applies optimistic update before showing success toast', async () => {
      const callOrder: string[] = [];

      mockUpdatePositionTPSLOptimistic.mockImplementation(() => {
        callOrder.push('optimistic');
      });
      mockShowToast.mockImplementation(() => {
        callOrder.push('toast');
      });

      const { result } = renderHookWithToast();
      const position = createMockPosition();

      mockUpdatePositionTPSL.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.handleUpdateTPSL(position, '3300', '2700');
      });

      expect(callOrder).toEqual(['optimistic', 'toast']);
    });
  });
});
