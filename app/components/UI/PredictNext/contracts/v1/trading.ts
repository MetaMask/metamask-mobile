import {
  type AnyStruct,
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
import type {
  PredictBuyOrderPreview,
  PredictBuyOrderReceipt,
  PredictOrderPreview,
  PredictOrderReceipt,
  PredictSellOrderPreview,
  PredictSellOrderReceipt,
} from '../../types';
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

const nonNegativeInteger = refine(
  number(),
  'PredictNonNegativeInteger',
  (value) => Number.isInteger(value) && value >= 0,
);

const feeSource = enums(['venue', 'metamask'] as const);

const feeComponentSchema = object({
  // Structured source, never a display label: the client keys the source
  // into its own localized fee names.
  source: feeSource,
  amount,
});

/** Shared Preview header quoted for either action. */
const previewHeader = {
  previewId: entityId,
  venueId,
  marketId: entityId,
  side,
  estimatedContracts: positiveInteger,
  averagePrice: decimal,
  fee: amount,
  feeBreakdown: size(array(feeComponentSchema), 1, Infinity),
  expiresAt: timestamp,
};

const buyPreviewSchema = object({
  ...previewHeader,
  action: literal('buy'),
  requestedAmount: amount,
  orderAmount: amount,
  totalDebit: amount,
  potentialPayout: amount,
  potentialProfit: signedAmount,
});

const sellPreviewSchema = object({
  ...previewHeader,
  action: literal('sell'),
  requestedContracts: positiveInteger,
  limitPrice: decimal,
  estimatedProceeds: amount,
  estimatedNetProceeds: amount,
});

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

/** Shared Receipt header reported for either action. */
const receiptHeader = {
  operationId: entityId,
  previewId: entityId,
  venueId,
  marketId: entityId,
  side,
  status: receiptStatus,
  quotedContracts: positiveInteger,
  venueOrderId: nullable(entityId),
  averageFillPrice: nullable(decimal),
  fee: nullable(amount),
};

const buyReceiptSchema = object({
  ...receiptHeader,
  action: literal('buy'),
  filledContracts: nullable(amount),
  requestedMaxSpend: amount,
  actualSpend: nullable(amount),
  // Full resolution value of the filled contracts; each binary contract
  // pays one settlement unit. Present only for non-zero fills.
  payoutExposure: nullable(amount),
});

const sellReceiptSchema = object({
  ...receiptHeader,
  action: literal('sell'),
  // Whole contracts: zero is a reported zero-fill outcome, never a count
  // the user could request.
  filledContracts: nullable(nonNegativeInteger),
  actualProceeds: nullable(amount),
  netProceeds: nullable(amount),
});

/** Action-specific fields of the other action. Absent-not-null (ADR-0001):
 * a variant carrying the other action's fields fails validation instead of
 * being masked away. */
const BUY_ONLY_PREVIEW_FIELDS = [
  'requestedAmount',
  'orderAmount',
  'totalDebit',
  'potentialPayout',
  'potentialProfit',
] as const;
const SELL_ONLY_PREVIEW_FIELDS = [
  'requestedContracts',
  'limitPrice',
  'estimatedProceeds',
  'estimatedNetProceeds',
] as const;
const BUY_ONLY_RECEIPT_FIELDS = [
  'requestedMaxSpend',
  'actualSpend',
  'payoutExposure',
] as const;
const SELL_ONLY_RECEIPT_FIELDS = ['actualProceeds', 'netProceeds'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertFieldsAbsent = (
  value: Record<string, unknown>,
  fieldNames: readonly string[],
): void => {
  const present = fieldNames.filter((fieldName) =>
    Object.hasOwn(value, fieldName),
  );
  if (present.length > 0) {
    throw new Error(
      `Cross-action fields must be absent: ${present.join(', ')}`,
    );
  }
};

/**
 * Branches a raw Order response on its Order Action. Version tolerance
 * (ADR-0001): a backend predating the action contract sends the buy-only
 * shape with `action` absent, so absence means buy — normalized to
 * `action: 'buy'` on the parsed value. An explicit `action: 'sell'` parses
 * the sell variant, and any other action fails. The absent-not-null rule is
 * unchanged: a variant carrying the other action's fields fails validation
 * rather than being masked away.
 */
const parseOrderActionVariant = <TPreview>(
  value: Record<string, unknown>,
  buySchema: AnyStruct,
  sellSchema: AnyStruct,
  buyOnlyFields: readonly string[],
  sellOnlyFields: readonly string[],
  kind: string,
): TPreview => {
  if (Object.hasOwn(value, 'action') && value.action !== 'buy') {
    if (value.action === 'sell') {
      assertFieldsAbsent(value, buyOnlyFields);
      return mask(value, sellSchema) as unknown as TPreview;
    }
    throw new Error(`${kind} must carry a buy or sell action.`);
  }
  assertFieldsAbsent(value, sellOnlyFields);
  return mask(
    Object.hasOwn(value, 'action') ? value : { ...value, action: 'buy' },
    buySchema,
  ) as unknown as TPreview;
};

/**
 * Parses a server Order Preview response, branching on the Order Action per
 * the shared version-tolerant rules. All quoted values are backend-owned;
 * anything the backend does not send fails validation, and a variant
 * carrying the other action's fields fails validation rather than being
 * masked away.
 */
export const parsePredictOrderPreview = (
  value: unknown,
): PredictOrderPreview => {
  try {
    if (!isRecord(value)) {
      throw new Error('Order Preview must be an object.');
    }
    return parseOrderActionVariant<
      PredictBuyOrderPreview | PredictSellOrderPreview
    >(
      value,
      buyPreviewSchema,
      sellPreviewSchema,
      BUY_ONLY_PREVIEW_FIELDS,
      SELL_ONLY_PREVIEW_FIELDS,
      'Order Preview',
    );
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

/**
 * Parses a server Order Receipt response for a committed Order, branching on
 * the Order Action per the shared version-tolerant rules. One Order produces
 * exactly one receipt; in-progress and reconciliation-required statuses
 * observe by committing the same Preview again. Nullable fill fields arrive
 * as explicit nulls until the Venue reports them, anything the backend does
 * not send fails validation, and a variant carrying the other action's
 * fields fails validation rather than being masked away.
 */
export const parsePredictOrderReceipt = (
  value: unknown,
): PredictOrderReceipt => {
  try {
    if (!isRecord(value)) {
      throw new Error('Order Receipt must be an object.');
    }
    return parseOrderActionVariant<
      PredictBuyOrderReceipt | PredictSellOrderReceipt
    >(
      value,
      buyReceiptSchema,
      sellReceiptSchema,
      BUY_ONLY_RECEIPT_FIELDS,
      SELL_ONLY_RECEIPT_FIELDS,
      'Order Receipt',
    );
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
