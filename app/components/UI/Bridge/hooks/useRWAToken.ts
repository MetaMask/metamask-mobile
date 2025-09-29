import { useCallback } from 'react';
import { selectRWAEnabledFlag } from '../../../../selectors/featureFlagController/rwa';
import { BridgeToken } from '../types';
import { useSelector } from 'react-redux';

export function useRWAToken({ token }: { token: BridgeToken }) {
  // Check remote feature flag for RWA token enablement
  const isRWAEnabled = useSelector(selectRWAEnabledFlag);

  /**
   * Checks if the token is a stock token
   * @returns {boolean} - True if the token is a stock token, false otherwise
   */
  const isStockToken = useCallback(() => {
    // If RWA is not enabled, always return false
    if (!isRWAEnabled) {
      return false;
    }

    if (
      token.name?.toLowerCase().includes('ondo') ||
      token.name?.toLowerCase().includes('stock')
    ) {
      return true;
    }

    // return Boolean(token.aggregators?.includes('Ondo'));
    return false;
  }, [isRWAEnabled, token]);

  return {
    isStockToken,
  };
}
