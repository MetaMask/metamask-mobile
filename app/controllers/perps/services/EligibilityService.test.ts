import { createMockInfrastructure } from '../../../components/UI/Perps/__mocks__/serviceMocks';
import type { PerpsPlatformDependencies } from '../types';

import { EligibilityService } from './EligibilityService';

describe('EligibilityService', () => {
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let service: EligibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps = createMockInfrastructure();
    service = new EligibilityService(mockDeps);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkEligibility', () => {
    it('returns true when user is not in blocked regions', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
        geoLocation: 'FR',
      });

      expect(result).toBe(true);
    });

    it('returns false when user is in blocked region', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
        geoLocation: 'US',
      });

      expect(result).toBe(false);
    });

    it('returns false when user is in any blocked region from list', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN', 'KP', 'IR'],
        geoLocation: 'CN',
      });

      expect(result).toBe(false);
    });

    it('returns true when blocked regions list is empty', async () => {
      const result = await service.checkEligibility({
        blockedRegions: [],
        geoLocation: 'US',
      });

      expect(result).toBe(true);
    });

    it('returns true when location is UNKNOWN (defaults to eligible)', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US', 'CN'],
        geoLocation: 'UNKNOWN',
      });

      expect(result).toBe(true);
    });

    it('handles partial region codes (e.g., US-NY)', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US'],
        geoLocation: 'US-NY',
      });

      expect(result).toBe(false);
    });

    it('performs case-insensitive region matching', async () => {
      const result = await service.checkEligibility({
        blockedRegions: ['US'],
        geoLocation: 'us',
      });

      expect(result).toBe(false);
    });

    it('returns true on error (fail-safe)', async () => {
      const brokenDeps = {
        ...mockDeps,
        debugLogger: {
          log: () => {
            throw new Error('Logging failure');
          },
        },
      } as unknown as jest.Mocked<PerpsPlatformDependencies>;

      const brokenService = new EligibilityService(brokenDeps);

      const result = await brokenService.checkEligibility({
        blockedRegions: ['US', 'CN'],
        geoLocation: 'US',
      });

      expect(result).toBe(true);
    });
  });
});
