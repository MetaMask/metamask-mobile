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
} from '../constants/hyperLiquidConfig';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.withdrawal.amount_too_low' && params?.minAmount) {
      return `Amount must be greater than $${params.minAmount} to cover fees`;
    }
    if (key === 'time.minutes_format' && params?.count) {
      return params.count === 1
        ? `${params.count} minute`
        : `${params.count} minutes`;
    }
    return key;
  }),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getWithdrawalRoutes: jest.fn().mockReturnValue([
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
          chainId: 'eip155:42161',
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
          constraints: {
            minAmount: '1.01',
            estimatedTime: '5 minutes',
            fees: {
              fixed: 1,
              token: 'USDC',
            },
          },
        },
      ]),
      state: {
        isTestnet: false,
      },
    },
  },
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
        estimatedTime: '5 minutes',
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
        `Amount must be greater than $1.01 to cover fees`,
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
        `Amount must be greater than $1.01 to cover fees`,
      );
    });

    it('should handle amount just above minimum', () => {
      const amount = '1.01';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '0.01 USDC',
      );
      expect(result.current.hasValidQuote).toBe(true);
      expect(result.current.error).toBeNull();
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
      const testCases = ['abc', '123abc', 'abc123', '!@#', ''];

      testCases.forEach((amount) => {
        const { result } = renderHookWithProvider(
          () => usePerpsWithdrawQuote({ amount }),
          { state: {} as DeepPartial<RootState> },
        );

        // Invalid input should result in 0.00 USDC, not NaN USDC
        expect(result.current.formattedQuoteData.receivingAmount).toBe(
          '0.00 USDC',
        );
        expect(result.current.hasValidQuote).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle special numeric values', () => {
      const testCases = ['Infinity', '-Infinity', 'NaN'];

      testCases.forEach((amount) => {
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

  describe('dynamic fees', () => {
    it('should use fees from provider', () => {
      const amount = '100';
      const { result } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount }),
        { state: {} as DeepPartial<RootState> },
      );

      // Check that it uses the provider fee of $1.00
      expect(result.current.formattedQuoteData.networkFee).toBe('$1.00');
      expect(result.current.formattedQuoteData.totalFees).toBe('$1.00');
      expect(result.current.formattedQuoteData.receivingAmount).toBe(
        '99.00 USDC',
      );
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
      rerender({ amount: '100' });

      const secondResult = result.current.formattedQuoteData;

      expect(firstResult).toBe(secondResult);
    });

    it('should recalculate for different amounts', () => {
      // First render with amount 100
      const { result: result1 } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount: '100' }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result1.current.formattedQuoteData.receivingAmount).toBe(
        '99.00 USDC',
      );

      // Second render with amount 200
      const { result: result2 } = renderHookWithProvider(
        () => usePerpsWithdrawQuote({ amount: '200' }),
        { state: {} as DeepPartial<RootState> },
      );

      expect(result2.current.formattedQuoteData.receivingAmount).toBe(
        '199.00 USDC',
      );
    });
  });
});
