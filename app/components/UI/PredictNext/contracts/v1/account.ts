import { enums, mask, object, refine, string } from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictAccountReadiness } from '../../types';

const venueId = refine(string(), 'PredictVenueId', (value) => value.length > 0);

const accountReadinessSchema = object({
  venueId,
  status: enums(['setup_required', 'ready'] as const),
});

export const parsePredictAccountReadiness = (
  value: unknown,
): PredictAccountReadiness => {
  try {
    return mask(
      value,
      accountReadinessSchema,
    ) as unknown as PredictAccountReadiness;
  } catch {
    throw PredictError.from(PredictErrorCode.UNKNOWN, {
      message: 'Invalid Predict API response.',
    });
  }
};
