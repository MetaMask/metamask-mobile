import {
  boolean,
  coerce,
  mask,
  object,
  optional,
  string,
  type Struct,
  unknown,
} from '@metamask/superstruct';
import {
  resolveBundledAuthenticationProfile,
  type VenueAuthenticationProfile,
} from '../auth/venueAuthProfiles';

export const DEFAULT_KALSHI_AUTH_PROFILE_ID = 'kalshi-a2t-v1';

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
    polymarket: { enabled: boolean };
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
      /**
       * The crypto Up/Down window cards. Default off: an absent or malformed
       * value means off. Setting `enabled` to `false` is the Up/Down kill
       * switch. It works alone, so the rest of Kalshi stays on. Turning the
       * Kalshi Venue (or Predict) off also turns Up/Down off.
       */
      cryptoUpDown?: { enabled: boolean };
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
// A malformed Up/Down flag turns only Up/Down off. It must not reject the
// whole config, which would turn Kalshi off with it.
const cryptoUpDownSchema = coerce(
  optional(enabledSchema),
  unknown(),
  (value) => {
    try {
      return mask(value, enabledSchema);
    } catch {
      return undefined;
    }
  },
);
const kalshiSchema = object({
  enabled: boolean(),
  authProfileId: optional(string()),
  cryptoUpDown: cryptoUpDownSchema,
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

/**
 * Whether the crypto Up/Down cards may show. Needs Predict on, the Kalshi
 * Venue on and the Up/Down flag on, so either kill switch turns it off.
 */
export const isCryptoUpDownEnabled = (config: PredictConfig): boolean =>
  config.enabled &&
  config.venues.kalshi.enabled &&
  config.venues.kalshi.cryptoUpDown?.enabled === true;
