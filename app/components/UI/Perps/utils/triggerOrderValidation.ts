import {
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

export interface TriggerPriceValidationInput {
  orderType: OrderType;
  direction: 'long' | 'short';
  triggerPrice: string | undefined;
  /** Live mid used only for placement-side checks; mark activates on venue. */
  midPrice: number;
}

export interface LimitPriceCrossingWarningInput {
  orderType: OrderType;
  direction: 'long' | 'short';
  limitPrice: string | undefined;
  midPrice: number;
}

const TRIGGER_WRONG_SIDE_KEYS = {
  stop: {
    above: 'perps.order.validation.stop_trigger_must_be_above_mid',
    below: 'perps.order.validation.stop_trigger_must_be_below_mid',
  },
  take_profit: {
    above: 'perps.order.validation.take_trigger_must_be_above_mid',
    below: 'perps.order.validation.take_trigger_must_be_below_mid',
  },
} as const;

/**
 * Required side of mid for a trigger placement.
 *
 * Hyperliquid: Stop Long `>` mid, Stop Short `<` mid; Take Long `<` mid,
 * Take Short `>` mid. Equality is invalid.
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
 * Client-only trigger-vs-mid check. The controller does not validate
 * direction against mid; Hyperliquid mark later activates the resting order.
 *
 * @param input - Order type, side, typed trigger, and live mid.
 * @returns A typed issue, or `undefined` when the trigger is valid or N/A.
 */
export const getTriggerPriceValidationIssue = ({
  orderType,
  direction,
  triggerPrice,
  midPrice,
}: TriggerPriceValidationInput): TriggerPriceValidationIssue | undefined => {
  if (!isTriggerOrderType(orderType)) {
    return undefined;
  }

  const trimmed = triggerPrice?.trim() ?? '';
  if (trimmed === '') {
    return { code: 'required' };
  }

  const trigger = Number.parseFloat(trimmed);
  if (!Number.isFinite(trigger) || trigger <= 0) {
    return { code: 'positive' };
  }

  if (!(midPrice > 0)) {
    return undefined;
  }

  const requiredSide = getRequiredTriggerSide(orderType, direction);
  const isOnValidSide =
    requiredSide === 'above' ? trigger > midPrice : trigger < midPrice;

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
 * Localized helper copy for a trigger-price issue.
 *
 * @param issue - Result of `getTriggerPriceValidationIssue`.
 * @returns User-facing helper text.
 */
export const getTriggerPriceValidationMessage = (
  issue: TriggerPriceValidationIssue,
): string => {
  if (issue.code === 'required') {
    return strings('perps.errors.orderValidation.triggerPriceRequired');
  }
  if (issue.code === 'positive') {
    return strings('perps.errors.orderValidation.triggerPricePositive');
  }
  return strings(TRIGGER_WRONG_SIDE_KEYS[issue.family][issue.requiredSide]);
};

/**
 * Non-blocking warning when a limit (or trigger-limit) price would cross mid
 * and may fill as a market order. Equality is not a warning.
 *
 * @param input - Order type, side, typed limit, and live mid.
 * @returns Localized warning copy, or `undefined`.
 */
export const getLimitPriceCrossingWarning = ({
  orderType,
  direction,
  limitPrice,
  midPrice,
}: LimitPriceCrossingWarningInput): string | undefined => {
  if (!isLimitExecutionOrderType(orderType)) {
    return undefined;
  }

  const limit = Number.parseFloat(limitPrice ?? '');
  if (!(limit > 0) || !(midPrice > 0)) {
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

/**
 * True when `message` is a trigger-form price helper that belongs under the
 * price card rather than in the notices list.
 *
 * @param message - Localized validation string.
 */
export const isTriggerFormPriceMessage = (message: string): boolean =>
  message === strings('perps.errors.orderValidation.triggerPriceRequired') ||
  message === strings('perps.errors.orderValidation.triggerPricePositive') ||
  message === strings('perps.errors.orderValidation.limitPriceRequired') ||
  message === strings('perps.order.validation.limit_price_required') ||
  message === strings('perps.order.validation.please_set_a_limit_price') ||
  message === strings(TRIGGER_WRONG_SIDE_KEYS.stop.above) ||
  message === strings(TRIGGER_WRONG_SIDE_KEYS.stop.below) ||
  message === strings(TRIGGER_WRONG_SIDE_KEYS.take_profit.above) ||
  message === strings(TRIGGER_WRONG_SIDE_KEYS.take_profit.below);
