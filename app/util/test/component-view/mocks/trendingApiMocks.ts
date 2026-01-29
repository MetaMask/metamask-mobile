/**
 * Mock API responses for trending tokens integration tests
 */

import { getTrendingTokens } from '@metamask/assets-controllers';

export interface MockTrendingToken {
  assetId: string;
  name: string;
  symbol: string;
  address?: string;
  chainId: string;
  price?: string;
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  imageUrl?: string;
  decimals?: number;
  aggregatedUsdVolume?: number;
  marketCap?: number;
  priceChangePct?: {
    m5?: string;
    m15?: string;
    m30?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
}

export const mockTrendingTokensData: MockTrendingToken[] = [
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    chainId: 'eip155:1',
    price: '2000.00',
    priceChange24h: 5.2,
    volume24h: 15000000000,
    liquidity: 5000000000,
    imageUrl: 'https://example.com/eth.png',
    decimals: 18,
    aggregatedUsdVolume: 15000000000,
    marketCap: 500000000000,
    priceChangePct: {
      h24: '5.2',
    },
  },
  {
    assetId: 'eip155:1/erc20:0x1234567890123456789012345678901234567890',
    name: 'Bitcoin',
    symbol: 'BTC',
    address: '0x1234567890123456789012345678901234567890',
    chainId: 'eip155:1',
    price: '45000.00',
    priceChange24h: -2.5,
    volume24h: 25000000000,
    liquidity: 8000000000,
    imageUrl: 'https://example.com/btc.png',
    decimals: 8,
    aggregatedUsdVolume: 25000000000,
    marketCap: 800000000000,
    priceChangePct: {
      h24: '-2.5',
    },
  },
  {
    assetId: 'eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    name: 'Uniswap',
    symbol: 'UNI',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    chainId: 'eip155:1',
    price: '8.50',
    priceChange24h: 12.8,
    volume24h: 500000000,
    liquidity: 300000000,
    imageUrl: 'https://example.com/uni.png',
    decimals: 18,
    aggregatedUsdVolume: 500000000,
    marketCap: 5000000000,
    priceChangePct: {
      h24: '12.8',
    },
  },
];

export const mockEmptyTrendingData: MockTrendingToken[] = [];

export const mockSearchResultsEth: MockTrendingToken[] = [
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    chainId: 'eip155:1',
    price: '2000.00',
    priceChange24h: 5.2,
    volume24h: 15000000000,
    liquidity: 5000000000,
    imageUrl: 'https://example.com/eth.png',
  },
];

export const mockBnbChainToken: MockTrendingToken[] = [
  {
    assetId: 'eip155:56/erc20:0xBTC0000000000000000000000000000000000000',
    name: 'Bitcoin BNB',
    symbol: 'BTCB',
    address: '0xBTC0000000000000000000000000000000000000',
    chainId: 'eip155:56',
    price: '44500.00',
    priceChange24h: -1.8,
    volume24h: 18000000000,
    liquidity: 7000000000,
    imageUrl: 'https://example.com/btcb.png',
    decimals: 18,
    aggregatedUsdVolume: 18000000000,
    marketCap: 750000000000,
    priceChangePct: {
      h24: '-1.8',
    },
  },
];

/**
 * Setup mock for getTrendingTokens from @metamask/assets-controllers
 * Call this in beforeEach of your tests
 */
export const setupTrendingApiFetchMock = (
  responseData: MockTrendingToken[] = mockTrendingTokensData,
) => {
  (getTrendingTokens as jest.Mock).mockImplementation(async () => responseData);
};

/**
 * Setup mock for getTrendingTokens error
 */
export const setupTrendingApiErrorMock = (
  message = 'Internal Server Error',
) => {
  (getTrendingTokens as jest.Mock).mockRejectedValue(new Error(message));
};

/**
 * Clear all mocks
 * Call this in afterEach of your tests
 */
export const clearTrendingApiMocks = () => {
  jest.clearAllMocks();
};
