import mockQuotes from './mock-quotes-sol-sol.json';

export const mockQuoteWithMetadata = {
  ...mockQuotes[0],
  adjustedReturn: { usd: null, valueInCurrency: null },
  cost: { usd: null, valueInCurrency: null },
  gasFee: { amount: '0', usd: null, valueInCurrency: null },
  sentAmount: { amount: '0.5', usd: null, valueInCurrency: null },
  swapRate: '114.112442',
  toTokenAmount: {
    amount: '57.056221',
    usd: null,
    valueInCurrency: null,
  },
  totalMaxNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
  totalNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
};
