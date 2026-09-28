import {
  array,
  enums,
  literal,
  mask,
  nullable,
  number,
  object,
  refine,
  size,
  string,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictOrderPreview, PredictOrderReceipt } from '../../types';
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

/** Receipt statuses of a committed Order operation, as defined in CONTEXT.md.
 * `pending` and `submitted` are in-progress projections;
 * `reconciliation_required` is projected while the backend keeps resolving
 * the true outcome. */
const receiptStatus = enums([
  'pending',
  'submitted',
  'filled',
  'partially_filled',
  'not_filled',
  'rejected',
  'reconciliation_required',
] as const);

const orderReceiptSchema = object({
  operationId: entityId,
  previewId: entityId,
  venueId,
  marketId: entityId,
  side,
  status: receiptStatus,
  requestedMaxSpend: amount,
  quotedContracts: positiveInteger,
  venueOrderId: nullable(entityId),
  filledContracts: nullable(amount),
  actualSpend: nullable(amount),
  averageFillPrice: nullable(decimal),
  fee: nullable(amount),
  // Full resolution value of the filled contracts; each binary contract
  // pays one settlement unit. Present only for non-zero fills.
  payoutExposure: nullable(amount),
});

/**
 * Parses a server Order Receipt response for a committed Order. One Order
 * produces exactly one receipt; in-progress and reconciliation-required
 * statuses observe by committing the same Preview again. Nullable fill and
 * spend fields arrive as explicit nulls until the Venue reports them, and
 * anything the backend does not send fails validation.
 */
export const parsePredictOrderReceipt = (
  value: unknown,
): PredictOrderReceipt => {
  try {
    return mask(value, orderReceiptSchema) as unknown as PredictOrderReceipt;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
