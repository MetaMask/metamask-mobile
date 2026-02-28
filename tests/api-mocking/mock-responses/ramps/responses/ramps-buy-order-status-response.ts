/**
 * Mock response data for buy (aggregator) order status polling.
 * Endpoint: GET on-ramp.uat-api.../v2/providers/.../orders/...
 * Returns a full order object; status is typically PENDING then COMPLETED.
 */

export const createBuyOrderResponse = (status: string) => ({
  id: 'mock-order-123',
  isOnlyLink: false,
  success: status === 'COMPLETED',
  cryptoAmount: '0.00355373',
  fiatAmount: 15,
  cryptoCurrency: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  fiatCurrency: {
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  provider: {
    id: '/providers/transak-staging',
    name: 'Transak (Staging)',
  },
  providerOrderId: 'mock-order-123',
  providerOrderLink: '',
  createdAt: Date.now(),
  totalFeesFiat: 3.5,
  txHash: status === 'COMPLETED' ? '0xmocktxhash123' : null,
  walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  status,
  network: {
    name: 'Ethereum Mainnet',
    chainId: '1',
  },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: 'Usually completes in a few minutes',
  orderType: 'BUY',
  exchangeRate: 4072.34,
});
