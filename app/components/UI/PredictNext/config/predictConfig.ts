import { boolean, mask, object, type Struct } from '@metamask/superstruct';

export interface PredictConfig {
  enabled: boolean;
  venues: {
    polymarket: { enabled: boolean };
    kalshi: { enabled: boolean };
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
