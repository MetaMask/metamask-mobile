import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa';
import { BridgeToken } from '../types';
import { useSelector } from 'react-redux';

export function useRWAToken() {
  // Check remote feature flag for RWA token enablement
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

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
      const currentTime = new Date();
      const openingHour = token.metadata?.market.openingHour;
      const closingHour = token.metadata?.market.closingHour;
      if (
        openingHour &&
        closingHour &&
        (currentTime < openingHour || currentTime > closingHour)
      ) {
        return false;
      }
      return true;
    },
    [isRWAEnabled],
  );

  /**
   * Checks if the token is a stock token
   * @returns {boolean} - True if the token is a stock token, false otherwise
   */
  const isStockToken = useCallback(
    (token: BridgeToken) => {
      // If RWA is not enabled, always return false
      if (!isRWAEnabled) {
        return false;
      }

      return Boolean(token.metadata?.assetType === 'stock');
    },
    [isRWAEnabled],
  );

  const isAssetStockToken = useCallback(
    (asset: unknown) => Boolean((asset as BridgeToken).name?.includes('Ondo')),
    [],
  );

  return {
    isStockToken,
    isTokenTradingOpen,
    isAssetStockToken,
  };
}
