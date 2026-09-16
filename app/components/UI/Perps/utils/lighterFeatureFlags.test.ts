import {
  isLighterProviderEnabled,
  isPerpsProviderSelectorEnabled,
} from './lighterFeatureFlags';

describe('lighterFeatureFlags', () => {
  describe('isLighterProviderEnabled', () => {
    it('enables Lighter by default in the development environment', () => {
      const environment = { METAMASK_ENVIRONMENT: 'dev' };

      const result = isLighterProviderEnabled(environment);

      expect(result).toBe(true);
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

  describe('isPerpsProviderSelectorEnabled', () => {
    it('exposes the selector in the development environment', () => {
      const environment = { METAMASK_ENVIRONMENT: 'dev' };

      const result = isPerpsProviderSelectorEnabled(environment);

      expect(result).toBe(true);
    });

    it('hides the selector outside development despite the Lighter override', () => {
      const environment = {
        METAMASK_ENVIRONMENT: 'production',
        MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'true',
      };

      const result = isPerpsProviderSelectorEnabled(environment);

      expect(result).toBe(false);
    });
  });
});
