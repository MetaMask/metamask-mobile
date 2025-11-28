import { renderHook, waitFor } from '@testing-library/react-native';
import { useSitesData } from './useSitesData';
import Logger from '../../../../../util/Logger';

// Mock dependencies
jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

global.fetch = jest.fn();

describe('useSitesData', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Successful Data Fetching', () => {
    it('should fetch and transform sites data successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      });

      const { result } = renderHook(() => useSitesData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.sites).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toHaveLength(2);
      expect(result.current.sites[0]).toEqual({
        id: '1',
        name: 'MetaMask',
        url: 'https://www.metamask.io',
        displayUrl: 'metamask.io',
        logoUrl: 'https://example.com/metamask.png',
        featured: true,
      });
      expect(result.current.error).toBeNull();
    });

    it('should use default limit of 100', async () => {
      const mockDateNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dapps: [] }),
      });

      renderHook(() => useSitesData());

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `https://portfolio.api.cx.metamask.io/explore/sites?limit=100&ts=${mockDateNow}`,
        );
      });

      jest.restoreAllMocks();
    });

    it('should use custom limit when provided', async () => {
      const mockDateNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dapps: [] }),
      });

      renderHook(() => useSitesData(undefined, 50));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          `https://portfolio.api.cx.metamask.io/explore/sites?limit=50&ts=${mockDateNow}`,
        );
      });

      jest.restoreAllMocks();
    });

    it('should strip www from display URL', async () => {
      const response = {
        dapps: [
          {
            id: '1',
            name: 'Test',
            website: 'https://www.example.com',
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites[0].displayUrl).toBe('example.com');
    });

    it('should handle sites without optional fields', async () => {
      const minimalResponse = {
        dapps: [
          {
            id: '1',
            name: 'Test Site',
            website: 'https://test.com',
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => minimalResponse,
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites[0]).toEqual({
        id: '1',
        name: 'Test Site',
        url: 'https://test.com',
        displayUrl: 'test.com',
        logoUrl: undefined,
        featured: undefined,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toEqual([]);
      expect(result.current.error).toEqual(networkError);
      expect(Logger.error).toHaveBeenCalledWith(
        networkError,
        '[useSitesData] Error fetching sites',
      );
    });

    it('should handle HTTP error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites).toEqual([]);
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Failed to fetch sites');
    });

    it('should handle non-Error throw values', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('String error');
    });
  });

  describe('URL Extraction', () => {
    it('should handle invalid URLs gracefully', async () => {
      const response = {
        dapps: [
          {
            id: '1',
            name: 'Test',
            website: 'not-a-valid-url',
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites[0].displayUrl).toBe('not-a-valid-url');
    });

    it('should extract hostname from URLs with paths', async () => {
      const response = {
        dapps: [
          {
            id: '1',
            name: 'Test',
            website: 'https://example.com/path/to/page',
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sites[0].displayUrl).toBe('example.com');
    });
  });

  describe('Hook Lifecycle', () => {
    it('should refetch data when limit changes', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ dapps: [] }),
      });

      const { rerender } = renderHook(
        ({ limit }) => useSitesData(undefined, limit),
        {
          initialProps: { limit: 10 },
        },
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      rerender({ limit: 20 });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('limit=20'),
      );
    });

    it('should include timestamp to prevent caching', async () => {
      const mockDateNow = 9999999999;
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dapps: [] }),
      });

      renderHook(() => useSitesData());

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(`ts=${mockDateNow}`),
        );
      });

      jest.restoreAllMocks();
    });
  });
});
