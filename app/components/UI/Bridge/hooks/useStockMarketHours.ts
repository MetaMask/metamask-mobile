import { useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import {
  selectIsInOffHoursTrading,
  selectIsStockMarketClosed,
} from '../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../reducers';

export const STOCK_MARKET_STATUS_POLL_MS = 60_000;

interface StockMarketHoursClock {
  listeners: Set<() => void>;
  nowMs: number;
  intervalId: ReturnType<typeof setInterval> | undefined;
}

const stockMarketHoursClock: StockMarketHoursClock = {
  listeners: new Set(),
  nowMs: Date.now(),
  intervalId: undefined,
};

/**
 * Test-only: resets the shared clock so tests don't leak listeners or
 * intervals across cases.
 */
export const __resetStockMarketHoursClockForTest = () => {
  if (stockMarketHoursClock.intervalId !== undefined) {
    clearInterval(stockMarketHoursClock.intervalId);
  }
  stockMarketHoursClock.listeners.clear();
  stockMarketHoursClock.intervalId = undefined;
  stockMarketHoursClock.nowMs = Date.now();
};

const emitStockMarketHoursTick = () => {
  stockMarketHoursClock.nowMs = Date.now();
  stockMarketHoursClock.listeners.forEach((listener) => listener());
};

const subscribeStockMarketHoursClock = (listener: () => void) => {
  stockMarketHoursClock.listeners.add(listener);

  if (stockMarketHoursClock.intervalId === undefined) {
    stockMarketHoursClock.nowMs = Date.now();
    stockMarketHoursClock.intervalId = setInterval(
      emitStockMarketHoursTick,
      STOCK_MARKET_STATUS_POLL_MS,
    );
  }

  return () => {
    stockMarketHoursClock.listeners.delete(listener);

    if (
      stockMarketHoursClock.listeners.size === 0 &&
      stockMarketHoursClock.intervalId !== undefined
    ) {
      clearInterval(stockMarketHoursClock.intervalId);
      stockMarketHoursClock.intervalId = undefined;
    }
  };
};

const getStockMarketHoursNowMs = () => stockMarketHoursClock.nowMs;

/**
 * Re-evaluates stock-RWA market status on a shared one-minute clock so
 * off-hours and fully-closed UI (banners, confirm gating) stay in lockstep
 * when a trading window opens or closes. A per-caller clock would diverge:
 * `SwapsConfirmButton` unmounts while quotes load, then remounts with a fresh
 * `Date.now()`, while banners keep their last tick for up to a minute.
 */
export function useStockMarketHours() {
  const nowMs = useSyncExternalStore(
    subscribeStockMarketHoursClock,
    getStockMarketHoursNowMs,
    getStockMarketHoursNowMs,
  );

  const isInOffHoursTrading = useSelector((state: RootState) =>
    selectIsInOffHoursTrading(state, nowMs),
  );
  const isStockMarketClosed = useSelector((state: RootState) =>
    selectIsStockMarketClosed(state, nowMs),
  );

  return { isInOffHoursTrading, isStockMarketClosed };
}
