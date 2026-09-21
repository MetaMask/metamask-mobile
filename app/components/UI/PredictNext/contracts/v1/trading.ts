import {
  array,
  enums,
  literal,
  mask,
  number,
  object,
  refine,
  size,
  string,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictOrderPreview } from '../../types';
import { amount, decimal, signedAmount, timestamp } from './primitives';

const venueId = literal('kalshi');
const entityId = refine(
  string(),
  'PredictEntityId',
  (value) => value.length > 0,
);
const side = enums(['yes', 'no'] as const);

const positiveInteger = refine(
  number(),
  'PredictPositiveInteger',
  (value) => Number.isInteger(value) && value > 0,
);

const feeSource = enums(['venue', 'metamask'] as const);

const feeComponentSchema = object({
  // Structured source, never a display label: the client keys the source
  // into its own localized fee names.
  source: feeSource,
  amount,
});

const orderPreviewSchema = object({
  previewId: entityId,
  venueId,
  marketId: entityId,
  side,
  requestedAmount: amount,
  orderAmount: amount,
  estimatedContracts: positiveInteger,
  averagePrice: decimal,
  fee: amount,
  feeBreakdown: size(array(feeComponentSchema), 1, Infinity),
  totalDebit: amount,
  potentialPayout: amount,
  potentialProfit: signedAmount,
  expiresAt: timestamp,
});

/**
 * Parses a server Order Preview response. All quoted values are
 * backend-owned; anything the backend does not send fails validation.
 */
export const parsePredictOrderPreview = (
  value: unknown,
): PredictOrderPreview => {
  try {
    return mask(value, orderPreviewSchema) as unknown as PredictOrderPreview;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
