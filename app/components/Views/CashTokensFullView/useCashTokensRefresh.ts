import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

/**
 * Pull-to-refresh handler for CashTokensFullView.
 */
export const useCashTokensRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await performEvmTokenRefresh(evmNetworkConfigurationsByChainId);
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [evmNetworkConfigurationsByChainId]);

  return { refreshing, onRefresh };
};
