import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import mockQuotes from './mock-quotes-sol-sol.json';

const mockQuote = mockQuotes[0] as unknown as QuoteResponse;

export const mockQuoteWithMetadata: QuoteResponse & QuoteMetadata = {
  ...mockQuote,
  adjustedReturn: { usd: null, valueInCurrency: null },
  cost: { usd: null, valueInCurrency: null },
  gasFee: {
    effective: { amount: '0', usd: null, valueInCurrency: null },
    max: { amount: '0', usd: null, valueInCurrency: null },
    total: { amount: '0', usd: null, valueInCurrency: null },
  },
  sentAmount: { amount: '0.5', usd: null, valueInCurrency: null },
  swapRate: '114.112442',
  toTokenAmount: {
    amount: '57.056221',
    usd: null,
    valueInCurrency: null,
  },
  totalMaxNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
  totalNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
  minToTokenAmount: { amount: '0', usd: null, valueInCurrency: null },
};
