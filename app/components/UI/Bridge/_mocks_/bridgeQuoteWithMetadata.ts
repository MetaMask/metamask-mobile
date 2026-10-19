import {
  mergeQuoteMetadata,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import mockQuotes from './mock-quotes-sol-sol';

const mockQuote = mockQuotes[0];

const quoteMetadata: QuoteMetadata = {
  adjustedReturn: { usd: undefined, valueInCurrency: undefined },
  cost: { usd: undefined, valueInCurrency: undefined },
  gasFee: {
    total: { amount: '0', usd: undefined, valueInCurrency: undefined },
  },
  sentAmount: { amount: '0.5', usd: undefined, valueInCurrency: undefined },
  swapRate: '114.112442',
  toTokenAmount: {
    amount: '57.056221',
    usd: undefined,
    valueInCurrency: undefined,
  },
  totalNetworkFee: { amount: '0', usd: undefined, valueInCurrency: undefined },
  minToTokenAmount: {
    amount: '55.56221',
    usd: undefined,
    valueInCurrency: undefined,
  },
};

export const mockQuoteWithMetadata: QuoteResponse & QuoteMetadata =
  mergeQuoteMetadata(mockQuote, quoteMetadata);
