import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectIsInOffHoursTrading,
  selectIsStockMarketClosed,
} from '../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../reducers';

export const STOCK_MARKET_STATUS_POLL_MS = 60_000;

/**
 * Re-evaluates stock-RWA market status on a one-minute clock so off-hours and
 * fully-closed UI (banners, confirm gating) update when a trading window
 * opens or closes without requiring a token reselection.
 */
export function useStockMarketHours() {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(
      () => setNowMs(Date.now()),
      STOCK_MARKET_STATUS_POLL_MS,
    );
    return () => clearInterval(id);
  }, []);

  const isInOffHoursTrading = useSelector((state: RootState) =>
    selectIsInOffHoursTrading(state, nowMs),
  );
  const isStockMarketClosed = useSelector((state: RootState) =>
    selectIsStockMarketClosed(state, nowMs),
  );

  return { isInOffHoursTrading, isStockMarketClosed };
}
