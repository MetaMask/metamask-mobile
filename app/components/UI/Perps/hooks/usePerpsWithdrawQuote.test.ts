import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { usePerpsWithdrawQuote } from './usePerpsWithdrawQuote';
import type { RootState } from '../../../../reducers';
import {
  HYPERLIQUID_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
  WITHDRAWAL_ESTIMATED_TIME,
} from '../constants/hyperLiquidConfig';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: { minAmount?: number }) => {
    if (key === 'perps.withdrawal.amount_too_low' && params?.minAmount) {
      return `Amount must be greater than $${params.minAmount} to cover fees`;
    }
    return key;
  }),
}));

describe('usePerpsWithdrawQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('quote calculations', () => {
    it('should calculate correct fees and receiving amount', () => {
      const amount = '100';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData).toEqual({
        networkFee: '$1.00',
        metamaskFee: METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
        totalFees: '$1.00',
        estimatedTime: WITHDRAWAL_ESTIMATED_TIME,
        receivingAmount: '99.00 USDC',
      });
    });

    it('should handle zero amount', () => {
      const amount = '0';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData).toEqual({
        networkFee: '$1.00',
        metamaskFee: '$0.00',
        totalFees: '$1.00',
        estimatedTime: '5 minutes',
        receivingAmount: '0.00 USDC',
      });
      expect(result.current.hasValidQuote).toBe(false);
    });

    it('should handle empty amount', () => {
      const amount = '';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.hasValidQuote).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle amount less than withdrawal fee', () => {
      const amount = '0.5';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.hasValidQuote).toBe(false);
      expect(result.current.error).toBe(
        `Amount must be greater than $${
          HYPERLIQUID_WITHDRAWAL_FEE + 0.01
        } to cover fees`,
      );
    });

    it('should handle amount equal to withdrawal fee', () => {
      const amount = '1';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.00 USDC',
      );
      expect(result.current.hasValidQuote).toBe(false);
      expect(result.current.error).toBe(
        `Amount must be greater than $${
          HYPERLIQUID_WITHDRAWAL_FEE + 0.01
        } to cover fees`,
      );
    });

    it('should handle decimal amounts correctly', () => {
      const amount = '123.456789';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      const expectedReceiving = parseFloat(amount) - HYPERLIQUID_WITHDRAWAL_FEE;
      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        `${expectedReceiving.toFixed(2)} USDC`,
      );
      expect(result.current.hasValidQuote).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle very large amounts', () => {
      const amount = '1000000';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      const expectedReceiving = parseFloat(amount) - HYPERLIQUID_WITHDRAWAL_FEE;
      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        `${expectedReceiving.toFixed(2)} USDC`,
      );
      expect(result.current.hasValidQuote).toBe(true);
    });

    it('should handle invalid numeric strings', () => {
      const amount = 'abc';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      // NaN - totalFees = NaN - 1 = NaN, Math.max(0, NaN) = NaN
      // toFixed on NaN returns "NaN"
      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        'NaN USDC',
      );
      expect(result.current.hasValidQuote).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('validation logic', () => {
    it('should validate amounts greater than fee', () => {
      const amount = '2';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.hasValidQuote).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should invalidate amounts less than or equal to fee', () => {
      const testCases = ['0.5', '1', '1.00'];

      testCases.forEach((amount) => {
        const { result } = renderHookWithProvider(
          () => usePerpsWithdrawQuote({ amount }),
          { state: {} as DeepPartial<RootState> },
        );

        expect(result.current.hasValidQuote).toBe(false);
        expect(result.current.error).toBe(
          `Amount must be greater than $${
            HYPERLIQUID_WITHDRAWAL_FEE + 0.01
          } to cover fees`,
        );
      });
    });
  });

  describe('static return values', () => {
    it('should always return static values for loading states', () => {
      const amount = '100';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isExpired).toBe(false);
      expect(result.current.willRefresh).toBe(false);
      expect(result.current.quoteFetchError).toBeNull();
    });
  });

  describe('fee consistency', () => {
    it('should use correct fee constants', () => {
      const amount = '100';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.networkFee).toBe(
        `$${HYPERLIQUID_WITHDRAWAL_FEE.toFixed(2)}`,
      );
      expect(result.current.formattedQuoteData.metamaskFee).toBe(
        METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
      );
      expect(result.current.formattedQuoteData.totalFees).toBe(
        `$${(HYPERLIQUID_WITHDRAWAL_FEE + METAMASK_WITHDRAWAL_FEE).toFixed(2)}`,
      );
    });
  });

  describe('memoization', () => {
    it('should memoize quote data for same amount', () => {
      const amount = '100';
      const { result, rerender } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      const firstResult = result.current.formattedQuoteData;

      // Force re-render with same amount
      rerender();

      const secondResult = result.current.formattedQuoteData;

      expect(firstResult).toBe(secondResult);
    });

    it('should recalculate for different amounts', () => {
      let currentAmount = '100';

      const { result, rerender } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount: currentAmount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '99.00 USDC',
      );

      // Update amount
      currentAmount = '200';
      rerender();

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '199.00 USDC',
      );
    });
  });
});
