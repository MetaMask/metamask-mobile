import {
  BASIS_POINTS_DIVISOR,
  type TwapOrder,
} from '@metamask/perps-controller';
import { BigNumber } from 'bignumber.js';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

type TwapOrderIdentity = Pick<TwapOrder, 'orderId' | 'providerId'>;
type TwapOrderDirection = Pick<TwapOrder, 'reduceOnly' | 'side'>;

/** Provider owning a TWAP, including legacy/default-provider rows. */
export const getTwapOrderProviderId = (
  twapOrder: TwapOrderIdentity,
): NonNullable<TwapOrder['providerId']> =>
  twapOrder.providerId ?? PROVIDER_CONFIG.DefaultProvider;

/** Stable identity for aggregated TWAP rows whose venue IDs may collide. */
export const getTwapOrderIdentityKey = (twapOrder: TwapOrderIdentity): string =>
  `${getTwapOrderProviderId(twapOrder)}:${twapOrder.orderId}`;

/**
 * Direction copy for opening and reduce-only TWAPs.
 *
 * A reduce-only buy closes a short; a reduce-only sell closes a long.
 */
export const getTwapDirectionLabelKey = (
  twapOrder: TwapOrderDirection,
): string => {
  if (twapOrder.reduceOnly) {
    return twapOrder.side === 'buy'
      ? 'perps.market.close_short'
      : 'perps.market.close_long';
  }

  return twapOrder.side === 'buy' ? 'perps.market.long' : 'perps.market.short';
};

/**
 * Restate a schedule's execution totals from its own slice fills when the
 * venue's snapshot lags behind them.
 *
 * HyperLiquid only rewrites a TWAP's `twapHistory` state on a lifecycle status
 * change, so a running schedule keeps reporting the `executedSz`/`executedNtl`
 * it was activated with — zero — while its slices fill. That leaves the card
 * showing nothing filled, no average price and 0% progress until the schedule
 * ends. The slice fills are delivered separately and stay current, so they are
 * the authoritative floor for what has executed.
 *
 * Totals are only ever raised: a venue snapshot that is ahead of the fills in
 * hand (capped or paginated fill history) stays authoritative. Fills summing
 * past the scheduled size are capped at it, and the notional is scaled by the
 * same cap so executed size, notional and average price stay in agreement.
 */
export const reconcileTwapOrderExecution = (
  twapOrder: TwapOrder,
): TwapOrder => {
  if (twapOrder.fills.length === 0) {
    return twapOrder;
  }

  let filledSize = new BigNumber(0);
  let filledNotional = new BigNumber(0);
  for (const fill of twapOrder.fills) {
    const size = new BigNumber(fill.size);
    filledSize = filledSize.plus(size);
    filledNotional = filledNotional.plus(size.multipliedBy(fill.price));
  }

  const totalSize = new BigNumber(twapOrder.size);
  const reportedSize = new BigNumber(twapOrder.executedSize);
  if (
    !filledSize.isFinite() ||
    !filledNotional.isFinite() ||
    !totalSize.isFinite()
  ) {
    return twapOrder;
  }
  // A non-numeric venue total is no evidence of execution, so treat it as zero
  // rather than letting it veto the fills we can actually account for.
  const venueSize = reportedSize.isFinite() ? reportedSize : new BigNumber(0);
  if (!filledSize.isGreaterThan(venueSize)) {
    return twapOrder;
  }

  const executedSize = totalSize.isGreaterThan(0)
    ? BigNumber.min(filledSize, totalSize)
    : filledSize;
  // Scale the notional with the cap so the row never reports a notional that
  // contradicts its own executed size and average price.
  const executedNotional = executedSize.isEqualTo(filledSize)
    ? filledNotional
    : filledNotional.multipliedBy(executedSize).dividedBy(filledSize);

  return {
    ...twapOrder,
    executedSize: executedSize.toFixed(),
    remainingSize: BigNumber.max(totalSize.minus(executedSize), 0).toFixed(),
    executedNotional: executedNotional.toFixed(),
    averagePrice: filledNotional.dividedBy(filledSize).toFixed(),
    fillProgressBps: totalSize.isGreaterThan(0)
      ? executedSize
          .dividedBy(totalSize)
          .multipliedBy(BASIS_POINTS_DIVISOR)
          .integerValue(BigNumber.ROUND_FLOOR)
          .toNumber()
      : twapOrder.fillProgressBps,
  };
};
