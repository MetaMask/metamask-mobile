import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa/index';
import { BridgeToken } from '../types';
import { useSelector } from 'react-redux';
import { TrendingAsset } from '@metamask/assets-controllers';

export type DateLike = string | null | undefined | Date;

export function useRWAToken() {
  // Check remote feature flag for RWA token enablement
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

  function toMs(v: DateLike): number | null {
    if (!v) return null;
    const ms = new Date(v as string).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  /**
   * Checks if the token is trading open
   * @param token - The token to check
   * @returns {boolean} - True if the token is trading open, false otherwise
   */
  const isTokenTradingOpen = useCallback(
    async (token: BridgeToken) => {
      if (!isRWAEnabled) {
        return true;
      }
      // compare the current time against the token metadata
      if (!token.rwaData) {
        return true;
      }
      const nextOpenMs = toMs(token.rwaData?.market?.nextOpen);
      const nextCloseMs = toMs(token.rwaData?.market?.nextClose);
      if (nextOpenMs == null || nextCloseMs == null) return false;

      const nowMs = new Date().getTime();

      const marketIsOpen = nextCloseMs < nextOpenMs && nowMs < nextCloseMs;

      const pauseStartMs = toMs(token.rwaData?.nextPause?.start);
      const pauseEndMs = toMs(token.rwaData?.nextPause?.end);

      const inPause =
        (pauseStartMs != null &&
          nowMs >= pauseStartMs &&
          (pauseEndMs == null || nowMs < pauseEndMs)) ||
        (pauseStartMs == null && pauseEndMs != null && nowMs < pauseEndMs);

      return marketIsOpen && !inPause;
    },
    [isRWAEnabled],
  );

  /**
   * Checks if the token is a stock token
   * @returns {boolean} - True if the token is a stock token, false otherwise
   */
  const isStockToken = useCallback(
    (token: BridgeToken | TrendingAsset) => {
      // If RWA is not enabled, always return false
      if (!isRWAEnabled) {
        return false;
      }

      return Boolean(token.rwaData?.instrumentType === 'stock');
    },
    [isRWAEnabled],
  );

  return {
    isStockToken,
    isTokenTradingOpen,
  };
}
