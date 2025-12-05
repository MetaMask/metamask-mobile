import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useHasSufficientGas } from './index';
import { useLatestBalance } from '../useLatestBalance';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { BigNumber } from 'ethers';

// Mock dependencies
jest.mock('../useLatestBalance');

describe('useHasSufficientGas', () => {
  const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
    typeof useLatestBalance
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when gas is included in the quote', () => {
    it('returns true when gasIncluded is true', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: true,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          effective: { amount: '0.001' },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: mockQuote }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when gasIncluded7702 is true', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: true,
          srcChainId: '0x1',
        },
        gasFee: {
          effective: { amount: '0.001' },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: mockQuote }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when both gasIncluded and gasIncluded7702 are true', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: true,
          gasIncluded7702: true,
          srcChainId: '0x1',
        },
        gasFee: {
          effective: { amount: '0.001' },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: mockQuote }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('when gas is not included in the quote', () => {
    describe('for EVM chains', () => {
      it('should return true when user has sufficient gas balance', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: { amount: '0.001' }, // 0.001 ETH
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        // User has 0.01 ETH
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: BigNumber.from('10000000000000000'), // 0.01 ETH in wei
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
      });

      it('should return false when user has insufficient gas balance', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: { amount: '0.01' }, // 0.01 ETH
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        // User has 0.001 ETH
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000000000000'), // 0.001 ETH in wei
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(false);
      });

      it('should handle scientific notation in effective gas fee', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: { amount: '9.200359292e-8' }, // Scientific notation
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        // User has 0.001 ETH (more than enough for the tiny gas fee)
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000000000000'), // 0.001 ETH in wei
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        // Should return true since 0.001 ETH > 0.00000009200359292 ETH
        expect(result.current).toBe(true);
      });

      it('should return null when gas token balance is not available', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: { amount: '0.001' },
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        mockUseLatestBalance.mockReturnValue(undefined);

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(null);
      });

      it('should return null when gas fee amount is not available', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: undefined,
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: BigNumber.from('10000000000000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(null);
      });

      it('should return null when gas token balance atomicBalance is not available', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: '0x1',
            },
            gasFee: {
              effective: { amount: '0.001' },
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: undefined,
        } as unknown as ReturnType<typeof useLatestBalance>);

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(null);
      });
    });

    describe('for Solana', () => {
      it('should return true when user has sufficient SOL balance', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            },
            gasFee: {
              effective: { amount: '0.001' }, // 0.001 SOL
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        // User has 0.01 SOL
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: BigNumber.from('10000000'), // 0.01 SOL in lamports
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
      });

      it('should return false when user has insufficient SOL balance', () => {
        const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] =
          {
            quote: {
              gasIncluded: false,
              gasIncluded7702: false,
              srcChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            },
            gasFee: {
              effective: { amount: '0.01' }, // 0.01 SOL
            },
          } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

        // User has 0.001 SOL
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000'), // 0.001 SOL in lamports
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(false);
      });
    });
  });

  describe('when quote is undefined', () => {
    it('should return null when quote is undefined', () => {
      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: undefined }),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });
  });
});
