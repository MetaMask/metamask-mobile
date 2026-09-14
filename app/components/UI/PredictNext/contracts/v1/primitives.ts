import { refine, string } from '@metamask/superstruct';

/** Non-negative decimal string without leading zeros or exponent notation. */
export const amount = refine(string(), 'PredictAmount', (value) =>
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value),
);
