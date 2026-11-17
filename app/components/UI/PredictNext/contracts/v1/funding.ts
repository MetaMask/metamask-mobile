import {
  boolean,
  enums,
  literal,
  mask,
  nullable,
  object,
  optional,
  refine,
  string,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictWithdrawPreview,
  PredictWithdrawReceipt,
  PredictWithdrawRejectionCode,
} from '../../types';
import { amount, timestamp } from './primitives';

const venueId = literal('kalshi');
const entityId = refine(
  string(),
  'PredictEntityId',
  (value) => value.length > 0,
);

const withdrawMode = enums(['fixed', 'sweep_all'] as const);

/** A payout destination is server-resolved and always read-only on the phone,
 * so every field is required and none may be invented locally. */
const destinationSchema = object({
  address: refine(string(), 'PredictWithdrawAddress', (value) => {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed === value;
  }),
  network: enums(['base'] as const),
  source: enums(['configured_demo', 'venue'] as const),
});

/** Absent-not-null (ADR-0001): a `sweep_all` quote omits `requestedAmount`
 * rather than nulling it, so a null fails validation instead of being
 * masked away. */
const previewSchema = object({
  previewId: entityId,
  venueId,
  currency: literal('USD'),
  mode: withdrawMode,
  requestedAmount: optional(amount),
  destination: destinationSchema,
  expiresAt: timestamp,
});

const receiptStatus = enums([
  'pending',
  'processing',
  'settled',
  'failed',
  'returned',
  'rejected',
] as const);

const rejectionCode = enums([
  'insufficient_balance',
  'amount_below_minimum',
  'step_up_verification_required',
  'venue_rejected',
] as const);

/** Nullable fields arrive as explicit nulls until the Venue reports them. */
const receiptSchema = object({
  operationId: entityId,
  previewId: entityId,
  venueId,
  currency: literal('USD'),
  mode: withdrawMode,
  status: receiptStatus,
  rejectionCode: optional(rejectionCode),
  needsManualReview: boolean(),
  requestedAmount: optional(amount),
  withdrawnAmount: nullable(amount),
  venueTransferId: nullable(entityId),
  destination: destinationSchema,
  createdAt: timestamp,
  resolvedAt: nullable(timestamp),
});

/** A fixed intent names an amount and a sweep names none; neither may carry
 * the other's field. */
const assertModeAmount = (
  mode: 'fixed' | 'sweep_all',
  requestedAmount: string | undefined,
): void => {
  if (mode === 'fixed' && requestedAmount === undefined) {
    throw new Error('A fixed withdrawal requires requestedAmount.');
  }
  if (mode === 'sweep_all' && requestedAmount !== undefined) {
    throw new Error('A sweep-all withdrawal carries no requestedAmount.');
  }
};

/**
 * Parses a server Withdraw Preview. Every value is backend-owned: the amount
 * it echoes, the destination it resolved, and the expiry it set. Unknown
 * fields are masked at this boundary, and a `sweep_all` quote carrying an
 * amount (or a `fixed` quote missing one) fails instead of being repaired.
 */
export const parsePredictWithdrawPreview = (
  value: unknown,
): PredictWithdrawPreview => {
  try {
    const preview = mask(value, previewSchema);
    assertModeAmount(preview.mode, preview.requestedAmount);
    return preview as unknown as PredictWithdrawPreview;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

/**
 * Parses a server Withdraw Receipt. A refusal is the only status that
 * explains itself, so `rejectionCode` is required on `rejected` and rejected
 * on every other status; an in-progress receipt keeps its nullable transfer
 * fields as explicit nulls.
 */
export const parsePredictWithdrawReceipt = (
  value: unknown,
): PredictWithdrawReceipt => {
  try {
    const receipt = mask(value, receiptSchema);
    assertModeAmount(receipt.mode, receipt.requestedAmount);
    const rejection = receipt.rejectionCode as
      | PredictWithdrawRejectionCode
      | undefined;
    if (receipt.status === 'rejected' && rejection === undefined) {
      throw new Error('A rejected receipt requires rejectionCode.');
    }
    if (receipt.status !== 'rejected' && rejection !== undefined) {
      throw new Error('rejectionCode is valid only on a rejected receipt.');
    }
    return receipt as unknown as PredictWithdrawReceipt;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
