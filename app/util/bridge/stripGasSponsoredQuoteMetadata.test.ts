import type { Quote } from '@metamask/bridge-controller';
import {
  stripGasSponsoredFromQuoteMetadata,
  type QuoteMetadataWithResponse,
} from './stripGasSponsoredQuoteMetadata';

const tokenAmountStub = {
  amount: '0',
  usd: null,
  valueInCurrency: null,
} as const;

function buildMinimalQuoteMetadata(
  quoteOverrides: Partial<Quote> & Pick<Quote, 'requestId'>,
): QuoteMetadataWithResponse {
  const quote = {
    ...quoteOverrides,
  } as Quote;

  return {
    adjustedReturn: { usd: null, valueInCurrency: null },
    cost: { usd: null, valueInCurrency: null },
    gasFee: {
      effective: { ...tokenAmountStub },
      max: { ...tokenAmountStub },
      total: { ...tokenAmountStub },
    },
    sentAmount: { ...tokenAmountStub },
    swapRate: '1',
    toTokenAmount: { ...tokenAmountStub },
    totalMaxNetworkFee: { ...tokenAmountStub },
    totalNetworkFee: { ...tokenAmountStub },
    minToTokenAmount: { ...tokenAmountStub },
    trade: {} as QuoteMetadataWithResponse['trade'],
    quote,
  } as QuoteMetadataWithResponse;
}

describe('stripGasSponsoredFromQuoteMetadata', () => {
  it('forces gasIncluded, gasIncluded7702, and gasSponsored false on nested quote', () => {
    const input = buildMinimalQuoteMetadata({
      requestId: 'req-1',
      gasIncluded: true,
      gasIncluded7702: true,
      gasSponsored: true,
    });

    const result = stripGasSponsoredFromQuoteMetadata(input);

    expect(result.quote.gasIncluded).toBe(false);
    expect(result.quote.gasIncluded7702).toBe(false);
    expect(result.quote.gasSponsored).toBe(false);
  });

  it('does not mutate the original item', () => {
    const input = buildMinimalQuoteMetadata({
      requestId: 'req-2',
      gasIncluded: true,
    });

    stripGasSponsoredFromQuoteMetadata(input);

    expect(input.quote.gasIncluded).toBe(true);
  });
});
