import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa';
import { BridgeToken } from '../types';
import { useSelector } from 'react-redux';
import { isTokenInWorkingHours } from '../utils/ondoUtils';

export function useRWAToken({ token }: { token: BridgeToken }) {
  // Check remote feature flag for RWA token enablement
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

  const isTokenTradingOpen = useCallback(
    async () => await isTokenInWorkingHours(token),
    [token],
  );

  /**
   * Checks if the token is a stock token
   * @returns {boolean} - True if the token is a stock token, false otherwise
   */
  const isStockToken = useCallback(() => {
    // If RWA is not enabled, always return false
    if (!isRWAEnabled) {
      return false;
    }

    return Boolean(token.aggregators?.includes('Ondo'));
  }, [isRWAEnabled, token]);

  return {
    isStockToken,
    isTokenTradingOpen,
  };
}
