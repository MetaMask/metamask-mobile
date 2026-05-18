import { handleFetch } from '@metamask/controller-utils';

import { getTokens, TOKEN_API_V3_BASE_URL } from './getTokens';

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

const mockedHandleFetch = handleFetch as jest.MockedFunction<
  typeof handleFetch
>;

describe('getTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array without hitting the network when no assetIds are provided', async () => {
    const result = await getTokens([]);

    expect(result).toStrictEqual([]);
    expect(mockedHandleFetch).not.toHaveBeenCalled();
  });

  it('joins assetIds into a single comma-separated query and includes hydration flags', async () => {
    mockedHandleFetch.mockResolvedValue([]);

    await getTokens(['eip155:1/slip44:60', 'eip155:1/erc20:0xabc']);

    expect(mockedHandleFetch).toHaveBeenCalledTimes(1);
    const calledWith = mockedHandleFetch.mock.calls[0][0] as string;
    expect(calledWith.startsWith(`${TOKEN_API_V3_BASE_URL}/assets?`)).toBe(
      true,
    );
    expect(calledWith).toContain(
      'assetIds=eip155%3A1%2Fslip44%3A60%2Ceip155%3A1%2Ferc20%3A0xabc',
    );
    expect(calledWith).toContain('includeIconUrl=true');
    expect(calledWith).toContain('includeMarketData=true');
    expect(calledWith).toContain('includeRwaData=true');
    expect(calledWith).toContain('includeTokenSecurityData=true');
  });

  it('returns the array response from the Token API verbatim', async () => {
    const apiResponse = [
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        iconUrl: 'https://example.com/eth.png',
      },
    ];
    mockedHandleFetch.mockResolvedValue(apiResponse);

    const result = await getTokens(['eip155:1/slip44:60']);

    expect(result).toStrictEqual(apiResponse);
  });

  it('returns an empty array when the Token API returns a non-array payload', async () => {
    mockedHandleFetch.mockResolvedValue({ unexpected: 'shape' });

    const result = await getTokens(['eip155:1/slip44:60']);

    expect(result).toStrictEqual([]);
  });

  it('propagates network errors so the calling query can react', async () => {
    const networkError = new Error('boom');
    mockedHandleFetch.mockRejectedValue(networkError);

    await expect(getTokens(['eip155:1/slip44:60'])).rejects.toThrow('boom');
  });
});
