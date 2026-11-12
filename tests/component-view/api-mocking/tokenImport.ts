/**
 * Token import HTTP mocks for SearchTokenAutocomplete component view tests.
 * Intercepts:
 * - GET https://tokens.api.cx.metamask.io/v3/chains/{caip}/assets (full catalog)
 * - GET https://token.api.cx.metamask.io/tokens/search (typed search)
 * - GET https://token.api.cx.metamask.io/v3/tokens/trending (empty fallback)
 *
 * Pagination replies depend on the `after` query param, which the shared
 * static fetch path stub cannot express, so requests are answered through a
 * fetch spy. Nock mirrors the same payloads for the framework's nock lifecycle.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { disableNetConnect, teardownNock } from './nockHelpers';

const TOKEN_API_ORIGIN = 'https://token.api.cx.metamask.io';
const TOKENS_API_ORIGIN = 'https://tokens.api.cx.metamask.io';
const TRON_CAIP_CHAIN_ID = 'tron:728126428';
export const TRON_CATALOG_PATH = `/v3/chains/${TRON_CAIP_CHAIN_ID}/assets`;
const TRENDING_PATH = '/v3/tokens/trending';
const SEARCH_PATH = '/tokens/search';

export const TRON_CATALOG_FIRST_PAGE = {
  data: [
    {
      assetId: `${TRON_CAIP_CHAIN_ID}/slip44:195`,
      symbol: 'TRX',
      name: 'TRON',
      decimals: 6,
    },
    {
      assetId: `${TRON_CAIP_CHAIN_ID}/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
      symbol: 'CATALOG',
      name: 'Catalog Token',
      decimals: 6,
    },
  ],
  count: 2,
  totalCount: 3,
  pageInfo: { hasNextPage: true, endCursor: 'catalog-cursor' },
};

export const TRON_CATALOG_NEXT_PAGE = {
  data: [
    {
      assetId: `${TRON_CAIP_CHAIN_ID}/trc20:TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7`,
      symbol: 'CATALOG_NEXT',
      name: 'Next Catalog Token',
      decimals: 6,
    },
  ],
  count: 1,
  totalCount: 3,
  pageInfo: { hasNextPage: false, endCursor: null },
};

export const TRON_SEARCH_FIRST_PAGE = {
  data: [
    {
      assetId: `${TRON_CAIP_CHAIN_ID}/trc20:TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR`,
      symbol: 'SEARCHED',
      name: 'Searched Token',
      decimals: 6,
    },
  ],
  count: 1,
  totalCount: 2,
  pageInfo: { hasNextPage: true, endCursor: 'search-cursor' },
};

export const TRON_SEARCH_NEXT_PAGE = {
  data: [
    {
      assetId: `${TRON_CAIP_CHAIN_ID}/trc20:TSepTember9Qb1rRpS5CbWLmNMxXBjyFoyd`,
      symbol: 'SEARCHED_NEXT',
      name: 'Next Searched Token',
      decimals: 6,
    },
  ],
  count: 1,
  totalCount: 2,
  pageInfo: { hasNextPage: false, endCursor: null },
};

export const TRON_TRENDING_FALLBACK = [
  {
    assetId: `${TRON_CAIP_CHAIN_ID}/trc20:TKzF3fJDz2bQXjBpFfNf4gLk2zG3jY8eUQ`,
    symbol: 'TRENDING',
    name: 'Trending Fallback Token',
    decimals: 6,
    price: '1.00',
    aggregatedUsdVolume: 500000,
    marketCap: 1000000,
    priceChangePct: { h24: '1.0' },
  },
];

let requests: string[] = [];

export const getTokenImportRequests = (): string[] => requests;

const isAfterFirstPage = (url: string): boolean =>
  new URL(url).searchParams.has('after');

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

export function setupTokenImportApiMock({
  catalogStatus = 200,
}: {
  catalogStatus?: number;
} = {}): void {
  jest.mocked(globalThis.fetch).mockRestore?.();
  requests = [];
  disableNetConnect();

  nock(TOKENS_API_ORIGIN)
    .get(TRON_CATALOG_PATH)
    .query(true)
    .reply(catalogStatus, (url: string) =>
      catalogStatus >= 400
        ? { error: 'catalog unavailable' }
        : isAfterFirstPage(url)
          ? TRON_CATALOG_NEXT_PAGE
          : TRON_CATALOG_FIRST_PAGE,
    )
    .persist();
  nock(TOKEN_API_ORIGIN)
    .get(TRENDING_PATH)
    .query(true)
    .reply(200, TRON_TRENDING_FALLBACK)
    .persist();
  nock(TOKEN_API_ORIGIN)
    .get(SEARCH_PATH)
    .query(true)
    .reply(200, (url: string) =>
      isAfterFirstPage(url) ? TRON_SEARCH_NEXT_PAGE : TRON_SEARCH_FIRST_PAGE,
    )
    .persist();

  jest.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    requests.push(url);

    if (url.includes(TRON_CATALOG_PATH)) {
      return jsonResponse(
        catalogStatus >= 400
          ? { error: 'catalog unavailable' }
          : isAfterFirstPage(url)
            ? TRON_CATALOG_NEXT_PAGE
            : TRON_CATALOG_FIRST_PAGE,
        catalogStatus,
      );
    }
    if (url.includes(SEARCH_PATH)) {
      return jsonResponse(
        isAfterFirstPage(url) ? TRON_SEARCH_NEXT_PAGE : TRON_SEARCH_FIRST_PAGE,
      );
    }
    if (url.includes(TRENDING_PATH)) {
      return jsonResponse(TRON_TRENDING_FALLBACK);
    }

    return jsonResponse({ data: [] });
  });
}

export function clearTokenImportApiMocks(): void {
  jest.mocked(globalThis.fetch).mockRestore?.();
  requests = [];
  teardownNock();
}
