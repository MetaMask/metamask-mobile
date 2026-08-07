import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa/index';
import { useSelector } from 'react-redux';
import { BridgeToken } from '../types';
import { isStockRwaBridgeToken } from '../utils/isStockRwaBridgeToken';

type DateLike = string | null | undefined | Date;

function toMs(v: DateLike): number | null {
  if (!v) return null;
  const ms = new Date(v as string).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Checks whether a token is inside its regular market-hours window at `nowMs`.
 *
 * Uses the same wraparound logic as the legacy `isTokenTradingOpen` hook:
 * - nextClose > nextOpen → simple window [nextOpen, nextClose)
 * - nextClose < nextOpen → overnight/weekend wrap → open when nowMs < nextClose OR nowMs >= nextOpen
 *
 * Pauses (rwaData.nextPause) block regular-hours trading but do NOT affect off-hours trading.
 */
function isTokenInRegularHoursAt(
  token: BridgeToken | undefined,
  isRwaEnabled: boolean,
  nowMs: number,
): boolean {
  if (!isRwaEnabled || !token?.rwaData) return true;

  const nextOpenMs = toMs(token.rwaData.market?.nextOpen);
  const nextCloseMs = toMs(token.rwaData.market?.nextClose);
  if (nextOpenMs == null || nextCloseMs == null) return false;

  let marketIsOpen: boolean;
  if (nextCloseMs > nextOpenMs) {
    marketIsOpen = nowMs >= nextOpenMs && nowMs < nextCloseMs;
  } else {
    marketIsOpen = nowMs < nextCloseMs || nowMs >= nextOpenMs;
  }

  const pauseStartMs = toMs(token.rwaData.nextPause?.start);
  const pauseEndMs = toMs(token.rwaData.nextPause?.end);

  const inPause =
    (pauseStartMs != null &&
      nowMs >= pauseStartMs &&
      (pauseEndMs == null || nowMs < pauseEndMs)) ||
    (pauseStartMs == null && pauseEndMs != null && nowMs < pauseEndMs);

  return marketIsOpen && !inPause;
}

/**
 * Checks whether a stock RWA token is inside its off-hours trading window at `nowMs`.
 *
 * Off-hours windows follow the same wraparound logic as regular market hours.
 * Pauses do NOT apply to off-hours windows.
 *
 * Returns `false` for non-RWA tokens, when the feature flag is off, or when the
 * `offhours` field is absent from `rwaData`.
 */
export function isTokenInOffHoursAt(
  token: BridgeToken | undefined,
  isRwaEnabled: boolean,
  nowMs: number,
): boolean {
  if (!isRwaEnabled || !token?.rwaData?.offhours) return false;

  const nextOpenMs = toMs(token.rwaData.offhours.nextOpen);
  const nextCloseMs = toMs(token.rwaData.offhours.nextClose);
  if (nextOpenMs == null || nextCloseMs == null) return false;

  if (nextCloseMs > nextOpenMs) {
    return nowMs >= nextOpenMs && nowMs < nextCloseMs;
  }
  return nowMs < nextCloseMs || nowMs >= nextOpenMs;
}

/**
 * A token is tradable when it is either in regular market hours OR in its off-hours window.
 * Regular-hours pauses (nextPause) do NOT block off-hours trading.
 */
export function isTokenTradableAt(
  token: BridgeToken | undefined,
  isRwaEnabled: boolean,
  nowMs: number,
): boolean {
  if (!isRwaEnabled || !token?.rwaData) return true;

  return (
    isTokenInRegularHoursAt(token, isRwaEnabled, nowMs) ||
    isTokenInOffHoursAt(token, isRwaEnabled, nowMs)
  );
}

export function useRWAToken() {
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

  /**
   * True when the token is in regular market hours (not paused).
   * Kept for backward-compatibility; use `isTokenTradable` for gating.
   */
  const isTokenTradingOpen = useCallback(
    (token?: BridgeToken) =>
      isTokenInRegularHoursAt(token, isRWAEnabled, Date.now()),
    [isRWAEnabled],
  );

  /**
   * True when the token is a stock RWA and neither regular hours nor off-hours
   * are currently active. Only fully-closed tokens should trigger the market-closed modal.
   */
  const isTokenMarketFullyClosed = useCallback(
    (token?: BridgeToken) =>
      isStockRwaBridgeToken(token, isRWAEnabled) &&
      !isTokenTradableAt(token, isRWAEnabled, Date.now()),
    [isRWAEnabled],
  );

  /**
   * Checks if the token is a stock token
   */
  const isStockToken = useCallback(
    (token?: BridgeToken) => isStockRwaBridgeToken(token, isRWAEnabled),
    [isRWAEnabled],
  );

  return {
    isStockToken,
    isTokenTradingOpen,
    isTokenMarketFullyClosed,
  };
}
