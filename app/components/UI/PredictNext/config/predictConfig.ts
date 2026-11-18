import {
  boolean,
  mask,
  object,
  optional,
  string,
  type Struct,
} from '@metamask/superstruct';
import {
  resolveBundledAuthenticationProfile,
  type VenueAuthenticationProfile,
} from '../auth/venueAuthProfiles';

export const DEFAULT_KALSHI_AUTH_PROFILE_ID = 'kalshi-a2t-v1';

export interface PredictVenueFeatures {
  deposit?: boolean;
}

/**
 * Rollout input to Active Venue resolution. See `docs/active-venue.md`.
 */
export interface PredictConfig {
  /**
   * `false` selects the legacy Polymarket lane. It is not a kill switch:
   * legacy availability stays with `predictTradingEnabled`.
   */
  enabled: boolean;
  /** Per-Venue rollout; turning a Venue off is also its kill switch. */
  venues: {
    polymarket: {
      enabled: boolean;
      features?: PredictVenueFeatures;
    };
    /**
     * `authProfileId` selects a bundled authentication profile (see
     * `resolveBundledAuthenticationProfile`) by id. Remote configuration may
     * only choose among bundled profiles; it cannot supply or override
     * cryptographic instructions. An omitted id selects
     * `DEFAULT_KALSHI_AUTH_PROFILE_ID`. An id this build does not bundle
     * leaves Kalshi authentication off.
     */
    kalshi: {
      enabled: boolean;
      authProfileId?: string;
      features?: PredictVenueFeatures;
    };
  };
  /** Whether a Venue Selection Preference is honored. */
  venueSelection: { enabled: boolean };
}

export const DEFAULT_PREDICT_CONFIG: PredictConfig = {
  enabled: false,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

const enabledSchema = object({ enabled: boolean() });
const venueFeaturesSchema = object({
  deposit: optional(boolean()),
});
const polymarketSchema = object({
  enabled: boolean(),
  features: optional(venueFeaturesSchema),
});
const kalshiSchema = object({
  enabled: boolean(),
  authProfileId: optional(string()),
  features: optional(venueFeaturesSchema),
});
const predictConfigSchema = object({
  enabled: boolean(),
  venues: object({
    polymarket: polymarketSchema,
    kalshi: kalshiSchema,
  }),
  venueSelection: enabledSchema,
});

export const parsePredictConfig = (value: unknown): PredictConfig => {
  try {
    return mask(value, predictConfigSchema as Struct<PredictConfig>);
  } catch {
    return DEFAULT_PREDICT_CONFIG;
  }
};

/**
 * Returns the per-Venue feature flags from `config` for `venue`.
 * Only `next` implementation Venues read these flags; `legacy` Venues ignore them.
 */
export const getVenueFeatures = (
  config: PredictConfig,
  venue: keyof PredictConfig['venues'],
): PredictVenueFeatures | undefined => config.venues[venue].features;

/**
 * Resolves the bundled Kalshi authentication profile the config selects,
 * independent of whether Predict or the Kalshi venue is enabled. An omitted
 * id selects the default profile. An id this build does not bundle returns
 * undefined.
 */
export const resolveSelectedAuthProfile = (
  config: PredictConfig,
): VenueAuthenticationProfile | undefined =>
  resolveBundledAuthenticationProfile(
    config.venues.kalshi.authProfileId ?? DEFAULT_KALSHI_AUTH_PROFILE_ID,
  );

/**
 * Resolves the bundled Kalshi authentication profile the current config
 * selects, or undefined when Predict, the Kalshi venue, or the selected
 * profile id is not available.
 */
export const resolveVenueAuthProfile = (
  config: PredictConfig,
): VenueAuthenticationProfile | undefined => {
  if (!config.enabled || !config.venues.kalshi.enabled) {
    return undefined;
  }
  return resolveSelectedAuthProfile(config);
};
