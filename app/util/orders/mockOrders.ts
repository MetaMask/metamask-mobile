import type { OrderItem } from './types';

export const MOCK_ORDERS: OrderItem[] = [
  {
    id: 'swap-limit-1',
    domain: 'swap',
    orderType: 'limit',
    status: 'open',
    side: 'buy',
    instrument: {
      symbol: 'ETH/USDC',
      name: 'Ethereum',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDC',
      chainId: '1',
      networkName: 'Ethereum Mainnet',
    },
    size: '1.5',
    formattedSize: '1.5 ETH',
    price: '2450.00',
    formattedPrice: '$2,450.00',
    notionalValueUsd: '$3,675.00',
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    canCancel: true,
    cancelType: 'offChain',
    canEdit: true,
    metadata: {
      routingSource: 'Uniswap V3',
      slippageTolerance: '0.5%',
    },
  },
  {
    id: 'swap-limit-2',
    domain: 'swap',
    orderType: 'limit',
    status: 'partiallyFilled',
    side: 'sell',
    instrument: {
      symbol: 'ETH/USDT',
      name: 'Ethereum',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDT',
      chainId: '1',
      networkName: 'Ethereum Mainnet',
    },
    size: '3.0',
    formattedSize: '3.0 ETH',
    filledSize: '1.2 ETH',
    fillPercentage: 40,
    price: '2800.00',
    formattedPrice: '$2,800.00',
    notionalValueUsd: '$8,400.00',
    timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 3, // 3 days
    canCancel: true,
    cancelType: 'offChain',
    canEdit: false,
    metadata: {
      routingSource: '1inch Aggregator',
    },
  },
  {
    id: 'swap-limit-3',
    domain: 'swap',
    orderType: 'limit',
    status: 'filled',
    side: 'buy',
    instrument: {
      symbol: 'ETH/USDC',
      name: 'Ethereum',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDC',
      chainId: '1',
      networkName: 'Ethereum Mainnet',
    },
    size: '2.0',
    formattedSize: '2.0 ETH',
    filledSize: '2.0 ETH',
    fillPercentage: 100,
    price: '2350.00',
    formattedPrice: '$2,350.00',
    notionalValueUsd: '$4,700.00',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    canCancel: false,
    cancelType: 'none',
    canEdit: false,
    metadata: {
      routingSource: 'Uniswap V3',
    },
  },
  {
    id: 'swap-limit-4',
    domain: 'swap',
    orderType: 'limit',
    status: 'cancelled',
    side: 'sell',
    instrument: {
      symbol: 'ETH/USDT',
      name: 'Ethereum',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDT',
      chainId: '1',
      networkName: 'Ethereum Mainnet',
    },
    size: '1.0',
    formattedSize: '1.0 ETH',
    price: '3100.00',
    formattedPrice: '$3,100.00',
    notionalValueUsd: '$3,100.00',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
    canCancel: false,
    cancelType: 'none',
    canEdit: false,
    metadata: {
      routingSource: '1inch Aggregator',
    },
  },
];

/**
 * Filter orders by asset symbol or token properties.
 */
export function getOrdersForToken(tokenSymbol?: string): OrderItem[] {
  if (!tokenSymbol) {
    return MOCK_ORDERS;
  }
  const upper = tokenSymbol.toUpperCase();
  return MOCK_ORDERS.filter(
    (order) =>
      order.instrument.baseAssetSymbol.toUpperCase() === upper ||
      order.instrument.symbol.toUpperCase().includes(upper),
  );
}

/**
 * Filter orders by domain (swap, perps, predict).
 */
export function getOrdersByDomain(domain?: string): OrderItem[] {
  if (!domain || domain === 'all') {
    return MOCK_ORDERS;
  }
  return MOCK_ORDERS.filter((order) => order.domain === domain);
}
