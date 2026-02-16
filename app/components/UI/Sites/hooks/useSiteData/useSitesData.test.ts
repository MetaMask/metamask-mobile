import { renderHook, waitFor } from '@testing-library/react-native';
import { useSitesData, clearSitesCache } from './useSitesData';
import Logger from '../../../../../util/Logger';

// Mock dependencies
jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

global.fetch = jest.fn();

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
    clearSitesCache();
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

      // Portfolio is prepended to the list
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

    it('should use the default limit of 100', async () => {
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
          `https://nft.api.cx.metamask.io/explore/sites?limit=100&ts=${mockDateNow}`,
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

      // Portfolio is first, so check second site
      expect(result.current.sites[1].displayUrl).toBe('example.com');
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

      // Portfolio is first, so check second site
      expect(result.current.sites[1]).toEqual({
        id: '1',
        name: 'Test Site',
        url: 'https://test.com',
        displayUrl: 'test.com',
        logoUrl: undefined,
        featured: undefined,
      });
    });

    it('should not duplicate Portfolio when API already returns it', async () => {
      const responseWithPortfolio = {
        dapps: [
          {
            id: 'api-portfolio',
            name: 'Portfolio',
            website: 'https://portfolio.metamask.io',
            logoSrc: 'https://api-logo.png',
            featured: true,
          },
          {
            id: '2',
            name: 'Other Site',
            website: 'https://other.com',
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseWithPortfolio,
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not duplicate - only 2 sites
      expect(result.current.sites).toHaveLength(2);
      // Should keep API's version of Portfolio
      expect(result.current.sites[0].id).toBe('api-portfolio');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors and show Portfolio as fallback', async () => {
      const networkError = new Error('Network error');
      (fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Portfolio should be shown as fallback on error
      expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
      expect(result.current.error).toEqual(networkError);
      expect(Logger.error).toHaveBeenCalledWith(
        networkError,
        '[useSitesData] Error fetching sites',
      );
    });

    it('should handle HTTP error responses and show Portfolio as fallback', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useSitesData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Portfolio should be shown as fallback on error
      expect(result.current.sites).toEqual([EXPECTED_PORTFOLIO_SITE]);
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

      // Portfolio is first, so check second site for URL extraction
      expect(result.current.sites[1].displayUrl).toBe('not-a-valid-url');
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

      // Portfolio is first, so check second site
      expect(result.current.sites[1].displayUrl).toBe('example.com');
    });
  });

  describe('Hook Lifecycle', () => {
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
