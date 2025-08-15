import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { ToastContext } from '../../../../component-library/components/Toast';
import { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';
import { usePerpsTrading } from './usePerpsTrading';

// Mock dependencies
jest.mock('./usePerpsTrading');
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
    Danger: 'Danger',
    Error: 'Error',
  },
  IconColor: {
    Success: 'Success',
    Error: 'Error',
  },
}));
jest.mock('../../../../component-library/components/Buttons/Button', () => ({
  ButtonVariants: {
    Secondary: 'secondary',
  },
}));

describe('usePerpsTPSLUpdate', () => {
  const mockUpdatePositionTPSL = jest.fn();
  const mockShowToast = jest.fn();
  const mockToastContext = {
    toastRef: {
      current: {
        showToast: mockShowToast,
        closeToast: jest.fn(),
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
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      updatePositionTPSL: mockUpdatePositionTPSL,
    });
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

    mockUpdatePositionTPSL.mockResolvedValue(undefined);

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

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: 'icon',
      labelOptions: [
        {
          label: 'perps.position.tpsl.update_success',
          isBold: true,
        },
        { label: ' - ', isBold: false },
        {
          label: 'ETH',
          isBold: true,
        },
      ],
      iconName: 'CheckBold',
      iconColor: 'Success',
      hasNoTimeout: false,
    });
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

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: 'icon',
      labelOptions: [
        {
          label: 'perps.position.tpsl.update_failed',
          isBold: true,
        },
        { label: ': ', isBold: false },
        {
          label: 'Network error',
          isBold: false,
        },
      ],
      iconName: 'Error',
      iconColor: 'Error',
      hasNoTimeout: true,
      closeButtonOptions: {
        label: 'perps.order.error.dismiss',
        variant: 'secondary',
        onPress: expect.any(Function),
      },
    });
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

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: 'icon',
      labelOptions: [
        {
          label: 'perps.position.tpsl.update_error',
          isBold: true,
        },
        { label: ': ', isBold: false },
        {
          label: 'Network error',
          isBold: false,
        },
      ],
      iconName: 'Error',
      iconColor: 'Error',
      hasNoTimeout: true,
      closeButtonOptions: {
        label: 'perps.order.error.dismiss',
        variant: 'secondary',
        onPress: expect.any(Function),
      },
    });
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('should handle undefined TP/SL prices', async () => {
    const { result } = renderHookWithToast();
    const position = createMockPosition();

    mockUpdatePositionTPSL.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleUpdateTPSL(position, undefined, undefined);
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      coin: 'ETH',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
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

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: 'icon',
      labelOptions: [
        {
          label: 'perps.position.tpsl.update_failed',
          isBold: true,
        },
        { label: ': ', isBold: false },
        {
          label: 'perps.errors.unknown',
          isBold: false,
        },
      ],
      iconName: 'Error',
      iconColor: 'Error',
      hasNoTimeout: true,
      closeButtonOptions: {
        label: 'perps.order.error.dismiss',
        variant: 'secondary',
        onPress: expect.any(Function),
      },
    });
  });
});
