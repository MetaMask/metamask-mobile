import React, { useMemo } from 'react';
import { formatPercentage } from '../../utils/formatUtils';
import { usePerpsLivePrices } from '../../hooks/stream';
import PerpsPillItem from './PerpsPillItem';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

const LIVE_PRICES_THROTTLE_MS = 3000;
const EMPTY_SYMBOLS: string[] = [];

type PerpsPillItemProps = React.ComponentProps<typeof PerpsPillItem>;

interface PerpsPillItemWithLiveDataProps extends PerpsPillItemProps {
  /** When false the WebSocket subscription is paused (e.g. off-screen). Defaults to true. */
  enabled?: boolean;
}

/**
 * Wraps PerpsPillItem with a live WebSocket price subscription so the
 * 24h percent-change badge updates in real time (every 3 s).
 *
 * Pass `enabled={false}` to skip the subscription when the pill is
 * off-screen, avoiding unnecessary WebSocket traffic.
 *
 * Drop-in replacement for PerpsPillItem wherever live data is desired.
 */
const PerpsPillItemWithLiveData: React.FC<PerpsPillItemWithLiveDataProps> = (
  props,
) => {
  const { item, enabled = true, ...rest } = props;
  const { market } = item;

  const livePrices = usePerpsLivePrices({
    symbols: enabled ? [market.symbol] : EMPTY_SYMBOLS,
    throttleMs: LIVE_PRICES_THROTTLE_MS,
  });

  const liveItem: PerpsFeedItem = useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice?.percentChange24h) {
      return item;
    }
    const changePercent = Number.parseFloat(livePrice.percentChange24h);
    if (Number.isNaN(changePercent)) {
      return item;
    }
    return {
      ...item,
      market: {
        ...market,
        change24hPercent: formatPercentage(changePercent),
      },
    };
  }, [item, market, livePrices]);

  return <PerpsPillItem {...rest} item={liveItem} />;
};

export default React.memo(PerpsPillItemWithLiveData);
