/**
 * Mock response data for Ramps translate endpoint (Transak native flow).
 * Endpoint: GET on-ramp.uat-api.cx.metamask.io/providers/transak-native-staging/native/translate
 * Used by getBuyQuote, createOrder, getUserLimits. Response is NOT wrapped in { data: ... }.
 */

export const TRANSAK_RAMPS_TRANSLATE_RESPONSE = {
  cryptoCurrency: 'ETH',
  network: 'ethereum',
  fiatCurrency: 'USD',
  paymentMethod: 'credit_debit_card',
};
