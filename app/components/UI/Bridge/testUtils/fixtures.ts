import { CaipChainId, CaipAssetType } from '@metamask/utils';
import { BridgeToken } from '../types';
import { PopularToken, IncludeAsset } from '../hooks/usePopularTokens';
import { BalanceData } from '../hooks/useBalancesByAssetId';

export const createMockToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  name: 'Test Token',
  ...overrides,
});

export const createMockTokenWithBalance = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  ...createMockToken(),
  balance: '100.0',
  balanceFiat: '$100',
  tokenFiatAmount: 100,
  currencyExchangeRate: 1,
  ...overrides,
});

export const createMockPopularToken = (
  overrides: Partial<PopularToken> = {},
): PopularToken => ({
  assetId:
    'eip155:1/erc20:0x1234567890123456789012345678901234567890' as CaipAssetType,
  chainId: 'eip155:1' as CaipChainId,
  decimals: 18,
  image: 'https://example.com/token.png',
  name: 'Test Token',
  symbol: 'TEST',
  ...overrides,
});

export const createMockBalanceData = (
  overrides: Partial<BalanceData> = {},
): BalanceData => ({
  balance: '1.0',
  balanceFiat: '$100',
  tokenFiatAmount: 100,
  currencyExchangeRate: 100,
  ...overrides,
});

export const createMockIncludeAsset = (
  overrides: Partial<IncludeAsset> = {},
): IncludeAsset => ({
  assetId:
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType,
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  ...overrides,
});

export const MOCK_CHAIN_IDS = {
  ethereum: 'eip155:1' as CaipChainId,
  polygon: 'eip155:137' as CaipChainId,
  optimism: 'eip155:10' as CaipChainId,
};

export const MOCK_CHAIN_IDS_HEX = {
  ethereum: '0x1',
  polygon: '0x89',
  optimism: '0xa',
};

export const mockBridgeFeatureFlags = {
  chainRanking: [
    { chainId: MOCK_CHAIN_IDS.ethereum },
    { chainId: MOCK_CHAIN_IDS.polygon },
    { chainId: MOCK_CHAIN_IDS.optimism },
  ],
};

export const mockNetworkConfigurations = {
  '0x1': { name: 'Ethereum Mainnet' },
  '0x89': { name: 'Polygon' },
  '0xa': { name: 'Optimism' },
};

export const createMockSearchResponse = (
  overrides: {
    data?: PopularToken[];
    hasNextPage?: boolean;
    endCursor?: string;
  } = {},
) => ({
  data: overrides.data ?? [createMockPopularToken({ symbol: 'SRCH' })],
  count: overrides.data?.length ?? 1,
  totalCount: overrides.data?.length ?? 1,
  pageInfo: {
    hasNextPage: overrides.hasNextPage ?? false,
    endCursor: overrides.endCursor,
  },
});

export const createMockPaginatedResponse = (
  overrides: {
    data?: PopularToken[];
    cursor?: string;
  } = {},
) => ({
  data: overrides.data ?? [createMockPopularToken({ symbol: 'FIRST' })],
  count: overrides.data?.length ?? 1,
  totalCount: 10,
  pageInfo: { hasNextPage: true, endCursor: overrides.cursor ?? 'cursor123' },
});
