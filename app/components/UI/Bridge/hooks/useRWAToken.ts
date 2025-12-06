import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa';
import { BridgeToken } from '../types';
import { useSelector } from 'react-redux';
import { isTokenInWorkingHours } from '../utils/ondoUtils';

export function useRWAToken() {
  // Check remote feature flag for RWA token enablement
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

  const isTokenTradingOpen = useCallback(
    async (token: BridgeToken) => await isTokenInWorkingHours(token),
    [],
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
