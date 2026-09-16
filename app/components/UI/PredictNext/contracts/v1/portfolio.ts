import {
  array,
  enums,
  literal,
  mask,
  object,
  optional,
  refine,
  string,
  unknown,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictActivityEntry,
  PredictActivityPage,
  PredictBalance,
  PredictPositionsPage,
} from '../../types';
import {
  amount,
  decimal,
  httpsUrl,
  signedAmount,
  timestamp,
} from './primitives';

const venueId = literal('kalshi');
const entityId = refine(
  string(),
  'PredictEntityId',
  (value) => value.length > 0,
);
const side = enums(['yes', 'no'] as const);
const settlementResult = enums(['yes', 'no', 'scalar'] as const);

/**
 * Catalog-derived presentation data joined from the canonical catalog.
 * Present only when the entry's venue market exists in the catalog; a
 * missing match omits the context entirely.
 */
const entryContextSchema = object({
  eventId: entityId,
  eventTitle: string(),
  eventImageUrl: optional(httpsUrl),
  marketQuestion: string(),
  outcomeId: optional(entityId),
  outcomeLabel: optional(string()),
});

const positionSchema = object({
  venueId,
  marketId: entityId,
  side,
  shares: amount,
  marketExposure: optional(amount),
  realizedPnl: optional(signedAmount),
  feesPaid: optional(amount),
  totalTraded: optional(amount),
  updatedAt: optional(timestamp),
  context: optional(entryContextSchema),
});

const fillSchema = object({
  type: literal('fill'),
  id: entityId,
  venueId,
  marketId: entityId,
  // Kalshi's canonical fill direction field: documented as the exposure the
  // fill created (buy-yes ≡ sell-no → 'yes'), while the demo API currently
  // echoes the transacted side. The contract deliberately carries no
  // buy/sell direction — the legacy action/side fields are deprecated — and
  // outcomeSide plus the matching leg's price are correct under either
  // semantics.
  outcomeSide: side,
  shares: amount,
  price: decimal,
  fee: optional(amount),
  timestamp,
  context: optional(entryContextSchema),
});

const settlementSchema = object({
  type: literal('settlement'),
  id: entityId,
  venueId,
  marketId: entityId,
  result: settlementResult,
  // The side the user held at settlement (the nonzero count), not the
  // winning side. Omitted for scalar results and fully flat positions.
  side: optional(side),
  shares: optional(amount),
  proceeds: amount,
  costBasis: optional(amount),
  fee: optional(amount),
  timestamp,
  context: optional(entryContextSchema),
});

const balanceSchema = object({
  venueId,
  currency: literal('USD'),
  available: amount,
});

const positionsPageSchema = object({
  venueId,
  positions: array(positionSchema),
  nextCursor: optional(string()),
});

const activityPageSchema = object({
  venueId,
  activity: array(unknown()),
  nextCursor: optional(string()),
});

const parseActivityEntry = (value: unknown): PredictActivityEntry => {
  // The `type` literal rejects the other branch deterministically. Masking
  // the matched branch strips unknown fields, which a union would keep.
  try {
    return mask(value, fillSchema) as PredictActivityEntry;
  } catch {
    return mask(value, settlementSchema) as PredictActivityEntry;
  }
};

export const parsePredictBalance = (value: unknown): PredictBalance => {
  try {
    return mask(value, balanceSchema) as PredictBalance;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

export const parsePredictPositionsPage = (
  value: unknown,
): PredictPositionsPage => {
  try {
    return mask(value, positionsPageSchema) as PredictPositionsPage;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

export const parsePredictActivityPage = (
  value: unknown,
): PredictActivityPage => {
  try {
    const page = mask(value, activityPageSchema);
    return {
      ...page,
      activity: page.activity.map(parseActivityEntry),
    } as PredictActivityPage;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
