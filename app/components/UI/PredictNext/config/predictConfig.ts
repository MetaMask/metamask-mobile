import { boolean, mask, object, type Struct } from '@metamask/superstruct';

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
    kalshi: { enabled: boolean };
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
const predictConfigSchema = object({
  enabled: boolean(),
  venues: object({
    polymarket: enabledSchema,
    kalshi: enabledSchema,
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
