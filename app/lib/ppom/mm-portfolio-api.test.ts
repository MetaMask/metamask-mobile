import AppConstants from '../../core/AppConstants';
import { getMMPortfolioHealthCheck } from './mm-portfolio-api';

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
      await expect(getMMPortfolioHealthCheck()).rejects.toThrow(
        'MM Portfolio API URL is not set',
      );
    });
  });
});
