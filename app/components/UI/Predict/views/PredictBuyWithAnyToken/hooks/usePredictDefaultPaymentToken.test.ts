import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Hex } from 'viem';
import { usePredictDefaultPaymentToken } from './usePredictDefaultPaymentToken';
import { ActiveOrderState } from '../../../types';
import { getBestToken } from '../../../../../Views/confirmations/utils/getBestToken';

let mockPredictBalance: number | undefined = 100;
let mockIsBalanceLoading = false;
const mockOnPaymentTokenChange = jest.fn();
const mockResetSelectedPaymentToken = jest.fn();
let mockActiveOrder: { state: ActiveOrderState } | undefined = {
  state: ActiveOrderState.PREVIEW,
};
let mockAvailableTokens: {
  address?: string;
  chainId?: string;
  symbol?: string;
  disabled?: boolean;
  fiat?: { balance?: number };
}[] = [];
let mockIsHardwareAccount = false;

const mockPayTokensFlags = {
  preferredTokens: { default: [], overrides: {} },
  blockedTokens: {
    default: { chainIds: [] as string[], tokens: [] },
    overrides: {},
  },
  minimumRequiredTokenBalance: 0,
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

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
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayAvailableTokens',
  () => ({
    useTransactionPayAvailableTokens: () => ({
      availableTokens: mockAvailableTokens,
    }),
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => ({
      txParams: { from: '0xabc123' },
      type: 'predictDepositAndOrder',
    }),
  }),
);

jest.mock('../../../../../Views/confirmations/utils/getBestToken', () => ({
  getBestToken: jest.fn(),
}));

jest.mock(
  '../../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayTokensFlags: jest.fn(),
    getPreferredTokensForTransactionType: jest.fn(() => []),
  }),
);

jest.mock('../../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => mockIsHardwareAccount),
}));

jest.mock('../../../constants/transactions', () => ({
  MINIMUM_PREDICT_BALANCE_FOR_BET: 1.05,
}));

jest.mock('../../../../../Views/confirmations/utils/transaction', () => ({
  getPostQuoteTransactionType: jest.fn(() => undefined),
}));

const mockGetBestToken = jest.mocked(getBestToken);

describe('usePredictDefaultPaymentToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBestToken.mockReset();
    mockPredictBalance = 100;
    mockIsBalanceLoading = false;
    mockActiveOrder = { state: ActiveOrderState.PREVIEW };
    mockAvailableTokens = [];
    mockIsHardwareAccount = false;
    (useSelector as jest.Mock).mockReturnValue(mockPayTokensFlags);
  });

  it('resets to Predict balance when balance >= MINIMUM_PREDICT_BALANCE_FOR_BET', () => {
    mockPredictBalance = 5;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockGetBestToken).not.toHaveBeenCalled();
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('resets to Predict balance when balance equals MINIMUM_PREDICT_BALANCE_FOR_BET', () => {
    mockPredictBalance = 1.05;
    mockAvailableTokens = [
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

  it('resets to Predict balance when hardware wallet regardless of balance', () => {
    mockIsHardwareAccount = true;
    mockPredictBalance = 0;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockGetBestToken).not.toHaveBeenCalled();
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('calls getBestToken and selects returned token when predict balance < threshold', () => {
    mockPredictBalance = 0.5;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];
    mockGetBestToken.mockReturnValue({
      address: '0x1' as Hex,
      chainId: '0x1' as Hex,
    });

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
      }),
    );
  });

  it('resets to Predict balance when getBestToken returns undefined', () => {
    mockPredictBalance = 0.5;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });

  it('does not run when balance is still loading', () => {
    mockIsBalanceLoading = true;
    mockPredictBalance = 0;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
  });

  it('does not run when active order is not in PREVIEW state', () => {
    mockPredictBalance = 0.5;
    mockActiveOrder = { state: ActiveOrderState.DEPOSITING };
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
  });

  it('does not run when active order does not exist yet', () => {
    mockPredictBalance = 0.5;
    mockActiveOrder = undefined;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
    expect(mockResetSelectedPaymentToken).not.toHaveBeenCalled();
  });

  it('runs only once across re-renders', () => {
    mockPredictBalance = 0.5;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];
    mockGetBestToken.mockReturnValue({
      address: '0x1' as Hex,
      chainId: '0x1' as Hex,
    });

    const { rerender } = renderHook(() => usePredictDefaultPaymentToken());
    rerender({});
    rerender({});

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
  });

  it('auto-selects when predict balance is zero', () => {
    mockPredictBalance = 0;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'WETH',
        fiat: { balance: 300 },
      },
    ];
    mockGetBestToken.mockReturnValue({
      address: '0x1' as Hex,
      chainId: '0x1' as Hex,
    });

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0x1', symbol: 'WETH' }),
    );
  });

  it('auto-selects when predict balance is undefined', () => {
    mockPredictBalance = undefined;
    mockAvailableTokens = [
      { address: '0x1', chainId: '0x1', symbol: 'USDC', fiat: { balance: 50 } },
    ];
    mockGetBestToken.mockReturnValue({
      address: '0x1' as Hex,
      chainId: '0x1' as Hex,
    });

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).toHaveBeenCalledTimes(1);
  });

  it('resets to Predict balance when getBestToken returns token not in available list', () => {
    mockPredictBalance = 0.5;
    mockAvailableTokens = [
      {
        address: '0x1',
        chainId: '0x1',
        symbol: 'USDC',
        fiat: { balance: 100 },
      },
    ];
    mockGetBestToken.mockReturnValue({
      address: '0xNOTFOUND' as Hex,
      chainId: '0x1' as Hex,
    });

    renderHook(() => usePredictDefaultPaymentToken());

    expect(mockGetBestToken).toHaveBeenCalledTimes(1);
    expect(mockResetSelectedPaymentToken).toHaveBeenCalledTimes(1);
    expect(mockOnPaymentTokenChange).not.toHaveBeenCalled();
  });
});
