/**
 * Mock response data for Transak create order API.
 * Endpoint: POST api-gateway-stg.transak.com/api/v2/orders
 */

export const TRANSAK_CREATE_ORDER_RESPONSE = {
  data: {
    orderId: 'mock-transak-order-123',
    walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
    paymentDetails: [
      {
        fiatCurrency: 'USD',
        paymentMethod: 'credit_debit_card',
        fields: [],
      },
    ],
  },
};
