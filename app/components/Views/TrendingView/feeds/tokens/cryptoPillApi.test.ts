import { handleFetch } from '@metamask/controller-utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  buildCryptoPillTokensUrl,
  fetchCryptoPillTokens,
  type CryptoPillTokensRequest,
} from './cryptoPillApi';

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

const mockedHandleFetch = handleFetch as jest.MockedFunction<
  typeof handleFetch
>;

const CHAIN_IDS = ['eip155:1', 'eip155:4663'] as const;

describe('buildCryptoPillTokensUrl', () => {
  it('builds a URL with every param for a full request', () => {
    const url = buildCryptoPillTokensUrl({
      path: '/v3/tokens/trending',
      chainIds: [...CHAIN_IDS],
      sort: 'h24_trending',
      minLiquidity: 200000,
      minVolume24hUsd: 1000000,
      excludeLabels: ['stable_coin', 'blue_chip'],
      vsCurrency: 'usd',
    });

    expect(url).toBe(
      'https://token.api.cx.metamask.io/v3/tokens/trending' +
        '?chainIds=eip155%3A1,eip155%3A4663' +
        '&sort=h24_trending' +
        '&minLiquidity=200000' +
        '&minVolume24hUsd=1000000' +
        '&vsCurrency=usd' +
        '&excludeLabels=stable_coin,blue_chip',
    );
  });

  it('keeps excludeLabels commas literal rather than percent-encoded', () => {
    const url = buildCryptoPillTokensUrl({
      path: '/v3/tokens/popular',
      chainIds: ['eip155:4663'],
      excludeLabels: ['stable_coin'],
    });

    expect(url).toContain('&excludeLabels=stable_coin');
    expect(url).not.toContain('%2C');
  });

  it('omits optional params when they are not provided', () => {
    const url = buildCryptoPillTokensUrl({
      path: '/v3/tokens/top-gainers',
      chainIds: ['eip155:1'],
    });

    expect(url).toBe(
      'https://token.api.cx.metamask.io/v3/tokens/top-gainers?chainIds=eip155%3A1',
    );
  });

  it('omits excludeLabels when the array is empty', () => {
    const url = buildCryptoPillTokensUrl({
      path: '/v3/tokens/trending',
      chainIds: ['eip155:1'],
      excludeLabels: [],
      sort: 'h24_trending',
    });

    expect(url).not.toContain('excludeLabels');
  });
});

describe('fetchCryptoPillTokens', () => {
  const request: CryptoPillTokensRequest = {
    path: '/v3/tokens/trending',
    chainIds: ['eip155:1'],
    vsCurrency: 'usd',
  };

  it('returns the parsed array response', async () => {
    const tokens = [{ assetId: 'eip155:1/erc20:0xabc', symbol: 'ABC' }];
    mockedHandleFetch.mockResolvedValue(tokens);

    await expect(fetchCryptoPillTokens(request)).resolves.toBe(tokens);
    expect(mockedHandleFetch).toHaveBeenCalledWith(
      'https://token.api.cx.metamask.io/v3/tokens/trending?chainIds=eip155%3A1&vsCurrency=usd',
      undefined,
    );
  });

  it('forwards the abort signal to handleFetch', async () => {
    mockedHandleFetch.mockResolvedValue([]);
    const controller = new AbortController();

    await fetchCryptoPillTokens({ ...request, signal: controller.signal });

    expect(mockedHandleFetch).toHaveBeenCalledWith(expect.anything(), {
      signal: controller.signal,
    });
  });

  it('throws when the response is not an array', async () => {
    mockedHandleFetch.mockResolvedValue({ error: 'oops' });

    await expect(fetchCryptoPillTokens(request)).rejects.toThrow(
      'Crypto pill tokens response was not an array',
    );
  });

  it('propagates fetch errors', async () => {
    mockedHandleFetch.mockRejectedValue(new Error('network down'));

    await expect(fetchCryptoPillTokens(request)).rejects.toThrow(
      'network down',
    );
  });
});
