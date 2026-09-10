import { literal, mask, object } from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictBalance } from '../../types';
import { amount } from './primitives';

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
