import BigNumber from 'bignumber.js';
import {
  array,
  boolean,
  coerce,
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
  PredictPortfolioSummary,
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
const nonEmptyString = refine(
  string(),
  'NonEmptyString',
  (value) => value.length > 0,
);
const side = enums(['yes', 'no'] as const);
const settlementResult = enums(['yes', 'no', 'scalar'] as const);
const positionStatus = enums(['open', 'claimable', 'settled'] as const);
/** Signed decimal string in percent units, with the signed-amount pattern. */
const signedPercent = signedAmount;
/** Held shares: exact and always greater than zero. */
const heldShares = refine(amount, 'PredictHeldShares', (value) =>
  new BigNumber(value).isGreaterThan(0),
);

/** Ordered, display-ready parts naming the Market beyond its Outcome, such
 * as a Player and a line. At least one, none blank. */
const marketLabelsStruct = refine(
  array(
    refine(string(), 'PredictMarketLabel', (value) => value.trim().length > 0),
  ),
  'PredictMarketLabels',
  (labels) => labels.length > 0,
);

/**
 * Presentation only, so malformed `marketLabels` are dropped rather than
 * rejecting the entry: it then shows its Outcome label alone.
 */
const marketLabelsSchema = coerce(
  optional(marketLabelsStruct),
  unknown(),
  (value) => {
    try {
      return mask(value, marketLabelsStruct);
    } catch {
      return undefined;
    }
  },
);

/**
 * Catalog-derived presentation data joined from the canonical catalog.
 * Present only when the entry's Market exists in the catalog; a missing
 * match omits the context entirely.
 */
const entryContextSchema = object({
  eventId: entityId,
  eventTitle: nonEmptyString,
  marketQuestion: nonEmptyString,
  outcomeLabel: nonEmptyString,
  imageUrl: optional(httpsUrl),
  marketLabels: marketLabelsSchema,
});

/**
 * A valued Position. Unrealized PnL exists only with the current value and
 * cost basis it is computed from, and its percent only with the PnL: a value
 * without an authoritative source is absent, never defaulted.
 */
const positionSchema = refine(
  object({
    venueId,
    marketId: entityId,
    side,
    status: positionStatus,
    shares: heldShares,
    averagePrice: optional(decimal),
    costBasis: optional(amount),
    currentValue: optional(amount),
    unrealizedPnl: optional(signedAmount),
    unrealizedPnlPercent: optional(signedPercent),
    context: optional(entryContextSchema),
  }),
  'PredictPositionValuation',
  (position) =>
    (position.unrealizedPnl === undefined ||
      (position.currentValue !== undefined &&
        position.costBasis !== undefined)) &&
    (position.unrealizedPnlPercent === undefined ||
      position.unrealizedPnl !== undefined),
);

const entryBase = {
  venueId,
  id: entityId,
  marketId: entityId,
  side,
  shares: amount,
  timestamp,
  context: optional(entryContextSchema),
};

/** One executed Order. A buy carries no realized PnL. */
const tradeSchema = refine(
  object({
    type: literal('trade'),
    ...entryBase,
    action: enums(['buy', 'sell'] as const),
    price: decimal,
    amount,
    fee: amount,
    realizedPnl: optional(signedAmount),
  }),
  'PredictTradeEntry',
  (entry) => entry.action === 'sell' || entry.realizedPnl === undefined,
);

const settlementSchema = object({
  type: literal('settlement'),
  ...entryBase,
  result: settlementResult,
  proceeds: amount,
  realizedPnl: optional(signedAmount),
});

const balanceSchema = object({
  venueId,
  currency: literal('USD'),
  available: amount,
});

/** Totals over every holding. `totalValue` is the exact sum of its rounded
 * components, so a Summary that breaks the identity is rejected. */
const portfolioSummarySchema = refine(
  object({
    venueId,
    currency: literal('USD'),
    availableBalance: amount,
    positionsValue: amount,
    claimableValue: amount,
    totalValue: amount,
    unrealizedPnl: signedAmount,
    unrealizedPnlPercent: optional(signedPercent),
    asOf: timestamp,
    complete: boolean(),
  }),
  'PredictPortfolioSummaryTotal',
  (summary) =>
    new BigNumber(summary.availableBalance)
      .plus(summary.positionsValue)
      .plus(summary.claimableValue)
      .isEqualTo(summary.totalValue),
);

/** The holdings half of the Summary the backend serves: every total except
 * the available balance, which is the Balance route's own value. */
const portfolioHoldingsSummarySchema = object({
  venueId,
  currency: literal('USD'),
  positionsValue: amount,
  claimableValue: amount,
  unrealizedPnl: signedAmount,
  unrealizedPnlPercent: optional(signedPercent),
  asOf: timestamp,
  complete: boolean(),
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
  settlementsCompleteFrom: optional(timestamp),
});

const parseActivityEntry = (value: unknown): PredictActivityEntry => {
  // The `type` literal rejects the other branch deterministically. Masking
  // the matched branch strips unknown fields, which a union would keep.
  try {
    return mask(value, tradeSchema) as PredictActivityEntry;
  } catch {
    return mask(value, settlementSchema) as PredictActivityEntry;
  }
};

const KIND_RANK: Record<PredictActivityEntry['type'], number> = {
  trade: 0,
  settlement: 1,
};

/**
 * The pinned Activity order: `timestamp` descending, then `trade` before
 * `settlement`, then `id` ascending by code unit, as the backend's keyset
 * compares it. Negative when `a` sorts first; zero only for the same key.
 */
export const compareActivityEntries = (
  a: PredictActivityEntry,
  b: PredictActivityEntry,
): number =>
  Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
  KIND_RANK[a.type] - KIND_RANK[b.type] ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Whether a page is strictly in the pinned order, so it carries no
 * duplicate and needs no client-side sort. */
const isInActivityOrder = (activity: readonly PredictActivityEntry[]) =>
  activity.every(
    (entry, index) =>
      index === 0 || compareActivityEntries(activity[index - 1], entry) < 0,
  );

export const parsePredictBalance = (value: unknown): PredictBalance => {
  try {
    return mask(value, balanceSchema) as PredictBalance;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

export const parsePredictPortfolioSummary = (
  value: unknown,
): PredictPortfolioSummary => {
  try {
    return mask(value, portfolioSummarySchema) as PredictPortfolioSummary;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

/**
 * The Portfolio Summary from its two backend reads: the holdings totals and
 * the Balance. Each route reads one venue page, so the client adds the
 * balance; the composed Summary is checked like a served one.
 */
export const composePredictPortfolioSummary = (
  holdings: unknown,
  balance: PredictBalance,
): PredictPortfolioSummary => {
  let parsed: { positionsValue: string; claimableValue: string };
  try {
    parsed = mask(holdings, portfolioHoldingsSummarySchema);
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
  const total = new BigNumber(balance.available)
    .plus(parsed.positionsValue)
    .plus(parsed.claimableValue);
  return parsePredictPortfolioSummary({
    ...parsed,
    availableBalance: balance.available,
    totalValue: total.toFixed(Math.max(2, total.decimalPlaces() ?? 0)),
  });
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

/**
 * Parses an Activity page and rejects one that breaks the pinned order: the
 * order is total and deterministic, so a misordered page is a contract
 * violation, not something mobile re-sorts.
 */
export const parsePredictActivityPage = (
  value: unknown,
): PredictActivityPage => {
  let page: PredictActivityPage;
  try {
    const raw = mask(value, activityPageSchema);
    page = {
      ...raw,
      activity: raw.activity.map(parseActivityEntry),
    } as PredictActivityPage;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
  if (!isInActivityOrder(page.activity)) {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
  return page;
};
