import { merge } from 'lodash';
import {
  ChainId,
  type DeepPartial,
  formatChainIdToCaip,
  getNativeAssetForChainId,
  type QuoteResponse,
  toBridgeAssetV2,
} from '@metamask/bridge-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useHasSufficientGas } from './index';
import { useLatestBalance } from '../useLatestBalance';
import { BigNumber } from 'ethers';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import type { useBridgeQuoteDataContext } from '../useBridgeQuoteData/BridgeQuoteDataContext';

jest.mock('../useLatestBalance');

const createQuote = (
  overrides: DeepPartial<QuoteResponse> = {},
): QuoteResponse => merge({}, mockQuoteWithMetadata, overrides);

describe('useHasSufficientGas', () => {
  const mockUseLatestBalance = jest.mocked(useLatestBalance);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when gas is included in the quote', () => {
    it('returns true when gasIncluded is true', () => {
      const mockQuote = createQuote({
        chainId: 'eip155:1',
        quote: {
          gasIncluded: true,
          gasIncluded7702: false,
          feeData: {
            network: [{ normalizedAmount: '0.001' }],
          },
        },
      });

      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: mockQuote }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when gasIncluded7702 is true', () => {
      const mockQuote = createQuote({
        chainId: 'eip155:1',
        quote: {
          gasIncluded: false,
          gasIncluded7702: true,
          feeData: {
            network: [{ normalizedAmount: '0.001' }],
          },
        },
      });

      const { result } = renderHookWithProvider(
        () => useHasSufficientGas({ quote: mockQuote }),
        { state: {} },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when both gasIncluded and gasIncluded7702 are true', () => {
      const mockQuote = createQuote({
        chainId: 'eip155:1',
        quote: {
          gasIncluded: true,
          gasIncluded7702: true,
          feeData: {
            network: [{ normalizedAmount: '0.001' }],
          },
        },
      });

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
        const mockQuote = createQuote({
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: '0.001',
                  asset: toBridgeAssetV2(getNativeAssetForChainId(ChainId.ETH)),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: BigNumber.from('10000000000000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
      });

      it('should return false when user has insufficient gas balance', () => {
        const mockQuote = createQuote({
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: '0.01',
                  asset: toBridgeAssetV2(getNativeAssetForChainId(ChainId.ETH)),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000000000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(false);
      });

      it('should handle scientific notation in total gas fee', () => {
        const mockQuote = createQuote({
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: '9.200359292e-8',
                  asset: toBridgeAssetV2(getNativeAssetForChainId(ChainId.ETH)),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000000000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
      });

      it('should return null when gas token balance is not available', () => {
        const mockQuote = createQuote({
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [{ normalizedAmount: '0.001' }],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue(undefined);

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(null);
      });

      it('should return null when gas fee amount is not available', () => {
        const mockQuote: ReturnType<
          typeof useBridgeQuoteDataContext
        >['activeQuote'] = {
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: undefined,
                },
              ],
            },
          },
        } as unknown as QuoteResponse;

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
        const mockQuote = createQuote({
          chainId: 'eip155:1',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [{ normalizedAmount: '0.001' }],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: undefined,
        } as ReturnType<typeof useLatestBalance>);

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(null);
      });
    });

    describe('for Solana', () => {
      it('should return true when user has sufficient SOL balance', () => {
        const mockQuote = createQuote({
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: '0.001',
                  asset: toBridgeAssetV2(
                    getNativeAssetForChainId(ChainId.SOLANA),
                  ),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.01',
          atomicBalance: BigNumber.from('10000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
      });

      it('should return false when user has insufficient SOL balance', () => {
        const mockQuote = createQuote({
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          quote: {
            gasIncluded: false,
            gasIncluded7702: false,
            feeData: {
              network: [
                {
                  normalizedAmount: '0.01',
                  asset: toBridgeAssetV2(
                    getNativeAssetForChainId(ChainId.SOLANA),
                  ),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(false);
      });
    });

    describe('for Bitcoin', () => {
      it('uses totalNetworkFee to validate BTC gas balance', () => {
        const mockQuote = createQuote({
          chainId: formatChainIdToCaip(ChainId.BTC),
          quote: {
            feeData: {
              network: [
                {
                  normalizedAmount: '0.00005',
                  asset: toBridgeAssetV2(getNativeAssetForChainId(ChainId.BTC)),
                },
                {
                  normalizedAmount: '0.00005',
                  asset: toBridgeAssetV2(getNativeAssetForChainId(ChainId.BTC)),
                },
              ],
            },
          },
        });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('100000'),
        });

        const { result } = renderHookWithProvider(
          () => useHasSufficientGas({ quote: mockQuote }),
          { state: {} },
        );

        expect(result.current).toBe(true);
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
