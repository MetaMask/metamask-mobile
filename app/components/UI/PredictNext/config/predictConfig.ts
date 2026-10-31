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

export interface PredictConfig {
  enabled: boolean;
  venues: {
    polymarket: { enabled: boolean };
    /**
     * `authProfileId` selects a bundled authentication profile (see
     * `resolveBundledAuthenticationProfile`) by id. Remote configuration may
     * only choose among bundled profiles; it cannot supply or override
     * cryptographic instructions. An omitted id selects
     * `DEFAULT_KALSHI_AUTH_PROFILE_ID`. An id this build does not bundle
     * leaves Kalshi authentication off.
     */
    kalshi: { enabled: boolean; authProfileId?: string };
  };
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
const kalshiSchema = object({
  enabled: boolean(),
  authProfileId: optional(string()),
});
const predictConfigSchema = object({
  enabled: boolean(),
  venues: object({
    polymarket: enabledSchema,
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
