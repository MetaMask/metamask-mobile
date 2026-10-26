import type { CaipAssetType } from '@metamask/utils';
import AppConstants from '../../../../../../core/AppConstants';
import { TOKEN_HOLDERS_FIXTURE } from './tokenHolders.fixture';
import {
  EMPTY_HOLDERS_PAGE,
  buildTokenHoldersQueryKey,
  fetchTokenHoldersPage,
  getTokenHoldersNextPageParam,
  tokenHoldersUrl,
  type TokenHoldersPage,
} from './tokenHoldersQueries';

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;
const otherAssetId =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' as CaipAssetType;

const host = AppConstants.SOCIAL_API_URL.replace(/\/$/, '');

const mockBearerToken = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        // Mirrors the real messenger: aliasing `.call` detaches `this` and
        // breaks action lookup, so the caller has to keep the member access.
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockBearerToken(...args);
      },
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const respondWith = (
  body: unknown,
  { status = 200, ok }: { status?: number; ok?: boolean } = {},
) => {
  mockFetch.mockResolvedValue({
    ok: ok ?? status < 400,
    status,
    json: () => Promise.resolve(body),
  });
};

const page = (items: unknown[], hasMore = false): TokenHoldersPage =>
  ({ items, pagination: { hasMore } }) as TokenHoldersPage;

describe('tokenHoldersUrl', () => {
  it('percent-encodes the CAIP-19, whose slash would read as a path segment', () => {
    expect(tokenHoldersUrl(assetId)).toBe(
      `${host}/api/v1/positions/${encodeURIComponent(assetId)}`,
    );
    expect(tokenHoldersUrl(otherAssetId)).not.toContain('/token:');
  });

  it('omits the page parameter on the first page and sends it after that', () => {
    expect(tokenHoldersUrl(assetId, { page: 1 })).not.toContain('page=');
    expect(tokenHoldersUrl(assetId, { page: 3 })).toContain('?page=3');
  });
});

describe('buildTokenHoldersQueryKey', () => {
  it('keys on the asset', () => {
    expect(buildTokenHoldersQueryKey(assetId)).toStrictEqual([
      'TokenDetailsHolders',
      assetId,
    ]);
  });

  it('separates two assets', () => {
    expect(buildTokenHoldersQueryKey(otherAssetId)).not.toStrictEqual(
      buildTokenHoldersQueryKey(assetId),
    );
  });
});

describe('fetchTokenHoldersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBearerToken.mockResolvedValue('a-jwt');
  });

  it('sends the viewer bearer token, as the other social GETs do', async () => {
    respondWith(page([]));

    await fetchTokenHoldersPage(assetId, {});

    expect(mockBearerToken).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: 'Bearer a-jwt' },
      }),
    );
  });

  it('still asks the public route when the viewer is signed out', async () => {
    // The route is public, so a missing token must not swallow the request.
    mockBearerToken.mockRejectedValue(new Error('no identity'));
    respondWith(page([]));

    await fetchTokenHoldersPage(assetId, {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    );
  });

  it('omits the header rather than sending "Bearer undefined"', async () => {
    mockBearerToken.mockResolvedValue(undefined);
    respondWith(page([]));

    await fetchTokenHoldersPage(assetId, {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    );
  });

  it('requests the holders route for the asset', async () => {
    respondWith(page(TOKEN_HOLDERS_FIXTURE.items.slice(0, 2)));

    const result = await fetchTokenHoldersPage(assetId, {});

    expect(mockFetch).toHaveBeenCalledWith(
      `${host}/api/v1/positions/${encodeURIComponent(assetId)}`,
      expect.objectContaining({ signal: undefined }),
    );
    expect(result.items).toHaveLength(2);
  });

  it('passes the abort signal so a dropped page stops its request', async () => {
    respondWith(page([]));
    const signal = new AbortController().signal;

    await fetchTokenHoldersPage(assetId, { signal });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal }),
    );
  });

  it('reports no holders on 404: the cluster has no route, which is not an error', async () => {
    // The route is live on dev and not yet on prod. An empty list hides the
    // tab; an error would offer a retry for something that cannot succeed.
    respondWith(null, { status: 404 });

    await expect(fetchTokenHoldersPage(assetId, {})).resolves.toStrictEqual(
      EMPTY_HOLDERS_PAGE,
    );
  });

  it.each([401, 500])(
    'throws on %s so the tab can offer a retry',
    async (status) => {
      respondWith(null, { status });

      await expect(fetchTokenHoldersPage(assetId, {})).rejects.toThrow(
        `status ${status}`,
      );
    },
  );

  it('survives a body with no items array', async () => {
    respondWith({ pagination: { hasMore: false } });

    const result = await fetchTokenHoldersPage(assetId, {});

    expect(result.items).toStrictEqual([]);
  });

  it('keeps the pagination the route reported', async () => {
    respondWith(page([], true));

    const result = await fetchTokenHoldersPage(assetId, {});

    expect(result.pagination).toStrictEqual({ hasMore: true });
  });
});

describe('getTokenHoldersNextPageParam', () => {
  it('asks for the page after the ones already loaded while more remain', () => {
    expect(getTokenHoldersNextPageParam(page([], true), [page([], true)])).toBe(
      2,
    );
    expect(
      getTokenHoldersNextPageParam(page([], true), [
        page([], true),
        page([], true),
      ]),
    ).toBe(3);
  });

  it.each([
    ['hasMore false', page([], false)],
    ['no pagination', { items: [] } as TokenHoldersPage],
  ])('stops on %s', (_label, lastPage) => {
    expect(getTokenHoldersNextPageParam(lastPage, [lastPage])).toBeUndefined();
  });
});
