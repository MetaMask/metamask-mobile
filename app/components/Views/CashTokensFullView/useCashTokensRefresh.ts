import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworks } from '../../../selectors/networkEnablementController';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

/**
 * Pull-to-refresh handler for CashTokensFullView.
 */
export const useCashTokensRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const selectedAccountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const enabledChainIds = useSelector(selectEnabledNetworks);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await performEvmTokenRefresh(
        selectedAccountGroupAccounts,
        enabledChainIds,
      );
    } catch (error) {
      Logger.error(error as Error, 'useCashTokensRefresh: refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [selectedAccountGroupAccounts, enabledChainIds]);

  return { refreshing, onRefresh };
};
