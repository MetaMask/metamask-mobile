import { EligibilityService } from './EligibilityService';
import { successfulFetch } from '@metamask/controller-utils';
import { getEnvironment } from '../utils';
import Logger from '../../../../../util/Logger';

jest.mock('@metamask/controller-utils');
jest.mock('../utils');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

describe('EligibilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EligibilityService.clearCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('fetchGeoLocation', () => {
    it('fetches geo-location from API on first call', async () => {
      const mockLocation = 'US';
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => mockLocation,
      });

      const result = await EligibilityService.fetchGeoLocation();

      expect(result).toBe('US');
      expect(successfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('returns cached geo-location within TTL (5 minutes)', async () => {
      const mockLocation = 'UK';
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => mockLocation,
      });

      const firstResult = await EligibilityService.fetchGeoLocation();

      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes

      const secondResult = await EligibilityService.fetchGeoLocation();

      expect(firstResult).toBe('UK');
      expect(secondResult).toBe('UK');
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });

    it('refetches geo-location after cache expiry (5 minutes)', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      const firstResult = await EligibilityService.fetchGeoLocation();

      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes - cache expired

      const secondResult = await EligibilityService.fetchGeoLocation();

      expect(firstResult).toBe('US');
      expect(secondResult).toBe('CA');
      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent requests', async () => {
      const mockLocation = 'FR';
      (getEnvironment as jest.Mock).mockReturnValue('PROD');

      let resolvePromise!: (value: { text: () => Promise<string> }) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (successfulFetch as jest.Mock).mockReturnValue(fetchPromise);

      const promise1 = EligibilityService.fetchGeoLocation();
      const promise2 = EligibilityService.fetchGeoLocation();
      const promise3 = EligibilityService.fetchGeoLocation();

      resolvePromise({ text: async () => mockLocation });

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toBe('FR');
      expect(result2).toBe('FR');
      expect(result3).toBe('FR');
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });

    it('uses DEV endpoint when environment is DEV', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('DEV');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      await EligibilityService.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.uat-api.cx.metamask.io/geolocation',
      );
    });

    it('uses PROD endpoint when environment is PROD', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      await EligibilityService.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('returns UNKNOWN when API fails', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await EligibilityService.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('returns UNKNOWN when API returns empty response', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({});

      const result = await EligibilityService.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
    });

    it('returns UNKNOWN when API returns null', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue(null);

      const result = await EligibilityService.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
    });

    it('logs error with proper context when fetch fails', async () => {
      const mockError = new Error('API timeout');
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockRejectedValue(mockError);

      await EligibilityService.fetchGeoLocation();

      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          controller: 'EligibilityService',
          method: 'performGeoLocationFetch',
        }),
      );
    });
  });

  describe('checkEligibility', () => {
    beforeEach(() => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
    });

    it('returns true when user is not in blocked regions', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'FR',
      });

      const result = await EligibilityService.checkEligibility(['US', 'CN']);

      expect(result).toBe(true);
    });

    it('returns false when user is in blocked region', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      const result = await EligibilityService.checkEligibility(['US', 'CN']);

      expect(result).toBe(false);
    });

    it('returns false when user is in any blocked region from list', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'CN',
      });

      const result = await EligibilityService.checkEligibility([
        'US',
        'CN',
        'KP',
        'IR',
      ]);

      expect(result).toBe(false);
    });

    it('returns true when blocked regions list is empty', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      const result = await EligibilityService.checkEligibility([]);

      expect(result).toBe(true);
    });

    it('returns true when location is UNKNOWN (defaults to eligible)', async () => {
      (successfulFetch as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await EligibilityService.checkEligibility(['US', 'CN']);

      expect(result).toBe(true);
    });

    it('handles partial region codes (e.g., US-NY)', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US-NY',
      });

      const resultWithUS = await EligibilityService.checkEligibility(['US']);

      expect(resultWithUS).toBe(false);
    });

    it('performs case-insensitive region matching', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'us',
      });

      const result = await EligibilityService.checkEligibility(['US']);

      expect(result).toBe(false);
    });

    it('caches eligibility check results', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'FR',
      });

      const result1 = await EligibilityService.checkEligibility(['US']);
      const result2 = await EligibilityService.checkEligibility(['US']);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });

    it('returns true when fetch throws error (fail-safe)', async () => {
      (successfulFetch as jest.Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      const result = await EligibilityService.checkEligibility(['US', 'CN']);

      expect(result).toBe(true);
    });

    it('handles multiple concurrent eligibility checks', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'FR',
      });

      const [result1, result2, result3] = await Promise.all([
        EligibilityService.checkEligibility(['US']),
        EligibilityService.checkEligibility(['CN']),
        EligibilityService.checkEligibility(['UK']),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('clears cached geo-location', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      const firstResult = await EligibilityService.fetchGeoLocation();

      EligibilityService.clearCache();

      const secondResult = await EligibilityService.fetchGeoLocation();

      expect(firstResult).toBe('US');
      expect(secondResult).toBe('CA');
      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });

    it('clears in-flight fetch promise', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');

      let resolveFirst!: (value: { text: () => Promise<string> }) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      (successfulFetch as jest.Mock)
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce({ text: async () => 'CA' });

      const fetchPromise = EligibilityService.fetchGeoLocation();

      EligibilityService.clearCache();

      const newFetchResult = await EligibilityService.fetchGeoLocation();

      resolveFirst({ text: async () => 'US' });
      await fetchPromise;

      expect(newFetchResult).toBe('CA');
      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });

    it('allows new cache to be built after clearing', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'UK',
      });

      await EligibilityService.fetchGeoLocation();

      EligibilityService.clearCache();

      const result = await EligibilityService.fetchGeoLocation();

      jest.advanceTimersByTime(4 * 60 * 1000);

      const cachedResult = await EligibilityService.fetchGeoLocation();

      expect(result).toBe('UK');
      expect(cachedResult).toBe('UK');
      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache TTL behavior', () => {
    it('respects 5-minute cache TTL exactly', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      await EligibilityService.fetchGeoLocation();

      jest.advanceTimersByTime(5 * 60 * 1000 - 1); // 1ms before expiry

      await EligibilityService.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2); // 1ms after expiry

      await EligibilityService.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });

    it('cache expires after 5 minutes from initial fetch', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      await EligibilityService.fetchGeoLocation();

      jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes

      await EligibilityService.fetchGeoLocation(); // Still within cache TTL

      jest.advanceTimersByTime(3 * 60 * 1000); // Another 3 minutes (6 total from first fetch)

      await EligibilityService.fetchGeoLocation(); // Cache expired, new fetch

      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });
  });
});
