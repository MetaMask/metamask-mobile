import { TokenSearchResponseItem } from './types';

export const createMockToken = (
  overrides: Partial<TokenSearchResponseItem> = {},
): TokenSearchResponseItem => ({
  tokenAddress: '0x1234',
  chainId: '1',
  name: 'TestToken',
  symbol: 'TEST',
  usdPrice: 100,
  usdPricePercentChange: {
    oneDay: 10,
  },
  ...overrides,
});

export const createMockTokensResponse = (
  count: number = 1,
  overrides: Partial<TokenSearchResponseItem> = {},
): TokenSearchResponseItem[] => Array(count)
    .fill(null)
    .map(() => createMockToken(overrides));

export const mockSuccessfulResponse = (data: any) => ({
  ok: true,
  json: async () => data,
});

export const mockFailedResponse = (status: number = 500) => ({
  ok: false,
  status,
});
