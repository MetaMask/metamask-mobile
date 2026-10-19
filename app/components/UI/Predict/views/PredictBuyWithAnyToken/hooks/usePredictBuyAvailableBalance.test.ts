import { renderHook } from '@testing-library/react-native';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';

let mockIsPredictBalanceSelected = true;
let mockBalance = 100;
let mockIsBalanceLoading = false;
let mockPayToken: { balanceUsd?: number } | null = null;
let mockIsMoneyAccountSelected = false;
let mockResolvedPayBalanceUsd = 0;

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useIsMoneyAccountPaymentOverride',
  () => ({
    useIsMoneyAccountPaymentOverride: () => mockIsMoneyAccountSelected,
  }),
);

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayBalance',
  () => ({
    useMoneyAccountPayBalance: () => ({
      balanceUsd: mockResolvedPayBalanceUsd,
      balanceRaw: '0',
    }),
  }),
);

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockBalance,
    isLoading: mockIsBalanceLoading,
  }),
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({
      payToken: mockPayToken,
    }),
  }),
);

describe('usePredictBuyAvailableBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = true;
    mockBalance = 100;
    mockIsBalanceLoading = false;
    mockPayToken = null;
    mockIsMoneyAccountSelected = false;
    mockResolvedPayBalanceUsd = 0;
  });

  describe('availableBalance', () => {
    it('returns Predict balance when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;
      mockBalance = 250.5;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(250.5);
      expect(result.current.isPredictBalanceSelected).toBe(true);
    });

    it('returns only the payToken balanceUsd when isPredictBalanceSelected is false', () => {
      // When an ERC20 is selected, only that token's own balance is shown —
      // Predict balance is not combined because payment exclusively uses the ERC20.
      mockIsPredictBalanceSelected = false;
      mockBalance = 100;
      mockPayToken = { balanceUsd: 150.75 };

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(150.75);
      expect(result.current.isPredictBalanceSelected).toBe(false);
    });

    it('returns 0 when payToken has no balanceUsd and isPredictBalanceSelected is false', () => {
      // If the ERC20 token has no USD balance information, available balance is 0.
      mockIsPredictBalanceSelected = false;
      mockBalance = 100;
      mockPayToken = {};

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(0);
    });

    it('falls back to Predict balance when payToken is null', () => {
      mockIsPredictBalanceSelected = false;
      mockPayToken = null;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(100);
    });

    it('returns the Money Account redeemable balance instead of the EOA pay token balance', () => {
      // Money Account pays with mUSD on Monad, so the pay token snapshot
      // reports the (possibly empty) wallet balance rather than the
      // redeemable funds the order can actually draw on.
      mockIsPredictBalanceSelected = false;
      mockIsMoneyAccountSelected = true;
      mockPayToken = { balanceUsd: 0 };
      mockResolvedPayBalanceUsd = 7.56;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.availableBalance).toBe(7.56);
    });
  });

  describe('isBalanceLoading', () => {
    it('returns isBalanceLoading from usePredictBalance', () => {
      mockIsBalanceLoading = true;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.isBalanceLoading).toBe(true);
    });

    it('returns false when balance is not loading', () => {
      mockIsBalanceLoading = false;

      const { result } = renderHook(() => usePredictBuyAvailableBalance());

      expect(result.current.isBalanceLoading).toBe(false);
    });
  });
});
