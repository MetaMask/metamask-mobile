import { renderHook } from '@testing-library/react-native';
import { usePredictDefaultPaymentToken } from './usePredictDefaultPaymentToken';
import { ActiveOrderState } from '../../../types';

let mockPredictBalance: number | undefined = 100;
let mockIsBalanceLoading = false;
const mockOnPaymentTokenChange = jest.fn();
const mockResetSelectedPaymentToken = jest.fn();
let mockActiveOrder: { state: ActiveOrderState } | undefined = {
  state: ActiveOrderState.PREVIEW,
};
let mockTokens: {
  address?: string;
  chainId?: string;
  symbol: string;
  fiat?: { balance?: number };
}[] = [];

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockPredictBalance,
    isLoading: mockIsBalanceLoading,
  }),
}));

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    onPaymentTokenChange: mockOnPaymentTokenChange,
    resetSelectedPaymentToken: mockResetSelectedPaymentToken,
  }),
}));

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/send/useAccountTokens',
  () => ({
    useAccountTokens: () => mockTokens,
  }),
);

jest.mock('../../../constants/transactions', () => ({
  MINIMUM_BET: 1,
}));

describe('usePredictDefaultPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredictBalance = 100;
    mockIsBalanceLoading = false;
    mockActiveOrder = { state: ActiveOrderState.PREVIEW };
    mockTokens = [];
  });

  it('resets to predict balance when balance >= MINIMUM_BET', () => {
    mockPredictBalance = 5;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('resets to predict balance when balance equals MINIMUM_BET', () => {
    mockPredictBalance = 1;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('does not auto-select when predict balance equals MINIMUM_BET', () => {
    mockPredictBalance = 1;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('auto-selects token with highest fiat balance when predict balance < MINIMUM_BET', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 500 },
      },
      { address: '0x2', chainId: '0x1', symbol: 'ETH', fiat: { balance: 200 } },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1',
        symbol: 'USDC',
        fiat: { balance: 500 },
      }),
    );
  });

  it('auto-selects when predict balance is zero', () => {
    mockPredictBalance = 0;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'WETH',
        fiat: { balance: 300 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0x1', symbol: 'WETH' }),
    );
  });

  it('auto-selects when predict balance is undefined', () => {
    mockPredictBalance = undefined;
    mockTokens = [
      { address: '0x1', chainId: '0x1', symbol: 'USDC', fiat: { balance: 50 } },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).toHaveBeenCalledTimes(1);
  });

  it('does not auto-select when balance is still loading', () => {
    mockIsBalanceLoading = true;
    mockPredictBalance = 0;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('does not auto-select when active order is not in PREVIEW state', () => {
    mockPredictBalance = 0.5;
    mockActiveOrder = { state: ActiveOrderState.DEPOSITING };
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('does not auto-select when active order does not exist yet', () => {
    mockPredictBalance = 0.5;
    mockActiveOrder = undefined;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('falls back to predict balance when tokens array is empty', () => {
    mockPredictBalance = 0.5;
    mockTokens = [];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
  });

  it('falls back to predict balance when no tokens have positive fiat balance', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      { address: '0x1', chainId: '0x1', symbol: 'USDC', fiat: { balance: 0 } },
      { address: '0x2', chainId: '0x1', symbol: 'ETH' },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
  });

  it('skips tokens with undefined fiat balance', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'UNKNOWN',
        fiat: { balance: undefined },
      },
      { address: '0x2', chainId: '0x1', symbol: 'USDC', fiat: { balance: 50 } },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0x2', symbol: 'USDC' }),
    );
  });

  it('skips tokens without an address or chainId when auto-selecting', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      {
        address: '0x1',
        chainId: undefined,
        symbol: 'BROKEN',
        fiat: { balance: 500 },
      },
      {
        address: '0x2',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 200 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x2',
        chainId: '0x1',
        symbol: 'USDC',
      }),
    );
  });

  it('falls back to predict balance when only invalid tokens have balance', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      {
        address: '0x1',
        chainId: undefined,
        symbol: 'BROKEN',
        fiat: { balance: 500 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
  });

  it('runs only once across re-renders', () => {
    mockPredictBalance = 0.5;
    mockTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    const { rerender } = renderHook(() => usePredictDefaultPaymentToken());
    rerender({});
    rerender({});

    expect(mockOnPaymentTokenChange).toHaveBeenCalledTimes(1);
  });
});
