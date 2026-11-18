import { KALSHI_AUTHENTICATION_PROFILE } from '../auth/venueAuthProfiles';
import {
  DEFAULT_PREDICT_CONFIG,
  getVenueFeatures,
  parsePredictConfig,
  resolveVenueAuthProfile,
} from './predictConfig';

describe('parsePredictConfig', () => {
  it('parses a complete config and removes unknown fields', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: {
          enabled: true,
          features: { deposit: true, ignoredFeature: true },
          ignored: 'value',
        },
        kalshi: {
          enabled: true,
          authProfileId: 'kalshi-a2t-v1',
          features: { deposit: true, futureFlag: 'on' },
          ignored: 'value',
        },
      },
      venueSelection: { enabled: true },
      ignored: 'value',
    };

    const result = parsePredictConfig(value);

    expect(result).toEqual({
      enabled: true,
      venues: {
        polymarket: { enabled: true, features: { deposit: true } },
        kalshi: {
          enabled: true,
          authProfileId: 'kalshi-a2t-v1',
          features: { deposit: true },
        },
      },
      venueSelection: { enabled: true },
    });
  });

  it('parses a config that omits the Kalshi auth profile id', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: false },
    };

    const result = parsePredictConfig(value);

    expect(result.venues.kalshi.authProfileId).toBeUndefined();
  });

  it('preserves a remotely-selected auth profile id that this build does not bundle', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true, authProfileId: 'server-defined-profile' },
      },
      venueSelection: { enabled: false },
    };

    const result = parsePredictConfig(value);

    expect(result.venues.kalshi.authProfileId).toBe('server-defined-profile');
  });

  it('reads per-venue features.deposit when the config sets it', () => {
    const result = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: true, features: { deposit: false } },
        kalshi: { enabled: true, features: { deposit: true } },
      },
      venueSelection: { enabled: false },
    });

    expect(result.venues.polymarket.features).toEqual({ deposit: false });
    expect(result.venues.kalshi.features).toEqual({ deposit: true });
    expect(getVenueFeatures(result, 'polymarket')).toEqual({ deposit: false });
    expect(getVenueFeatures(result, 'kalshi')).toEqual({ deposit: true });
  });

  it('parses a config from before venue features, leaving features undefined', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: { enabled: true },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: true },
    };

    const result = parsePredictConfig(value);

    expect(result).toEqual(value);
    expect(result.venues.polymarket.features).toBeUndefined();
    expect(result.venues.kalshi.features).toBeUndefined();
    expect(getVenueFeatures(result, 'kalshi')).toBeUndefined();
  });

  it('parses an empty venue features object with deposit omitted', () => {
    const result = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: true, features: {} },
        kalshi: { enabled: true, features: {} },
      },
      venueSelection: { enabled: false },
    });

    expect(result.venues.polymarket.features).toEqual({});
    expect(result.venues.kalshi.features).toEqual({});
    expect(result.venues.kalshi.features?.deposit).toBeUndefined();
  });

  it('keeps venue features off by default', () => {
    expect(DEFAULT_PREDICT_CONFIG.venues.polymarket.features).toBeUndefined();
    expect(DEFAULT_PREDICT_CONFIG.venues.kalshi.features).toBeUndefined();
  });

  it.each([undefined, {}, { enabled: true }, { enabled: 'true' }])(
    'returns the safe config for an unusable value',
    (value) => {
      const result = parsePredictConfig(value);

      expect(result).toEqual(DEFAULT_PREDICT_CONFIG);
    },
  );

  it.each(['polymarket', 'kalshi'] as const)(
    'returns the safe config when %s features.deposit is not a boolean',
    (venue) => {
      const result = parsePredictConfig({
        enabled: true,
        venues: {
          polymarket: { enabled: false },
          kalshi: { enabled: true },
          [venue]: { enabled: true, features: { deposit: 'true' } },
        },
        venueSelection: { enabled: false },
      });

      expect(result).toEqual(DEFAULT_PREDICT_CONFIG);
    },
  );

  it.each(['polymarket', 'kalshi'] as const)(
    'returns the safe config when %s features is not an object',
    (venue) => {
      const result = parsePredictConfig({
        enabled: true,
        venues: {
          polymarket: { enabled: false },
          kalshi: { enabled: true },
          [venue]: { enabled: true, features: true },
        },
        venueSelection: { enabled: false },
      });

      expect(result).toEqual(DEFAULT_PREDICT_CONFIG);
    },
  );
});

describe('resolveVenueAuthProfile', () => {
  it('resolves the default bundled Kalshi profile when no id is selected', () => {
    const config = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: false },
    });

    expect(resolveVenueAuthProfile(config)).toBe(KALSHI_AUTHENTICATION_PROFILE);
  });

  it('resolves the bundled profile the config explicitly selects', () => {
    const config = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true, authProfileId: 'kalshi-a2t-v1' },
      },
      venueSelection: { enabled: false },
    });

    expect(resolveVenueAuthProfile(config)).toBe(KALSHI_AUTHENTICATION_PROFILE);
  });

  it('returns undefined when Predict is disabled', () => {
    const config = parsePredictConfig({
      enabled: false,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: false },
    });

    expect(resolveVenueAuthProfile(config)).toBeUndefined();
  });

  it('returns undefined when the Kalshi venue is disabled', () => {
    const config = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: false },
      },
      venueSelection: { enabled: false },
    });

    expect(resolveVenueAuthProfile(config)).toBeUndefined();
  });

  it('returns undefined when the selected auth profile id is not bundled', () => {
    const config = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true, authProfileId: 'server-defined-profile' },
      },
      venueSelection: { enabled: false },
    });

    expect(resolveVenueAuthProfile(config)).toBeUndefined();
  });
});
