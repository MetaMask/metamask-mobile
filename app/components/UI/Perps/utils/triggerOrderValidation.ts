import {
  DECIMAL_PRECISION_CONFIG,
  formatHyperLiquidPrice,
  getTriggerDirection,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderType,
  type TriggerDirection,
  type TriggerOrderType,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';

export type TriggerPriceValidationIssue =
  | { code: 'required' }
  | { code: 'positive' }
  | {
      code: 'wrong_side';
      family: TriggerDirection;
      requiredSide: 'above' | 'below';
    };

export type LimitPriceValidationIssue =
  | { code: 'required' }
  | { code: 'positive' }
  | {
      code: 'below_trigger' | 'above_trigger';
      requiredRelation: 'at_or_above' | 'at_or_below';
    };

export type OrderFormFieldIssue =
  | {
      field: 'triggerPrice';
      issue: TriggerPriceValidationIssue;
    }
  | {
      field: 'limitPrice';
      issue: LimitPriceValidationIssue;
    };

export interface TriggerPriceValidationInput {
  orderType: OrderType;
  direction: 'long' | 'short';
  triggerPrice: string | undefined;
  /** Live mid used for client-side placement checks. */
  midPrice?: number;
  /** Asset size decimals used by Hyperliquid's price formatter. */
  szDecimals?: number;
}

export interface LimitPriceCrossingWarningInput {
  orderType: OrderType;
  direction: 'long' | 'short';
  limitPrice: string | undefined;
  midPrice: number;
  triggerPrice?: string;
  szDecimals?: number;
}

const TRIGGER_WRONG_SIDE_KEYS = {
  above: 'perps.order.validation.trigger_must_be_above_mid',
  below: 'perps.order.validation.trigger_must_be_below_mid',
} as const;

const getPriceDecimals = (szDecimals?: number): number =>
  szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;

/**
 * Formats a user-entered price using Hyperliquid's significant-figure and
 * decimal-place rules before it is compared or submitted.
 *
 * @param price - Raw numeric text.
 * @param szDecimals - Asset size decimals.
 * @returns The venue-formatted price, or `undefined` for empty input.
 */
export const canonicalizeOrderPrice = (
  price: string | undefined,
  szDecimals?: number,
): string | undefined => {
  const trimmed = price?.trim() ?? '';
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return trimmed;
  }

  return formatHyperLiquidPrice({
    price: trimmed,
    szDecimals: getPriceDecimals(szDecimals),
  });
};

/**
 * Required side of mid for a trigger placement.
 *
 * Hyperliquid's order-type guidance: Stop Long `>` mid, Stop Short `<` mid;
 * Take Long `<` mid, Take Short `>` mid. Equality is invalid.
 *
 * @param orderType - Trigger order type.
 * @param direction - Intended position side.
 * @returns `'above'` when the trigger must be strictly greater than mid.
 */
export const getRequiredTriggerSide = (
  orderType: TriggerOrderType,
  direction: 'long' | 'short',
): 'above' | 'below' => {
  const family = getTriggerDirection(orderType);
  const mustBeAbove =
    (family === 'stop' && direction === 'long') ||
    (family === 'take_profit' && direction === 'short');
  return mustBeAbove ? 'above' : 'below';
};

/**
 * Client-only trigger-vs-mid check. Hyperliquid uses mark price later to
 * activate TP/SL orders; this check only validates the placement-side rule.
 *
 * @param input - Order type, side, typed trigger, and live mid.
 * @returns A typed issue, or `undefined` when the trigger is valid or N/A.
 */
export const getTriggerPriceValidationIssue = ({
  orderType,
  direction,
  triggerPrice,
  midPrice,
  szDecimals,
}: TriggerPriceValidationInput): TriggerPriceValidationIssue | undefined => {
  if (!isTriggerOrderType(orderType)) {
    return undefined;
  }

  const trimmed = triggerPrice?.trim() ?? '';
  if (trimmed === '') {
    return { code: 'required' };
  }

  const canonicalTrigger = canonicalizeOrderPrice(trimmed, szDecimals);
  const trigger = Number.parseFloat(canonicalTrigger ?? '');
  if (!Number.isFinite(trigger) || trigger <= 0) {
    return { code: 'positive' };
  }

  const referencePrice = midPrice ?? 0;
  if (!(referencePrice > 0)) {
    return undefined;
  }

  const requiredSide = getRequiredTriggerSide(orderType, direction);
  const isOnValidSide =
    requiredSide === 'above'
      ? trigger > referencePrice
      : trigger < referencePrice;

  if (isOnValidSide) {
    return undefined;
  }

  return {
    code: 'wrong_side',
    family: getTriggerDirection(orderType),
    requiredSide,
  };
};

/**
 * Validates the execution price for limit and trigger-limit placements.
 *
 * @param input - Order type, direction, and candidate prices.
 * @returns A typed limit-price issue, or `undefined`.
 */
export const getLimitPriceValidationIssue = ({
  orderType,
  direction,
  limitPrice,
  triggerPrice,
  szDecimals,
}: {
  orderType: OrderType;
  direction: 'long' | 'short';
  limitPrice: string | undefined;
  triggerPrice?: string;
  szDecimals?: number;
}): LimitPriceValidationIssue | undefined => {
  if (!isLimitExecutionOrderType(orderType)) {
    return undefined;
  }

  const canonicalLimit = canonicalizeOrderPrice(limitPrice, szDecimals);
  const parsedLimit = Number.parseFloat(canonicalLimit ?? '');
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return limitPrice?.trim() ? { code: 'positive' } : { code: 'required' };
  }

  if (!isTriggerOrderType(orderType)) {
    return undefined;
  }

  const canonicalTrigger = canonicalizeOrderPrice(triggerPrice, szDecimals);
  const parsedTrigger = Number.parseFloat(canonicalTrigger ?? '');
  if (!Number.isFinite(parsedTrigger) || parsedTrigger <= 0) {
    return undefined;
  }

  if (direction === 'long' && parsedLimit < parsedTrigger) {
    return {
      code: 'below_trigger',
      requiredRelation: 'at_or_above',
    };
  }

  if (direction === 'short' && parsedLimit > parsedTrigger) {
    return {
      code: 'above_trigger',
      requiredRelation: 'at_or_below',
    };
  }

  return undefined;
};

/**
 * Builds all blocking price-field issues for an order form.
 *
 * @param input - Current order form prices and market reference.
 * @returns Typed issues with field ownership.
 */
export const getOrderFormFieldIssues = ({
  orderType,
  direction,
  triggerPrice,
  limitPrice,
  midPrice,
  szDecimals,
}: {
  orderType: OrderType;
  direction: 'long' | 'short';
  triggerPrice?: string;
  limitPrice?: string;
  midPrice: number;
  szDecimals?: number;
}): OrderFormFieldIssue[] => {
  const issues: OrderFormFieldIssue[] = [];
  const triggerIssue = getTriggerPriceValidationIssue({
    orderType,
    direction,
    triggerPrice,
    midPrice,
    szDecimals,
  });
  if (triggerIssue) {
    issues.push({ field: 'triggerPrice', issue: triggerIssue });
  }

  const limitIssue = getLimitPriceValidationIssue({
    orderType,
    direction,
    limitPrice,
    triggerPrice,
    szDecimals,
  });
  if (limitIssue) {
    issues.push({ field: 'limitPrice', issue: limitIssue });
  }

  return issues;
};

/**
 * Localized helper copy for a trigger-price issue.
 *
 * @param issue - Result of `getTriggerPriceValidationIssue`.
 * @returns User-facing helper text.
 */
export const getTriggerPriceValidationMessage = (
  issue: TriggerPriceValidationIssue,
): string => {
  if (issue.code === 'required') {
    return strings('perps.order.validation.please_set_a_trigger_price');
  }
  if (issue.code === 'positive') {
    return strings('perps.errors.orderValidation.triggerPricePositive');
  }
  return strings(TRIGGER_WRONG_SIDE_KEYS[issue.requiredSide]);
};

/**
 * Localizes a typed limit-price issue.
 *
 * @param issue - Limit-price validation issue.
 * @returns User-facing helper text.
 */
export const getLimitPriceValidationMessage = (
  issue: LimitPriceValidationIssue,
): string => {
  if (issue.code === 'required') {
    return strings('perps.order.validation.limit_price_required');
  }
  if (issue.code === 'positive') {
    return strings('perps.errors.orderValidation.pricePositive');
  }
  return strings(
    issue.requiredRelation === 'at_or_above'
      ? 'perps.order.validation.limit_price_must_be_at_or_above_trigger'
      : 'perps.order.validation.limit_price_must_be_at_or_below_trigger',
  );
};

/**
 * Localizes any field-owned order-price issue.
 *
 * @param issue - Typed field issue.
 * @returns User-facing helper text.
 */
export const getOrderFormFieldIssueMessage = (
  issue: OrderFormFieldIssue,
): string =>
  issue.field === 'triggerPrice'
    ? getTriggerPriceValidationMessage(issue.issue)
    : getLimitPriceValidationMessage(issue.issue);

/**
 * Non-blocking warning when a limit price would cross the book and execute as a
 * market order rather than resting. Equality is not a warning.
 *
 * The reference price differs by placement because the two reach the book at
 * different moments. A plain limit reaches it immediately, so it is compared to
 * the live mid. A trigger-limit rests off-book until its trigger fires, at which
 * point the market is at the trigger — so it is compared to the trigger, and the
 * mid at placement time is irrelevant. HyperLiquid documents this directly: a
 * stop closing a long with trigger $10 and limit $10 "would rest at $10 instead
 * of filling", while limit $8 against the same trigger "is likely to fill". Do not collapse the
 * trigger branch into the mid comparison — the blocking trigger-vs-mid and
 * limit-vs-trigger rules force a valid stop-limit's price to the crossing side
 * of mid, so a mid-referenced warning would fire on every valid stop-limit.
 *
 * @param input - Order type, side, typed limit, live mid, and typed trigger.
 * @returns Localized warning copy, or `undefined`.
 */
export const getLimitPriceCrossingWarning = ({
  orderType,
  direction,
  limitPrice,
  midPrice,
  triggerPrice,
  szDecimals,
}: LimitPriceCrossingWarningInput): string | undefined => {
  if (!isLimitExecutionOrderType(orderType)) {
    return undefined;
  }

  const canonicalLimit = canonicalizeOrderPrice(limitPrice, szDecimals);
  const limit = Number.parseFloat(canonicalLimit ?? '');
  if (!(limit > 0)) {
    return undefined;
  }

  if (isTriggerOrderType(orderType)) {
    const canonicalTrigger = canonicalizeOrderPrice(triggerPrice, szDecimals);
    const trigger = Number.parseFloat(canonicalTrigger ?? '');
    if (!(trigger > 0)) {
      return undefined;
    }

    if (direction === 'long' && limit > trigger) {
      return strings(
        'perps.order.validation.trigger_limit_price_above_warning',
      );
    }
    if (direction === 'short' && limit < trigger) {
      return strings(
        'perps.order.validation.trigger_limit_price_below_warning',
      );
    }
    return undefined;
  }

  if (!(midPrice > 0)) {
    return undefined;
  }

  if (direction === 'long' && limit > midPrice) {
    return strings('perps.order.validation.limit_price_above_warning');
  }
  if (direction === 'short' && limit < midPrice) {
    return strings('perps.order.validation.limit_price_below_warning');
  }

  return undefined;
};
