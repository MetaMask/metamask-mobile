import React, { useMemo } from 'react';
import { formatPercentage } from '../../utils/formatUtils';
import { usePerpsLivePrices } from '../../hooks/stream';
import PerpsPillItem from './PerpsPillItem';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

const LIVE_PRICES_THROTTLE_MS = 3000;

type PerpsPillItemProps = React.ComponentProps<typeof PerpsPillItem>;

/**
 * Wraps PerpsPillItem with a live WebSocket price subscription so the
 * 24h percent-change badge updates in real time (every 3 s).
 *
 * Drop-in replacement for PerpsPillItem wherever live data is desired.
 */
const PerpsPillItemWithLiveData: React.FC<PerpsPillItemProps> = (props) => {
  const { item } = props;
  const { market } = item;

  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
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

  return <PerpsPillItem {...props} item={liveItem} />;
};

export default React.memo(PerpsPillItemWithLiveData);
