import { renderHook, waitFor } from '@testing-library/react-native';
import { useSitesData } from './useSitesData';
import Logger from '../../../../../util/Logger';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useSitesData', () => {
  const mockApiResponse = {
    dapps: [
      {
        id: '1',
        name: 'Uniswap',
        website: 'https://app.uniswap.org',
        logoSrc: 'https://example.com/uniswap.png',
        featured: true,
      },
      {
        id: '2',
        name: 'OpenSea',
        website: 'https://opensea.io',
        logoSrc: 'https://example.com/opensea.png',
        featured: false,
      },
      {
        id: '3',
        name: 'Aave Protocol',
        website: 'https://aave.com',
        logoSrc: 'https://example.com/aave.png',
        featured: true,
      },
    ],
  };

  const expectedSites: SiteData[] = [
    {
      id: '1',
      name: 'Uniswap',
      url: 'https://app.uniswap.org',
      displayUrl: 'app.uniswap.org',
      logoUrl: 'https://example.com/uniswap.png',
      featured: true,
    },
    {
      id: '2',
      name: 'OpenSea',
      url: 'https://opensea.io',
      displayUrl: 'opensea.io',
      logoUrl: 'https://example.com/opensea.png',
      featured: false,
    },
    {
      id: '3',
      name: 'Aave Protocol',
      url: 'https://aave.com',
      displayUrl: 'aave.com',
      logoUrl: 'https://example.com/aave.png',
      featured: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);
  });

  it('fetches and transforms sites data on mount', async () => {
    const { result } = renderHook(() => useSitesData({ limit: 100 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sites).toEqual(expectedSites);
    expect(result.current.error).toBeNull();
  });

  describe('filtering sites by query', () => {
    it('returns all sites when query is empty or whitespace', async () => {
      const { result: result1 } = renderHook(() =>
        useSitesData({ searchQuery: '' }),
      );
      const { result: result2 } = renderHook(() =>
        useSitesData({ searchQuery: '   ' }),
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      expect(result1.current.sites).toEqual(expectedSites);
      expect(result2.current.sites).toEqual(expectedSites);
    });

    it('filters sites by name case-insensitively', async () => {
      const { result } = renderHook(() =>
        useSitesData({ searchQuery: 'uniswap' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(1);
      expect(result.current.sites[0].name).toBe('Uniswap');
    });

    it('filters sites by displayUrl case-insensitively', async () => {
      const { result } = renderHook(() =>
        useSitesData({ searchQuery: 'opensea' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(1);
      expect(result.current.sites[0].name).toBe('OpenSea');
    });

    it('filters sites by url case-insensitively', async () => {
      const { result } = renderHook(() =>
        useSitesData({ searchQuery: 'aave.com' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(1);
      expect(result.current.sites[0].name).toBe('Aave Protocol');
    });

    it('filters sites by partial matches', async () => {
      const { result } = renderHook(() => useSitesData({ searchQuery: 'sea' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(1);
      expect(result.current.sites[0].name).toBe('OpenSea');
    });

    it('returns empty array when no sites match query', async () => {
      const { result } = renderHook(() =>
        useSitesData({ searchQuery: 'NonExistent' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(0);
    });

    it('trims whitespace from query before filtering', async () => {
      const { result } = renderHook(() =>
        useSitesData({ searchQuery: '  Uniswap  ' }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(1);
      expect(result.current.sites[0].name).toBe('Uniswap');
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSitesData({ limit: 100 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sites).toEqual([]);
    expect(result.current.error).toEqual(new Error('Network error'));
    expect(Logger.error).toHaveBeenCalled();
  });

  it('refetches data when refetch is called', async () => {
    const { result } = renderHook(() => useSitesData({ limit: 100 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
