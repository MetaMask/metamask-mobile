import { BigNumber } from 'bignumber.js';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import {
  SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES,
  type SwapsLimitOrderExpirationMinutes,
} from '../../constants/limitOrders';
import type { BridgeToken } from '../../types';
import { isTokenSupportedForNonMarketSwapTab } from '../tokenUtils';
import { getLimitOrderTokens } from './getLimitOrderTokens';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

/**
 * How far past a preset an order's lifetime may run and still count as that
 * preset, to absorb clock drift between the servers that set its deadline and
 * its creation time.
 */
const EXPIRATION_CLOCK_SKEW_MINUTES = 1;

export interface LimitOrderDuplicateParams {
  sourceToken: BridgeToken;
  destToken: BridgeToken;
  /** The order's source amount, or `undefined` when it isn't usable. */
  sourceAmount: string | undefined;
  /** The expiration preset the order was placed with, if it can be told. */
  expirationMinutes: SwapsLimitOrderExpirationMinutes | undefined;
}

/**
 * Converts the order's source amount out of minimal units.
 *
 * @param order - The limit order.
 * @returns The amount, or `undefined` when it isn't a positive number.
 */
export function getLimitOrderDuplicateSourceAmount(
  order: LimitOrder,
): string | undefined {
  const amount = new BigNumber(order.src.amount).shiftedBy(
    -order.src.asset.decimals,
  );

  return amount.isFinite() && amount.gt(0) ? amount.toFixed() : undefined;
}

/**
 * Resolves the expiration preset an order was placed with. Its deadline is
 * set when its delegations are prepared, before it's signed and booked, so
 * its lifetime falls a little short of the preset. It's matched to the
 * shortest preset it fits in.
 *
 * @param timingData - The order's timestamps.
 * @returns The preset, or `undefined` when the lifetime is unusable or longer
 * than every preset.
 */
export function getLimitOrderDuplicateExpirationMinutes({
  createdAt,
  expiresAt,
}: LimitOrder['timingData']): SwapsLimitOrderExpirationMinutes | undefined {
  const lifetimeMinutes =
    (Date.parse(expiresAt) - Date.parse(createdAt)) / MILLISECONDS_PER_MINUTE;

  if (!Number.isFinite(lifetimeMinutes) || lifetimeMinutes <= 0) {
    return undefined;
  }

  return SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES.find(
    (preset) => lifetimeMinutes <= preset + EXPIRATION_CLOCK_SKEW_MINUTES,
  );
}

/**
 * Resolves the Limit tab inputs that place the same order again.
 *
 * @param options - The order, and what the Limit tab currently accepts.
 * @param options.order - The limit order.
 * @param options.enabledChainIds - The chains the Limit tab is enabled on.
 * @returns The inputs, or `undefined` when the Limit tab no longer accepts
 * the order's pair.
 */
export function getLimitOrderDuplicateParams({
  order,
  enabledChainIds,
}: {
  order: LimitOrder;
  enabledChainIds: CaipChainId[];
}): LimitOrderDuplicateParams | undefined {
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);

  if (
    !isTokenSupportedForNonMarketSwapTab(sourceToken, enabledChainIds) ||
    !isTokenSupportedForNonMarketSwapTab(destinationToken, enabledChainIds) ||
    formatChainIdToCaip(sourceToken.chainId) !==
      formatChainIdToCaip(destinationToken.chainId)
  ) {
    return undefined;
  }

  return {
    sourceToken,
    destToken: destinationToken,
    sourceAmount: getLimitOrderDuplicateSourceAmount(order),
    expirationMinutes: getLimitOrderDuplicateExpirationMinutes(
      order.timingData,
    ),
  };
}
