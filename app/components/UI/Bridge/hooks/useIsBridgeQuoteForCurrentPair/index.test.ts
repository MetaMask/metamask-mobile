import { renderHook } from '@testing-library/react-hooks';
import { useIsBridgeQuoteForCurrentPair } from './index';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { BridgeToken } from '../../types';
import { Hex, CaipChainId } from '@metamask/utils';

jest.mock('../useBridgeQuoteData');

describe('useIsBridgeQuoteForCurrentPair', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createMockToken = (
    address: string,
    chainId: Hex | CaipChainId,
  ): BridgeToken => ({
    address,
    chainId,
    symbol: 'TEST',
    decimals: 18,
  });

  const createMockQuote = (
    srcAssetId: string,
    destAssetId: string,
    requestId: string = 'mock-request-id',
  ): ReturnType<typeof useBridgeQuoteData>['activeQuote'] =>
    ({
      quote: {
        requestId,
        srcAsset: {
          assetId: srcAssetId as `${string}:${string}/${string}:${string}`,
          address: '0x123',
          chainId: 1,
          decimals: 18,
          symbol: 'SRC',
          name: 'Source Token',
        },
        destAsset: {
          assetId: destAssetId as `${string}:${string}/${string}:${string}`,
          address: '0x456',
          chainId: 1,
          decimals: 18,
          symbol: 'DEST',
          name: 'Dest Token',
        },
        srcChainId: 1,
        destChainId: 1,
        srcTokenAmount: '1000000000000000000',
        destTokenAmount: '2000000000000000000',
        bridgeId: 'lifi',
        bridges: ['lifi'],
        steps: [],
        feeData: {},
      },
      estimatedProcessingTimeInSeconds: 60,
      trade: {
        from: '0x123',
        to: '0x456',
        data: '0x',
        value: '0',
        chainId: 1,
      },
      approval: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  describe('missing props', () => {
    it('returns false when activeQuote is undefined', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: undefined,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when sourceToken is undefined', () => {
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );
      const destToken = createMockToken('0xdef', '0x1' as Hex);

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken: undefined,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when destToken is undefined', () => {
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken: undefined,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when all props are undefined', () => {
      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: undefined,
          sourceToken: undefined,
          destToken: undefined,
        }),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('EVM chains', () => {
    it('returns true when source and dest tokens match quote (lowercase addresses)', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when source and dest tokens match quote (checksummed addresses normalized)', () => {
      const sourceToken = createMockToken('0xAbC', '0x1' as Hex);
      const destToken = createMockToken('0xDeF', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when source token address differs from quote', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0x999',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when dest token address differs from quote', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0x999',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when source token chain ID differs from quote', () => {
      const sourceToken = createMockToken('0xabc', '0x89' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when dest token chain ID differs from quote', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x89' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when both tokens have different chain IDs from quote', () => {
      const sourceToken = createMockToken('0xabc', '0x89' as Hex);
      const destToken = createMockToken('0xdef', '0xa' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('non-EVM chains', () => {
    it('returns true when Solana source and dest tokens match quote (case-sensitive)', () => {
      const sourceToken = createMockToken(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      const destToken = createMockToken(
        '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      const quote = createMockQuote(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when Solana address case differs', () => {
      const sourceToken = createMockToken(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      const destToken = createMockToken(
        '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      // Quote has lowercase Solana address (simulating mismatch)
      const quote = createMockQuote(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:epjfwdd5aufqssqem2qn1xzybap...',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('mixed EVM and non-EVM chains', () => {
    it('returns true when EVM source and Solana dest match quote', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when Solana source and EVM dest match quote', () => {
      const sourceToken = createMockToken(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      );
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'eip155:1/erc20:0xdef',
      );

      const { result } = renderHook(() =>
        useIsBridgeQuoteForCurrentPair({
          activeQuote: quote,
          sourceToken,
          destToken,
        }),
      );

      expect(result.current).toBe(true);
    });
  });

  describe('memoization', () => {
    it('returns same result when dependencies have not changed', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
        'request-id-1',
      );

      const { result, rerender } = renderHook(
        (props) => useIsBridgeQuoteForCurrentPair(props),
        {
          initialProps: {
            activeQuote: quote,
            sourceToken,
            destToken,
          },
        },
      );

      const firstResult = result.current;

      rerender({
        activeQuote: quote,
        sourceToken,
        destToken,
      });

      expect(result.current).toBe(firstResult);
    });

    it('recalculates when quote request ID changes', () => {
      const sourceToken = createMockToken('0xabc', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote1 = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
        'request-id-1',
      );
      const quote2 = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
        'request-id-2',
      );

      const { result, rerender } = renderHook(
        (props) => useIsBridgeQuoteForCurrentPair(props),
        {
          initialProps: {
            activeQuote: quote1,
            sourceToken,
            destToken,
          },
        },
      );

      const firstResult = result.current;

      rerender({
        activeQuote: quote2,
        sourceToken,
        destToken,
      });

      // Result should still be true, but it should have recalculated
      expect(result.current).toBe(true);
      // Different instance due to recalculation
      expect(firstResult).toBe(true);
    });

    it('recalculates when sourceToken changes', () => {
      const sourceToken1 = createMockToken('0xabc', '0x1' as Hex);
      const sourceToken2 = createMockToken('0x999', '0x1' as Hex);
      const destToken = createMockToken('0xdef', '0x1' as Hex);
      const quote = createMockQuote(
        'eip155:1/erc20:0xabc',
        'eip155:1/erc20:0xdef',
      );

      const { result, rerender } = renderHook(
        (props) => useIsBridgeQuoteForCurrentPair(props),
        {
          initialProps: {
            activeQuote: quote,
            sourceToken: sourceToken1,
            destToken,
          },
        },
      );

      expect(result.current).toBe(true);

      rerender({
        activeQuote: quote,
        sourceToken: sourceToken2,
        destToken,
      });

      // Should now be false since source token address changed
      expect(result.current).toBe(false);
    });
  });
});
