import { EligibilityService } from './EligibilityService';
import { successfulFetch } from '@metamask/controller-utils';
import { getEnvironment } from '../utils';
import { createMockInfrastructure } from '../../__mocks__/serviceMocks';
import type { PerpsPlatformDependencies } from '../types';

jest.mock('@metamask/controller-utils');
jest.mock('../utils');

describe('EligibilityService', () => {
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let service: EligibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps = createMockInfrastructure();
    service = new EligibilityService(mockDeps);
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

      const result = await service.fetchGeoLocation();

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

      const firstResult = await service.fetchGeoLocation();

      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes

      const secondResult = await service.fetchGeoLocation();

      expect(firstResult).toBe('UK');
      expect(secondResult).toBe('UK');
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });

    it('refetches geo-location after cache expiry (5 minutes)', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      const firstResult = await service.fetchGeoLocation();

      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes - cache expired

      const secondResult = await service.fetchGeoLocation();

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

      const promise1 = service.fetchGeoLocation();
      const promise2 = service.fetchGeoLocation();
      const promise3 = service.fetchGeoLocation();

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

      await service.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.uat-api.cx.metamask.io/geolocation',
      );
    });

    it('uses PROD endpoint when environment is PROD', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      await service.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('returns UNKNOWN when API fails', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('returns UNKNOWN when API returns empty response', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue({});

      const result = await service.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
    });

    it('returns UNKNOWN when API returns null', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockResolvedValue(null);

      const result = await service.fetchGeoLocation();

      expect(result).toBe('UNKNOWN');
    });

    it('logs error with proper context when fetch fails', async () => {
      const mockError = new Error('API timeout');
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock).mockRejectedValue(mockError);

      await service.fetchGeoLocation();

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'EligibilityService.performGeoLocationFetch',
          }),
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

      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
      });

      expect(result).toBe(true);
    });

    it('returns false when user is in blocked region', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
      });

      expect(result).toBe(false);
    });

    it('returns false when user is in any blocked region from list', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'CN',
      });

      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN', 'KP', 'IR'],
      });

      expect(result).toBe(false);
    });

    it('returns true when blocked regions list is empty', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US',
      });

      const result = await service.checkEligibility({ blockedRegions: [] });

      expect(result).toBe(true);
    });

    it('returns true when location is UNKNOWN (defaults to eligible)', async () => {
      (successfulFetch as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
      });

      expect(result).toBe(true);
    });

    it('handles partial region codes (e.g., US-NY)', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'US-NY',
      });

      const resultWithUS = await service.checkEligibility({
        blockedRegions: ['US'],
      });

      expect(resultWithUS).toBe(false);
    });

    it('performs case-insensitive region matching', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'us',
      });

      const result = await service.checkEligibility({ blockedRegions: ['US'] });

      expect(result).toBe(false);
    });

    it('caches eligibility check results', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'FR',
      });

      const result1 = await service.checkEligibility({
        blockedRegions: ['US'],
      });
      const result2 = await service.checkEligibility({
        blockedRegions: ['US'],
      });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(successfulFetch).toHaveBeenCalledTimes(1);
    });

    it('returns true when fetch throws error (fail-safe)', async () => {
      (successfulFetch as jest.Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
      });

      expect(result).toBe(true);
    });

    it('handles multiple concurrent eligibility checks', async () => {
      (successfulFetch as jest.Mock).mockResolvedValue({
        text: async () => 'FR',
      });

      const [result1, result2, result3] = await Promise.all([
        service.checkEligibility({ blockedRegions: ['US'] }),
        service.checkEligibility({ blockedRegions: ['CN'] }),
        service.checkEligibility({ blockedRegions: ['UK'] }),
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

      const firstResult = await service.fetchGeoLocation();

      service.clearCache();

      const secondResult = await service.fetchGeoLocation();

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

      const fetchPromise = service.fetchGeoLocation();

      service.clearCache();

      const newFetchResult = await service.fetchGeoLocation();

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

      await service.fetchGeoLocation();

      service.clearCache();

      const result = await service.fetchGeoLocation();

      jest.advanceTimersByTime(4 * 60 * 1000);

      const cachedResult = await service.fetchGeoLocation();

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

      await service.fetchGeoLocation();

      jest.advanceTimersByTime(5 * 60 * 1000 - 1); // 1ms before expiry

      await service.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2); // 1ms after expiry

      await service.fetchGeoLocation();

      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });

    it('cache expires after 5 minutes from initial fetch', async () => {
      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      await service.fetchGeoLocation();

      jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes

      await service.fetchGeoLocation(); // Still within cache TTL

      jest.advanceTimersByTime(3 * 60 * 1000); // Another 3 minutes (6 total from first fetch)

      await service.fetchGeoLocation(); // Cache expired, new fetch

      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('instance isolation', () => {
    it('each instance has its own cache', async () => {
      const mockDeps2 = createMockInfrastructure();
      const service2 = new EligibilityService(mockDeps2);

      (getEnvironment as jest.Mock).mockReturnValue('PROD');
      (successfulFetch as jest.Mock)
        .mockResolvedValueOnce({ text: async () => 'US' })
        .mockResolvedValueOnce({ text: async () => 'CA' });

      // Fetch from first service
      const result1 = await service.fetchGeoLocation();

      // Fetch from second service - should make a new API call
      const result2 = await service2.fetchGeoLocation();

      expect(result1).toBe('US');
      expect(result2).toBe('CA');
      expect(successfulFetch).toHaveBeenCalledTimes(2);
    });
  });
});
