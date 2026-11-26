import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import {
  useSitesData,
  matchesSiteQuery,
  extractFullDisplayUrl,
} from './useSitesData';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';
import Logger from '../../../../../util/Logger';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../../../../util/deviceCapability';
import {
  getLatencySnapshot,
  getLatencyThresholds,
} from '../../../../../util/deviceCapability/latencyStore';
import {
  HttpError,
  InvalidResponseError,
  NetworkTimeoutError,
} from '../../../../../core/Networking/errors';

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
  getNetworkTierSnapshot: jest.fn(),
}));
jest.mock('../../../../../util/deviceCapability/latencyStore', () => ({
  getLatencySnapshot: jest.fn(),
  getLatencyThresholds: jest.fn(),
}));

global.fetch = jest.fn();

const HUNG_MS = 8_000;

const EXPECTED_PORTFOLIO_SITE = {
  id: 'metamask-portfolio',
  name: 'MetaMask Portfolio',
  url: 'https://portfolio.metamask.io',
  displayUrl: 'portfolio.metamask.io',
  logoUrl:
    'https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/logo.png',
  featured: true,
  logoNeedsPadding: true,
};

const mockApiResponse = {
  dapps: [
    {
      id: '1',
      name: 'MetaMask',
      website: 'https://www.metamask.io',
      logoSrc: 'https://example.com/metamask.png',
      featured: true,
    },
    {
      id: '2',
      name: 'OpenSea',
      website: 'https://opensea.io',
      logoSrc: 'https://example.com/opensea.png',
      featured: false,
    },
  ],
};

let client: QueryClient;
const wrapper = ({ children }: React.PropsWithChildren): React.JSX.Element =>
  React.createElement(QueryClientProvider, { client }, children);

function renderUseSitesData(
  searchQuery?: string,
): ReturnType<typeof renderHook<ReturnType<typeof useSitesData>, unknown>> {
  return renderHook(() => useSitesData(searchQuery), { wrapper });
}

function respondWith(body: unknown): void {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

function givenConnection(
  network: ReturnType<typeof getNetworkTierSnapshot>,
): void {
  jest.mocked(getNetworkTierSnapshot).mockReturnValue(network);
}

// Never settles, even when aborted: a request stalled below fetch.
function stallRequests(): AbortSignal[] {
  const signals: AbortSignal[] = [];
  jest.mocked(fetch).mockImplementation(async (_url, init) => {
    if (init?.signal) signals.push(init.signal);
    return new Promise<Response>(() => undefined);
  });
  return signals;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Same staleTime as the app's ReactQueryService.
  client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60_000 } },
  });
  jest.mocked(getHardwareTier).mockReturnValue('HIGH');
  givenConnection('WIFI');
  jest.mocked(getLatencySnapshot).mockReturnValue('OK');
  jest
    .mocked(getLatencyThresholds)
    .mockReturnValue({ hungMs: HUNG_MS, slowMs: 2_500 });
});

afterEach(() => {
  client.clear();
  onlineManager.setOnline(true);
  jest.useRealTimers();
});

describe('useSitesData', () => {
  describe('loading', () => {
    it('shows no sites while the first request runs, then the API sites after Portfolio', async () => {
      respondWith(mockApiResponse);

      const { result } = renderUseSitesData();

      expect(result.current.isLoading).toBe(true);
      expect(result.current.sites).toEqual([]);
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.sites).toHaveLength(3);
      expect(result.current.sites[0]).toEqual(EXPECTED_PORTFOLIO_SITE);
      expect(result.current.sites[1]).toEqual({
        id: '1',
        name: 'MetaMask',
        url: 'https://www.metamask.io',
        displayUrl: 'metamask.io',
        logoUrl: 'https://example.com/metamask.png',
        featured: true,
      });
      expect(result.current.error).toBeNull();
    });

    it('requests 100 sites from the NFT API', async () => {
      respondWith({ dapps: [] });

      renderUseSitesData();

      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          'https://nft.api.cx.metamask.io/explore/sites?limit=100',
          expect.anything(),
        ),
      );
    });
  });

  describe('caching', () => {
    it('serves the next screen from the cache without a new request', async () => {
      respondWith(mockApiResponse);
      const first = renderUseSitesData();
      await waitFor(() => expect(first.result.current.isLoading).toBe(false));
      first.unmount();
      // Past the app's 5 min staleTime, within the 24 h HIGH cache.
      act(() => jest.advanceTimersByTime(60 * 60_000));

      const { result } = renderUseSitesData();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.sites).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('refetch bypasses the cache', async () => {
      respondWith(mockApiResponse);
      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.refetch());

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    });

    it('keeps the cached sites when a refetch fails', async () => {
      respondWith(mockApiResponse);
      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      jest.mocked(fetch).mockRejectedValue(new TypeError('Network error'));

      act(() => result.current.refetch());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });

      expect(result.current.error).toBeInstanceOf(TypeError);
      expect(result.current.sites).toHaveLength(3);
    });
  });

  describe('retries', () => {
    it.each([
      ['WIFI', 3],
      ['SLOW_CELLULAR', 2],
    ] as const)(
      'on %s tries %i times, then shows Portfolio alone and logs once',
      async (network, attempts) => {
        givenConnection(network);
        const networkError = new TypeError('Network error');
        jest.mocked(fetch).mockRejectedValue(networkError);

        const { result } = renderUseSitesData();
        await act(async () => {
          await jest.advanceTimersByTimeAsync(10_000);
        });

        expect(fetch).toHaveBeenCalledTimes(attempts);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(networkError);
        expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
        expect(Logger.error).toHaveBeenCalledTimes(1);
        expect(Logger.error).toHaveBeenCalledWith(
          networkError,
          '[useSitesData] Error fetching sites',
        );
      },
    );

    it('recovers when a retry succeeds', async () => {
      jest
        .mocked(fetch)
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockApiResponse,
        } as Response);

      const { result } = renderUseSitesData();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.current.sites).toHaveLength(3);
      expect(result.current.error).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it.each([
      [503, 3],
      [404, 1],
    ])(
      'on HTTP %i tries %i times, then shows Portfolio alone',
      async (status, attempts) => {
        jest.mocked(fetch).mockResolvedValue({ ok: false, status } as Response);

        const { result } = renderUseSitesData();
        await act(async () => {
          await jest.advanceTimersByTimeAsync(10_000);
        });

        expect(fetch).toHaveBeenCalledTimes(attempts);
        expect(result.current.error).toEqual(new HttpError(status));
        expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
      },
    );

    it.each([
      ['no dapps list', { sites: [] }],
      ['a dapp without a website', { dapps: [{ id: '1', name: 'No URL' }] }],
    ])(
      'rejects a body with %s once, and shows Portfolio alone',
      async (_, body) => {
        respondWith(body);

        const { result } = renderUseSitesData();
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.error).toBeInstanceOf(InvalidResponseError);
        expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
      },
    );
  });

  describe('timeouts', () => {
    it('aborts a stalled request at the hung threshold and retries it', async () => {
      const signals = stallRequests();

      renderUseSitesData();
      await waitFor(() => expect(signals).toHaveLength(1));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(HUNG_MS);
      });

      expect(signals[0].aborted).toBe(true);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('leaves loading with NetworkTimeoutError and Portfolio once every attempt timed out', async () => {
      givenConnection('SLOW_CELLULAR');
      stallRequests();

      const { result } = renderUseSitesData();
      expect(result.current.isLoading).toBe(true);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3 * HUNG_MS);
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(NetworkTimeoutError);
      expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
    });
  });

  describe('offline', () => {
    it('does not request while offline, shows Portfolio, and loads when back online', async () => {
      onlineManager.setOnline(false);
      respondWith(mockApiResponse);

      const { result } = renderUseSitesData();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);

      act(() => onlineManager.setOnline(true));

      await waitFor(() => expect(result.current.sites).toHaveLength(3));
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps the cached sites while offline', async () => {
      respondWith(mockApiResponse);
      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => onlineManager.setOnline(false));
      // Offline, the refetch pauses instead of failing.
      act(() => result.current.refetch());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
      expect(result.current.sites).toHaveLength(3);
    });
  });

  describe('mapping', () => {
    it('strips www from the display URL and keeps sites without optional fields', async () => {
      respondWith({
        dapps: [{ id: '1', name: 'Test', website: 'https://www.example.com' }],
      });

      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sites[1]).toEqual({
        id: '1',
        name: 'Test',
        url: 'https://www.example.com',
        displayUrl: 'example.com',
        logoUrl: undefined,
        featured: undefined,
      });
    });

    it('keeps the raw website for invalid URLs and the hostname for URLs with paths', async () => {
      respondWith({
        dapps: [
          { id: '1', name: 'Bad', website: 'not-a-valid-url' },
          { id: '2', name: 'Path', website: 'https://example.com/a/b' },
        ],
      });

      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sites[1].displayUrl).toBe('not-a-valid-url');
      expect(result.current.sites[2].displayUrl).toBe('example.com');
    });

    it('does not duplicate Portfolio when the API already returns it', async () => {
      respondWith({
        dapps: [
          {
            id: 'api-portfolio',
            name: 'Portfolio',
            website: 'https://portfolio.metamask.io',
          },
          { id: '2', name: 'Other Site', website: 'https://other.com' },
        ],
      });

      const { result } = renderUseSitesData();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sites).toHaveLength(2);
      expect(result.current.sites[0].id).toBe('api-portfolio');
    });

    it('filters the sites by the search query', async () => {
      respondWith(mockApiResponse);

      const { result } = renderUseSitesData('opensea');
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.sites.map((site) => site.id)).toEqual(['2']);
    });
  });
});

describe('extractFullDisplayUrl', () => {
  it('strips the protocol and keeps path + query', () => {
    expect(extractFullDisplayUrl('https://app.uniswap.org/swap?chain=1')).toBe(
      'app.uniswap.org/swap?chain=1',
    );
  });

  it('strips www prefix', () => {
    expect(extractFullDisplayUrl('https://www.example.com/path')).toBe(
      'example.com/path',
    );
  });

  it('returns just the hostname when there is no path', () => {
    expect(extractFullDisplayUrl('https://uniswap.org')).toBe('uniswap.org');
  });

  it('returns the raw string for invalid URLs', () => {
    expect(extractFullDisplayUrl('not a url')).toBe('not a url');
  });
});

describe('matchesSiteQuery', () => {
  const site: SiteData = {
    id: '1',
    name: 'Uniswap',
    url: 'https://uniswap.org/swap',
    displayUrl: 'uniswap.org',
  };

  it('matches case-insensitively against the name', () => {
    expect(matchesSiteQuery(site, 'UNI')).toBe(true);
  });

  it('matches against the displayUrl', () => {
    expect(matchesSiteQuery(site, 'uniswap.org')).toBe(true);
  });

  it('matches a path fragment present only in the full url', () => {
    expect(matchesSiteQuery(site, '/swap')).toBe(true);
  });

  it('returns false when no field contains the query', () => {
    expect(matchesSiteQuery(site, 'opensea')).toBe(false);
  });
});
