/**
 * Mock response data for Transak lookup/quotes API.
 * Endpoint: GET api-gateway-stg.transak.com/api/v2/lookup/quotes
 * Used by transakGetBuyQuote() internal Transak quote.
 */

export const TRANSAK_QUOTE_RESPONSE = {
  data: {
    quoteId: 'mock-quote-id',
    conversionPrice: 4072.34,
    fiatCurrency: 'USD',
    cryptoCurrency: 'ETH',
    paymentMethod: 'credit_debit_card',
    fiatAmount: 100,
    cryptoAmount: 0.02455598,
    isBuyOrSell: 'BUY',
    network: 'ethereum',
    totalFee: 23.33,
    feeDecimal: 0.23,
    feeBreakdown: [],
    nonce: 1,
  },
};
