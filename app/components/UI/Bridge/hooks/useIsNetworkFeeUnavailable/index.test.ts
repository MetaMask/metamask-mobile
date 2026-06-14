import { ChainId } from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { isQuoteNetworkFeeUnavailable } from '.';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

const createQuote = (
  overrides: Partial<NonNullable<ActiveQuote>> = {},
): ActiveQuote =>
  ({
    ...mockQuoteWithMetadata,
    ...overrides,
    quote: {
      ...mockQuoteWithMetadata.quote,
      srcChainId: ChainId.BTC,
      ...overrides.quote,
    },
    totalNetworkFee: {
      ...mockQuoteWithMetadata.totalNetworkFee,
      amount: '0.0001',
      ...overrides.totalNetworkFee,
    },
  }) as ActiveQuote;

describe('isQuoteNetworkFeeUnavailable', () => {
  it('returns true for a BTC quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: '0',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with negative network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: '-0.0001',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true for a BTC quote with missing network fee amount', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: undefined,
          } as unknown as NonNullable<ActiveQuote>['totalNetworkFee'],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a BTC quote with positive network fee', () => {
    expect(isQuoteNetworkFeeUnavailable(createQuote())).toBe(false);
  });

  it('returns false for a non-BTC quote with zero network fee', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: 1,
          },
          totalNetworkFee: {
            ...mockQuoteWithMetadata.totalNetworkFee,
            amount: '0',
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns false when the quote has no source chain', () => {
    expect(
      isQuoteNetworkFeeUnavailable(
        createQuote({
          quote: {
            ...mockQuoteWithMetadata.quote,
            srcChainId: undefined,
          } as unknown as NonNullable<ActiveQuote>['quote'],
        }),
      ),
    ).toBe(false);
  });
});
