import { KALSHI_AUTHENTICATION_PROFILE } from '../auth/venueAuthProfiles';
import {
  DEFAULT_PREDICT_CONFIG,
  isCryptoUpDownEnabled,
  parsePredictConfig,
  resolveVenueAuthProfile,
} from './predictConfig';

describe('parsePredictConfig', () => {
  it('parses a complete config and removes unknown fields', () => {
    const value = {
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: {
          enabled: true,
          authProfileId: 'kalshi-a2t-v1',
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
        polymarket: { enabled: false },
        kalshi: { enabled: true, authProfileId: 'kalshi-a2t-v1' },
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

  it('drops a leftover kalshiWithdrawalsEnabled', () => {
    const result = parsePredictConfig({
      enabled: true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
      venueSelection: { enabled: false },
      kalshiWithdrawalsEnabled: true,
    });

    expect(result).not.toHaveProperty('kalshiWithdrawalsEnabled');
    expect(result.venues.kalshi.enabled).toBe(true);
  });

  it.each([undefined, {}, { enabled: true }, { enabled: 'true' }])(
    'returns the safe config for an unusable value',
    (value) => {
      const result = parsePredictConfig(value);

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

describe('crypto Up/Down flag', () => {
  const configWith = (
    cryptoUpDown: unknown,
    overrides: { enabled?: boolean; kalshi?: boolean } = {},
  ) =>
    parsePredictConfig({
      enabled: overrides.enabled ?? true,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: overrides.kalshi ?? true, cryptoUpDown },
      },
      venueSelection: { enabled: false },
    });

  it('is off by default', () => {
    expect(isCryptoUpDownEnabled(DEFAULT_PREDICT_CONFIG)).toBe(false);
  });

  it('is off when the flag is absent', () => {
    expect(isCryptoUpDownEnabled(configWith(undefined))).toBe(false);
  });

  it('is on when the flag is on', () => {
    const config = configWith({ enabled: true });

    expect(config.venues.kalshi.cryptoUpDown).toEqual({ enabled: true });
    expect(isCryptoUpDownEnabled(config)).toBe(true);
  });

  it('is off when the flag is off, as its own kill switch', () => {
    const config = configWith({ enabled: false });

    expect(config.venues.kalshi.enabled).toBe(true);
    expect(isCryptoUpDownEnabled(config)).toBe(false);
  });

  it('is off when the Kalshi Venue is off', () => {
    expect(
      isCryptoUpDownEnabled(configWith({ enabled: true }, { kalshi: false })),
    ).toBe(false);
  });

  it('is off when Predict is off', () => {
    expect(
      isCryptoUpDownEnabled(configWith({ enabled: true }, { enabled: false })),
    ).toBe(false);
  });

  it.each([{ enabled: 'true' }, 'on', 1, null, {}])(
    'turns only Up/Down off for a malformed flag %p',
    (value) => {
      const config = configWith(value);

      expect(config.venues.kalshi.enabled).toBe(true);
      expect(config.enabled).toBe(true);
      expect(isCryptoUpDownEnabled(config)).toBe(false);
    },
  );
});
