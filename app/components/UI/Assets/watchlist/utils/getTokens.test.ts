import { handleFetch } from '@metamask/controller-utils';

import {
  GET_TOKENS_BATCH_SIZE,
  getTokens,
  TOKEN_API_V3_BASE_URL,
} from './getTokens';

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

  describe('chunking', () => {
    const makeIds = (n: number) =>
      Array.from({ length: n }, (_, i) => `eip155:1/erc20:0x${i}`);

    it(`issues a single request when assetIds length <= ${GET_TOKENS_BATCH_SIZE}`, async () => {
      mockedHandleFetch.mockResolvedValue([]);

      await getTokens(makeIds(GET_TOKENS_BATCH_SIZE));

      expect(mockedHandleFetch).toHaveBeenCalledTimes(1);
    });

    it(`splits requests into chunks of ${GET_TOKENS_BATCH_SIZE} when assetIds length exceeds the batch size`, async () => {
      mockedHandleFetch.mockResolvedValue([]);

      await getTokens(makeIds(GET_TOKENS_BATCH_SIZE * 2 + 5));

      expect(mockedHandleFetch).toHaveBeenCalledTimes(3);
    });

    it('flattens the per-batch responses into a single array preserving order', async () => {
      const batchOne = [{ assetId: 'a', symbol: 'A', name: 'A', decimals: 1 }];
      const batchTwo = [{ assetId: 'b', symbol: 'B', name: 'B', decimals: 1 }];
      mockedHandleFetch
        .mockResolvedValueOnce(batchOne)
        .mockResolvedValueOnce(batchTwo);

      const result = await getTokens(makeIds(GET_TOKENS_BATCH_SIZE + 1));

      expect(mockedHandleFetch).toHaveBeenCalledTimes(2);
      expect(result.map((t) => t.symbol)).toStrictEqual(['A', 'B']);
    });

    it('drops batches whose response is not an array but keeps the rest', async () => {
      const validBatch = [
        { assetId: 'a', symbol: 'A', name: 'A', decimals: 1 },
      ];
      mockedHandleFetch
        .mockResolvedValueOnce(validBatch)
        .mockResolvedValueOnce({ unexpected: 'shape' });

      const result = await getTokens(makeIds(GET_TOKENS_BATCH_SIZE + 1));

      expect(result.map((t) => t.symbol)).toStrictEqual(['A']);
    });

    it('rejects when any chunk request fails (Promise.all semantics)', async () => {
      mockedHandleFetch
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('chunk failed'));

      await expect(
        getTokens(makeIds(GET_TOKENS_BATCH_SIZE + 1)),
      ).rejects.toThrow('chunk failed');
    });
  });
});
