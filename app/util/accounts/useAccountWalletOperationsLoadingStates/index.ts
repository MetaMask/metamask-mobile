import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useAccountsOperationsLoadingStates } from '../useAccountsOperationsLoadingStates';
import { AccountWalletId } from '@metamask/account-api';
import { selectWalletStatus } from '../../../selectors/multichainAccounts/accountTreeController';

export const useAccountWalletOperationsLoadingStates = (
  walletId: AccountWalletId,
) => {
  const {
    isAccountSyncingInProgress,
    areAnyOperationsLoading: areAnyAccountsOperationsLoading,
    loadingMessage: accountsOperationsLoadingMessage,
  } = useAccountsOperationsLoadingStates();

  const walletStatus = useSelector(selectWalletStatus)(walletId);

  // We order by priority, the first one that matches will be shown
  const loadingMessage = useMemo(() => {
    // Any global operations on accounts take precedence over the wallet status.
    if (isAccountSyncingInProgress) {
      return accountsOperationsLoadingMessage;
    }

    if (walletStatus !== null) {
      switch (walletStatus) {
        case 'in-progress:alignment':
          return 'Alignment in progress...';
        case 'in-progress:discovery':
          return 'Discovery in progress...';
        case 'in-progress:create-accounts':
          return 'Creating accounts...';
        default:
          return undefined;
      }
    }

    return undefined;
  }, [
    isAccountSyncingInProgress,
    accountsOperationsLoadingMessage,
    walletStatus,
  ]);

  // If there's any valid loading message, then an operation is on-going.
  const areAnyOperationsLoading = useMemo(
    () => areAnyAccountsOperationsLoading || loadingMessage,
    [areAnyAccountsOperationsLoading, loadingMessage],
  );

  return {
    areAnyOperationsLoading,
    loadingMessage,
  };
};
