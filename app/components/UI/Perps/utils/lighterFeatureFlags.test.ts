import { isLighterProviderEnabled } from './lighterFeatureFlags';

describe('lighterFeatureFlags', () => {
  describe('isLighterProviderEnabled', () => {
    it('keeps Lighter disabled in development without an opt-in', () => {
      const environment = {
        METAMASK_ENVIRONMENT: 'dev',
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'false',
      };

      const result = isLighterProviderEnabled(environment);

      expect(result).toBe(false);
    });

    it('enables Lighter through the explicit override outside development', () => {
      const environment = {
        METAMASK_ENVIRONMENT: 'production',
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'true',
      };

      const result = isLighterProviderEnabled(environment);

      expect(result).toBe(true);
    });

    it('keeps Lighter disabled in production without an override', () => {
      const environment = { METAMASK_ENVIRONMENT: 'production' };

      const result = isLighterProviderEnabled(environment);

      expect(result).toBe(false);
    });

    it('treats non-true override values as disabled', () => {
      const environment = {
        METAMASK_ENVIRONMENT: 'production',
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'false',
      };

      const result = isLighterProviderEnabled(environment);

      expect(result).toBe(false);
    });
  });
});
