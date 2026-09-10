import { literal, mask, object, refine, string } from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictBalance } from '../../types';

const amount = refine(string(), 'PredictAmount', (value) =>
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value),
);

const balanceSchema = object({
  venueId: literal('kalshi'),
  currency: literal('USD'),
  available: amount,
});

export const parsePredictBalance = (value: unknown): PredictBalance => {
  try {
    return mask(value, balanceSchema) as PredictBalance;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
