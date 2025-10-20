import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { useMemo } from 'react';
import { strings } from '../../../../locales/i18n';

export const useAccountsOperationsLoadingStates = () => {
  const isAccountSyncingInProgress = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.AccountTreeController
        .isAccountTreeSyncingInProgress,
  );

  const areAnyOperationsLoading = useMemo(
    () => isAccountSyncingInProgress,
    [isAccountSyncingInProgress],
  );

  // We order by priority, the first one that matches will be shown
  const loadingMessage = useMemo(() => {
    switch (true) {
      case isAccountSyncingInProgress:
        return strings('multichain_accounts.syncing');
      default:
        return undefined;
    }
  }, [isAccountSyncingInProgress]);

  return {
    areAnyOperationsLoading,
    isAccountSyncingInProgress,
    loadingMessage,
  };
};
