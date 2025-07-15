import { getGeolocation, GeolocationResponse } from './geolocation';
import { TRANSAK_API_URL, TRANSAK_GEOLOCATION_ENDPOINT } from '../constants';

describe('geolocation', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('getGeolocation', () => {
    it('should successfully fetch geolocation data', async () => {
      const mockResponse: GeolocationResponse = {
        ipCountryCode: 'US',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getGeolocation();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TRANSAK_API_URL}/${TRANSAK_GEOLOCATION_ENDPOINT}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should throw error when API response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getGeolocation()).rejects.toThrow(
        'Transak geolocation API request failed with status: 500',
      );
    });

    it('should throw error when API response is missing ipCountryCode', async () => {
      const invalidResponse = {
        someOtherField: 'value',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(getGeolocation()).rejects.toThrow(
        'Invalid geolocation response: missing ipCountryCode',
      );
    });

    it('should throw error when API response has empty ipCountryCode', async () => {
      const invalidResponse = {
        ipCountryCode: '',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(getGeolocation()).rejects.toThrow(
        'Invalid geolocation response: missing ipCountryCode',
      );
    });

    it('should throw error when API response has null ipCountryCode', async () => {
      const invalidResponse = {
        ipCountryCode: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(getGeolocation()).rejects.toThrow(
        'Invalid geolocation response: missing ipCountryCode',
      );
    });

    it('should throw error when API response has undefined ipCountryCode', async () => {
      const invalidResponse = {
        ipCountryCode: undefined,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(getGeolocation()).rejects.toThrow(
        'Invalid geolocation response: missing ipCountryCode',
      );
    });

    it('should handle network errors', async () => {
      const networkError = new TypeError('Network request failed');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(getGeolocation()).rejects.toThrow('Network request failed');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      });

      await expect(getGeolocation()).rejects.toThrow('Invalid JSON');
    });

    it('should work with different country codes', async () => {
      const testCases = [
        { countryCode: 'GB', description: 'United Kingdom' },
        { countryCode: 'DE', description: 'Germany' },
        { countryCode: 'JP', description: 'Japan' },
        { countryCode: 'CA', description: 'Canada' },
        { countryCode: 'AU', description: 'Australia' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ipCountryCode: testCase.countryCode,
          }),
        });

        const result = await getGeolocation();

        expect(result.ipCountryCode).toBe(testCase.countryCode);
      }

      expect(mockFetch).toHaveBeenCalledTimes(testCases.length);
    });

    it('should construct the correct URL with base API URL and endpoint', async () => {
      const expectedUrl = `${TRANSAK_API_URL}/${TRANSAK_GEOLOCATION_ENDPOINT}`;
      const mockResponse: GeolocationResponse = {
        ipCountryCode: 'US',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await getGeolocation();

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should include correct headers in the request', async () => {
      const mockResponse: GeolocationResponse = {
        ipCountryCode: 'US',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await getGeolocation();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });
  });
});
