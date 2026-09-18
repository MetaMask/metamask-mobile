import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectCardPrimaryToken } from '../../../../selectors/cardController';
import {
  getMemoizedInternalAccountByAddress,
  selectSelectedInternalAccount,
} from '../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';
import { areAddressesEqual } from '../../../../util/address';
import { useAccountGroupName } from '../../../hooks/multichainAccounts/useAccountGroupName';

/**
 * Funding-account label used on Card unlink copy. Prefers the Card Home
 * funding wallet over the currently selected EVM account so revoke / unlink
 * toasts stay accurate when the user has switched accounts.
 */
export function useFundingAccountName(): string {
  const primaryToken = useSelector(selectCardPrimaryToken);
  const fundingWalletAddress = primaryToken?.walletAddress;
  const fundingAccount = useSelector((state: RootState) =>
    fundingWalletAddress
      ? getMemoizedInternalAccountByAddress(state, fundingWalletAddress)
      : undefined,
  );
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const selectedGroupName = useAccountGroupName();

  const account = fundingAccount ?? selectedAccount;
  if (!account) {
    return '';
  }

  const isSelectedFundingAccount =
    Boolean(selectedAccount) &&
    areAddressesEqual(account.address, selectedAccount?.address ?? '');

  if (isSelectedFundingAccount) {
    return selectedGroupName ?? account.metadata.name ?? '';
  }

  return (
    accountToGroupMap[account.id]?.metadata.name ?? account.metadata.name ?? ''
  );
}
