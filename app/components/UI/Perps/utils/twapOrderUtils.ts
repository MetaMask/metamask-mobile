import type { TwapOrder } from '@metamask/perps-controller';
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
