import {
  ChainId,
  formatChainIdToCaip,
  DeepPartial,
} from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { isQuoteNetworkFeeUnavailable } from '.';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { mergeWith } from 'lodash';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

const createQuote = (
  overrides: DeepPartial<NonNullable<ActiveQuote>> = {},
): ActiveQuote =>
  mergeWith(
    {},
    mockQuoteWithMetadata,
    {
      chainId: formatChainIdToCaip(ChainId.BTC),
      quote: {
        feeData: {
          network: [{ normalizedAmount: '0.0001' }],
        },
      },
    },
    overrides,
    (_, srcValue) => srcValue,
  );

describe('isQuoteNetworkFeeUnavailable', () => {
  it('returns true for a BTC quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            feeData: {
              network: [{ normalizedAmount: '0' }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            feeData: {
              network: [{ normalizedAmount: '-0.0001' }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            feeData: {
              network: [{ normalizedAmount: undefined }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a BTC quote with positive network fee', () => {
    expect(isQuoteNetworkFeeUnavailable(createQuote())).toBe(false);
  });

  it('returns false for a non-BTC/non-Tron/non-Stellar quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: formatChainIdToCaip(1),
          quote: {
            feeData: {
              network: [{ normalizedAmount: '0' }],
            },
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns true for a Tron quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: formatChainIdToCaip(ChainId.TRON),
          quote: {
            feeData: {
              network: [{ normalizedAmount: '0' }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a Tron quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: formatChainIdToCaip(ChainId.TRON),
          quote: {
            feeData: {
              network: [{ normalizedAmount: '-1' }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a Tron quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: formatChainIdToCaip(ChainId.TRON),
          quote: {
            ...mockQuoteWithMetadata.quote,
            feeData: {
              network: [{ normalizedAmount: undefined }],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a Tron quote with positive network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: formatChainIdToCaip(ChainId.TRON),
        }),
      ),
    ).toBe(false);
  });

  it('returns true for a Stellar quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: ChainId.STELLAR,
          },
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: '0',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a Stellar quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: ChainId.STELLAR,
          },
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: '-1',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a Stellar quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: ChainId.STELLAR,
          },
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: undefined,
          } as unknown as NonNullable<ActiveQuote>['totalNetworkFee'],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a Stellar quote with positive network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: ChainId.STELLAR,
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns false when the quote has no source chain', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: undefined,
        }),
      ),
    ).toBe(false);
  });
});
