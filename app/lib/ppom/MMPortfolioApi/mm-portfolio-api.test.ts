import AppConstants from '../../../core/AppConstants';
import {
  getMMPortfolioHealthCheck,
  getMMPortfolioTokensSearch,
} from './mm-portfolio-api';
import {
  createMockTokensResponse,
  mockSuccessfulResponse,
  mockFailedResponse,
} from './test-utils';

describe('MM Portfolio API', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = fetchMock;
  });

  describe('getMMPortfolioHealthCheck', () => {
    const mockUrl = 'https://example.com/api';
    let originalUrl: string;

    beforeEach(() => {
      originalUrl = AppConstants.PORTFOLIO_API.URL;
      Object.defineProperty(AppConstants.PORTFOLIO_API, 'URL', {
        value: mockUrl,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(AppConstants.PORTFOLIO_API, 'URL', {
        value: originalUrl,
        writable: true,
      });
    });

    it('sends GET request and returns response', async () => {
      const mockResponse = { status: 'ok' };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await getMMPortfolioHealthCheck();

      expect(response).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`${mockUrl}/`, undefined);
    });

    it('throws an error if response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      await expect(getMMPortfolioHealthCheck()).rejects.toThrow(
        'MM Portfolio API request failed with status: 500',
      );
    });

    it('throws an error if URL is not set', async () => {
      Object.defineProperty(AppConstants.PORTFOLIO_API, 'URL', {
        value: undefined,
        writable: true,
      });

      await expect(getMMPortfolioHealthCheck()).rejects.toThrow(
        'MM Portfolio API URL is not set',
      );
    });
  });

  describe('getMMPortfolioTokensSearch', () => {
    const mockUrl = 'https://example.com/api';
    let originalUrl: string;

    beforeEach(() => {
      originalUrl = AppConstants.PORTFOLIO_API.URL;
      Object.defineProperty(AppConstants.PORTFOLIO_API, 'URL', {
        value: mockUrl,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(AppConstants.PORTFOLIO_API, 'URL', {
        value: originalUrl,
        writable: true,
      });
    });

    it('sends GET request with correct parameters and returns response', async () => {
      const mockResponse = createMockTokensResponse(1, {
        name: 'TestToken',
        symbol: 'TEST',
      });
      fetchMock.mockResolvedValue(mockSuccessfulResponse(mockResponse));

      const chains = ['eth', 'polygon'];
      const name = 'TestToken';
      const limit = '10';

      const response = await getMMPortfolioTokensSearch(chains, name, limit);

      expect(response).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${mockUrl}/tokens-search/name?chains=eth,polygon&name=TestToken&limit=10`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('handles request with minimal parameters', async () => {
      const mockResponse = createMockTokensResponse(1, {
        name: 'Minimal Token',
        symbol: 'MIN',
      });
      fetchMock.mockResolvedValue(mockSuccessfulResponse(mockResponse));

      const response = await getMMPortfolioTokensSearch();

      expect(response).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`${mockUrl}/tokens-search/name?`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('throws error with appropriate message when request fails', async () => {
      fetchMock.mockResolvedValue(mockFailedResponse(500));

      await expect(getMMPortfolioTokensSearch()).rejects.toThrow(
        'MM Portfolio API request failed with status: 500',
      );
    });

    it('throws error with custom message when fetch fails', async () => {
      const errorMessage = 'Network error';
      fetchMock.mockRejectedValue(new Error(errorMessage));

      await expect(getMMPortfolioTokensSearch()).rejects.toThrow(
        `Failed to fetch MM Portfolio tokens search: ${errorMessage}`,
      );
    });
  });
  
});
