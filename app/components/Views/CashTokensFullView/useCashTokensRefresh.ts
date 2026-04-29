import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

/**
 * Pull-to-refresh handler for CashTokensFullView.
 *
 * Reads the Merkl refetch from a ref at invocation time to avoid stale
 * closures — the caller populates the ref via onRefetchReady from
 * AssetOverviewClaimBonus.
 */
export const useCashTokensRefresh = (
  refetchMerklBonusRef: React.MutableRefObject<(() => void) | null>,
) => {
  const [refreshing, setRefreshing] = useState(false);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fire Merkl refetch first (non-blocking, lightweight single API call).
      // Read from ref to avoid closing over a potentially stale callback.
      refetchMerklBonusRef.current?.();
      await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [evmNetworkConfigurationsByChainId, refetchMerklBonusRef]);

  return { refreshing, onRefresh };
};
