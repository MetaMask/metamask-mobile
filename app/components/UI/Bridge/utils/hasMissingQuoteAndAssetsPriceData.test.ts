import { createMockToken } from '../testUtils';
import { hasMissingQuoteAndAssetsPriceData } from './hasMissingQuoteAndAssetsPriceData';

const pricedToken = createMockToken({ symbol: 'ETH' });
const unpricedToken = createMockToken({ symbol: 'MUSD' });

const quoteWithPriceImpact = {
  quote: { priceData: { priceImpact: { amount: '0.01' } } },
};
const quoteWithoutPriceImpact = { quote: {} };

const pricedPair = {
  sourceAmount: '1',
  sourceToken: pricedToken,
  destToken: pricedToken,
  sourceFiatRate: 1,
  destFiatRate: 1,
  isActiveQuoteForCurrentTokenPair: true,
};

describe('hasMissingQuoteAndAssetsPriceData', () => {
  it('returns true when the active quote has no price impact data', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      activeQuote: quoteWithoutPriceImpact,
    });

    expect(result).toBe(true);
  });

  it('returns true when the destination token has no fiat rate', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      destToken: unpricedToken,
      destFiatRate: undefined,
      activeQuote: quoteWithPriceImpact,
    });

    expect(result).toBe(true);
  });

  it('returns true when the source token has no fiat rate', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      sourceToken: unpricedToken,
      sourceFiatRate: undefined,
      activeQuote: quoteWithPriceImpact,
    });

    expect(result).toBe(true);
  });

  it('returns false while no amount has been entered', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      sourceAmount: '0',
      destToken: unpricedToken,
      destFiatRate: undefined,
      activeQuote: quoteWithoutPriceImpact,
    });

    expect(result).toBe(false);
  });

  it('returns false until a quote comes back, even when a token has no fiat rate', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      destToken: unpricedToken,
      destFiatRate: undefined,
      activeQuote: undefined,
    });

    expect(result).toBe(false);
  });

  it('returns false while the active quote is for a previous token pair', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      destToken: unpricedToken,
      destFiatRate: undefined,
      activeQuote: quoteWithPriceImpact,
      isActiveQuoteForCurrentTokenPair: false,
    });

    expect(result).toBe(false);
  });

  it('returns false when the quote carries price impact data and both tokens are priced', () => {
    const result = hasMissingQuoteAndAssetsPriceData({
      ...pricedPair,
      activeQuote: quoteWithPriceImpact,
    });

    expect(result).toBe(false);
  });
});
