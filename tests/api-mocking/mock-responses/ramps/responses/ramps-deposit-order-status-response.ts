/**
 * Mock response data for deposit (Transak native) order status polling.
 * Endpoint: GET on-ramp.uat-api.../providers/transak-native-staging/orders/...
 * Used by ramps orders API mock (getOrder after createOrder) and processDepositOrder.
 * Returns deposit-format order; status is typically PENDING then COMPLETED.
 */

export const createDepositOrderResponse = (status: string) => ({
  providerOrderId: 'mock-transak-order-123',
  createdAt: Date.now(),
  fiatAmount: 100,
  totalFeesFiat: 23.33,
  cryptoAmount: 0.02455598,
  fiatCurrency: 'USD',
  fiatAmountInUsd: 100,
  cryptoCurrency: {
    symbol: 'ETH',
    name: 'Ethereum',
  },
  network: {
    chainId: '1',
    name: 'Ethereum Mainnet',
  },
  walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  status,
  txHash: status === 'COMPLETED' ? '0xmocktxhash123' : null,
  orderType: 'DEPOSIT',
});
