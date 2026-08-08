import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useHasSufficientGasEvenIfGasIncludedOrSponsored } from './index';
import { useLatestBalance } from '../useLatestBalance';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { ChainId } from '@metamask/bridge-controller';
import { BigNumber } from 'ethers';

// Mock dependencies
jest.mock('../useLatestBalance');

describe('useHasSufficientGasEvenIfGasIncludedOrSponsored', () => {
  const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
    typeof useLatestBalance
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('for EVM chains', () => {
    it('returns null when quote is undefined', () => {
      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({ quote: undefined }),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });
    it('returns true when user has sufficient gas balance', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: { amount: '0.001' }, // 0.001 ETH
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      // User has 0.01 ETH
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.01',
        atomicBalance: BigNumber.from('10000000000000000'), // 0.01 ETH in wei
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when user has insufficient gas balance', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: { amount: '0.01' }, // 0.01 ETH
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      // User has 0.001 ETH
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('1000000000000000'), // 0.001 ETH in wei
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(false);
    });

    it('handles scientific notation in total gas fee', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: { amount: '9.200359292e-8' }, // Scientific notation
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      // User has 0.001 ETH (more than enough for the tiny gas fee)
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('1000000000000000'), // 0.001 ETH in wei
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      // Should return true since 0.001 ETH > 0.00000009200359292 ETH
      expect(result.current).toBe(true);
    });

    it('returns null when gas token balance is not available', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: { amount: '0.001' },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      mockUseLatestBalance.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });

    it('returns null when gas fee amount is not available', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: undefined,
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.01',
        atomicBalance: BigNumber.from('10000000000000000'),
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });

    it('returns null when gas token balance atomicBalance is not available', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: '0x1',
        },
        gasFee: {
          total: { amount: '0.001' },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.01',
        atomicBalance: undefined,
      } as unknown as ReturnType<typeof useLatestBalance>);

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(null);
    });
  });

  describe('for Solana', () => {
    it('returns true when user has sufficient SOL balance', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
        gasFee: {
          total: { amount: '0.001' }, // 0.001 SOL
        },
        totalNetworkFee: {
          amount: '0.02',
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      // User has 0.01 SOL
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.01',
        atomicBalance: BigNumber.from('10000000'), // 0.01 SOL in lamports
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when user has insufficient SOL balance', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          gasIncluded: false,
          gasIncluded7702: false,
          srcChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
        gasFee: {
          total: { amount: '0.01' }, // 0.01 SOL
        },
        totalNetworkFee: {
          amount: '0.01',
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      // User has 0.001 SOL
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('1000000'), // 0.001 SOL in lamports
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(false);
    });
  });

  describe('for Bitcoin', () => {
    it('uses totalNetworkFee to validate BTC gas balance', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          srcChainId: ChainId.BTC,
        },
        gasFee: {
          total: { amount: '0' },
        },
        totalNetworkFee: {
          amount: '0.0001',
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('100000'), // 0.001 BTC in sats
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('falls back to gasFee.total.amount when totalNetworkFee is unavailable', () => {
      const mockQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] = {
        quote: {
          srcChainId: ChainId.BTC,
        },
        gasFee: {
          total: { amount: '0.0001' },
        },
        totalNetworkFee: undefined,
      } as unknown as ReturnType<typeof useBridgeQuoteData>['activeQuote'];

      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.001',
        atomicBalance: BigNumber.from('100000'), // 0.001 BTC in sats
      });

      const { result } = renderHookWithProvider(
        () =>
          useHasSufficientGasEvenIfGasIncludedOrSponsored({
            quote: mockQuote,
          }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });
  });
});
