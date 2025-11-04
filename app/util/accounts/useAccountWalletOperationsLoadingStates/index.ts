import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useAccountsOperationsLoadingStates } from '../useAccountsOperationsLoadingStates';
import { AccountWalletId } from '@metamask/account-api';
import { strings } from '../../../../locales/i18n';
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
          // We use the same copy as discovery for this one, mainly cause alignment is
          // an internal and technical operation.
          return strings(
            'multichain_accounts.wallet_details.discovering_accounts',
          );
        case 'in-progress:discovery':
          return strings(
            'multichain_accounts.wallet_details.discovering_accounts',
          );
        case 'in-progress:create-accounts':
          return strings('multichain_accounts.wallet_details.creating_account');
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

  // If we have any valid message, then the wallet is busy with an operation.
  const isWalletOperationLoading = loadingMessage?.length > 0;

  // If there's any valid loading message, then an operation is on-going.
  const areAnyOperationsLoading = useMemo(
    () => areAnyAccountsOperationsLoading || isWalletOperationLoading,
    [areAnyAccountsOperationsLoading, isWalletOperationLoading],
  );

  return {
    areAnyOperationsLoading,
    loadingMessage,
  };
};
