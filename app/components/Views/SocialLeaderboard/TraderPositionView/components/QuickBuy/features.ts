import type { QuickBuyFeatures } from './types';

/** Top Traders — buy-only amount sheet. */
export const TOP_TRADERS_QUICK_BUY_FEATURES: QuickBuyFeatures = {
  tradeModes: ['buy'],
  quoteDetails: false,
  selectQuote: false,
  payWithSheet: true,
  highPriceImpactModal: false,
  fiatCryptoToggle: true,
};
