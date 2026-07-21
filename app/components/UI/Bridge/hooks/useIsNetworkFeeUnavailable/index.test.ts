import {
  ChainId,
  formatChainIdToCaip,
  mergeQuoteMetadata,
  toQuoteResponseV2,
  type DeepPartial,
  type QuoteMetadata,
  type QuoteResponse,
  type QuoteResponseV1,
} from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { isQuoteNetworkFeeUnavailable } from '.';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { merge } from 'lodash';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

const createQuote = (
  overrides: DeepPartial<QuoteResponse> = {},
  metadata: DeepPartial<QuoteMetadata> = {},
): ActiveQuote =>
  mergeQuoteMetadata(
    merge({}, mockQuoteWithMetadata, overrides, {
      chainId: formatChainIdToCaip(ChainId.BTC),
    }),
    {
      ...mockQuoteWithMetadata,
      ...metadata,
      totalNetworkFee: {
        ...mockQuoteWithMetadata.totalNetworkFee,
        amount: '0.0001',
        ...metadata.totalNetworkFee,
      },
    },
  );

describe('isQuoteNetworkFeeUnavailable', () => {
  it('returns true for a BTC quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {},
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: '0',
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {},
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: '-0.0001',
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {},
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: undefined,
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it('returns false for a BTC quote with positive network fee', () => {
    expect(isQuoteNetworkFeeUnavailable(createQuote())).toBe(false);
  });

  it('returns false for a non-BTC/non-Tron quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {
            chainId: 'eip155:1',
            quote: {
              ...mockQuoteWithMetadata.quote,
            },
          },
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: '0',
            },
          },
        ),
      ),
    ).toBe(false);
  });

  it('returns true for a Tron quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {
            chainId: formatChainIdToCaip(ChainId.TRON),
            quote: {
              ...mockQuoteWithMetadata.quote,
            },
          },
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: '0',
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it('returns true for a Tron quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {
            chainId: formatChainIdToCaip(ChainId.TRON),
          },
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: '-1',
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it('returns true for a Tron quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote(
          {
            chainId: formatChainIdToCaip(ChainId.TRON),
          },
          {
            totalNetworkFee: {
              ...mockQuoteWithMetadata.totalNetworkFee,
              amount: undefined,
            },
          },
        ),
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

  it('returns false when the quote has no source chain', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          chainId: null as never,
          quote: {
            ...mockQuoteWithMetadata.quote,
          },
        }),
      ),
    ).toBe(false);
  });
});
