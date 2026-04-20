import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

/**
 * Refresh orchestrator for CashTokensFullView pull-to-refresh.
 *
 * Refreshes EVM token data (balances, rates, detection) via performEvmTokenRefresh,
 * covering both useMusdBalance and useMusdConversionTokens derivations. Accepts an
 * optional Merkl bonus refetch callback so callers can reuse an existing
 * useMerklBonusClaim instance instead of spinning up a second one.
 */
export const useCashTokensRefresh = (refetchMerklBonus?: () => void) => {
  const [refreshing, setRefreshing] = useState(false);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchMerklBonus?.();
      await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [evmNetworkConfigurationsByChainId, refetchMerklBonus]);

  return { refreshing, onRefresh };
};
