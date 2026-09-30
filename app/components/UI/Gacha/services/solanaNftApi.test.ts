import type { SolanaNftItem } from './solanaNftApi.schemas';
import { createSolanaNftApi, SOLANA_NFT_API_MAX_PAGES } from './solanaNftApi';

const ADDRESS = '66cvcbcryJMFmYPKwdGhUnJn9hZTxPoLMEb378PEqRFR';
const BASE_URL = 'https://nft.test';

const nftApiCoreItem: SolanaNftItem = {
  token_address: 'CoreMint',
  isSpam: true,
  nft_token: {
    token_standard: 'MplCoreAsset',
    name: 'Core NFT',
    onchain_collection_address: 'CoreCollection',
  },
};
const nftApiPnftItem: SolanaNftItem = {
  token_address: 'PnftMint',
  isSpam: false,
  nft_token: {
    token_standard: 'ProgrammableNonFungible',
    name: 'Programmable NFT',
    onchain_collection_address: 'PnftCollection',
  },
};

type FetchMock = jest.Mock<Promise<Response>, Parameters<typeof fetch>>;

const createResponse = (httpStatus: number, body?: unknown): Response =>
  ({
    ok: httpStatus >= 200 && httpStatus < 300,
    status: httpStatus,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }) as unknown as Response;

const page = (items: unknown[], cursor: string | null = null) =>
  createResponse(200, { items, cursor, error: null });

const setup = (responses: (Response | Error)[] = []) => {
  const fetchMock: FetchMock = jest.fn();
  responses.forEach((response) =>
    response instanceof Error
      ? fetchMock.mockRejectedValueOnce(response)
      : fetchMock.mockResolvedValueOnce(response),
  );
  const api = createSolanaNftApi({
    baseUrl: `${BASE_URL}/`,
    fetch: fetchMock,
    timeoutMs: 50,
  });
  return { api, fetchMock };
};

const getUrl = (fetchMock: FetchMock, index = 0): URL =>
  new URL(String(fetchMock.mock.calls[index][0]));

describe('createSolanaNftApi', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTokens', () => {
    it('requests the solana tokens with the Version header', async () => {
      const { api, fetchMock } = setup([page([nftApiCoreItem])]);

      await api.getTokens({ address: ADDRESS });

      const url = getUrl(fetchMock);
      expect(`${url.origin}${url.pathname}`).toBe(
        `${BASE_URL}/users/${ADDRESS}/solana-tokens`,
      );
      expect(url.search).toBe('');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: 'GET',
        headers: { Accept: 'application/json', Version: '1' },
      });
    });

    it('returns every collection and preserves spam markers', async () => {
      const { api } = setup([page([nftApiCoreItem, nftApiPnftItem])]);

      const items = await api.getTokens({ address: ADDRESS });

      expect(items.map((item) => item.token_address)).toStrictEqual([
        nftApiCoreItem.token_address,
        nftApiPnftItem.token_address,
      ]);
      expect(items[0].isSpam).toBe(true);
    });

    it('coerces numeric and boolean NFT attributes to strings', async () => {
      const { api } = setup([
        page([
          {
            ...nftApiCoreItem,
            nft_token: {
              attributes: [
                { key: 'Year', value: 2024 },
                { key: 'Autographed', value: false },
              ],
            },
          },
        ]),
      ]);

      const [item] = await api.getTokens({ address: ADDRESS });

      expect(item.nft_token.attributes).toEqual([
        { key: 'Year', value: '2024' },
        { key: 'Autographed', value: 'false' },
      ]);
    });

    it('follows the cursor until the last page', async () => {
      const { api, fetchMock } = setup([
        page([nftApiCoreItem], 'cursor-1'),
        page([nftApiPnftItem], null),
      ]);

      const items = await api.getTokens({ address: ADDRESS });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getUrl(fetchMock, 1).searchParams.get('cursor')).toBe('cursor-1');
      expect(items).toHaveLength(2);
    });

    it('rejects partial results when the API repeats a cursor', async () => {
      const { api, fetchMock } = setup([
        page([nftApiCoreItem], 'cursor-1'),
        page([nftApiPnftItem], 'cursor-1'),
      ]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
        retryable: true,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rejects partial results after the maximum number of pages', async () => {
      const fetchMock: FetchMock = jest.fn(async (_input, _init) =>
        page([], `cursor-${fetchMock.mock.calls.length}`),
      );
      const api = createSolanaNftApi({ baseUrl: BASE_URL, fetch: fetchMock });

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
        retryable: true,
      });

      expect(fetchMock).toHaveBeenCalledTimes(SOLANA_NFT_API_MAX_PAGES);
    });

    it('returns each mint once', async () => {
      const { api } = setup([
        page([nftApiCoreItem], 'cursor-1'),
        page([nftApiCoreItem], null),
      ]);

      const items = await api.getTokens({ address: ADDRESS });

      expect(items).toHaveLength(1);
    });

    it('rejects a collection containing a malformed item', async () => {
      const { api } = setup([
        page([{ token_address: 42 }, 'garbage', nftApiCoreItem]),
      ]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('rejects earlier pages when a later page contains a malformed item', async () => {
      const { api } = setup([
        page([nftApiCoreItem], 'cursor-1'),
        page([{ ...nftApiPnftItem, nft_token: null }]),
      ]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('busts the cache on every page when asked', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234);
      const { api, fetchMock } = setup([page([], 'cursor-1'), page([], null)]);

      await api.getTokens({
        address: ADDRESS,
        bypassCache: true,
      });

      expect(getUrl(fetchMock, 0).searchParams.get('ts')).toBe('1234');
      expect(getUrl(fetchMock, 1).searchParams.get('ts')).toBe('1234');
    });

    it.each([
      [429, 'RATE_LIMITED', true],
      [500, 'UNKNOWN', true],
      [404, 'UNKNOWN', false],
    ] as const)(
      'maps HTTP %s to %s (retryable: %s)',
      async (httpStatus, code, retryable) => {
        const { api } = setup([createResponse(httpStatus, { error: 'Nope' })]);

        await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject(
          {
            name: 'HttpError',
            code,
            retryable,
            status: httpStatus,
            message: 'GET /solana-tokens: Nope',
          },
        );
      },
    );

    it('rejects a partial answer carrying an error', async () => {
      const { api } = setup([
        createResponse(200, {
          items: [nftApiCoreItem],
          cursor: null,
          error: 'upstream timeout',
        }),
      ]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'UNKNOWN',
        retryable: true,
        message: 'GET /solana-tokens: upstream timeout',
      });
    });

    it('rejects an invalid payload', async () => {
      const { api } = setup([createResponse(200, { cursor: null })]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('maps a network failure to a retryable NETWORK_ERROR', async () => {
      const { api } = setup([new TypeError('Network request failed')]);

      await expect(api.getTokens({ address: ADDRESS })).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        retryable: true,
      });
    });
  });
});
