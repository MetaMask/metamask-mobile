import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { useAccountGroupName } from '../../../hooks/multichainAccounts/useAccountGroupName';

/**
 * Funding-account label used on Card unlink copy. Matches the Spending Limit
 * AccountRow chip: group name first, then the account metadata name.
 */
export function useFundingAccountName(): string {
  const accountGroupName = useAccountGroupName();
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  return accountGroupName ?? selectedAccount?.metadata.name ?? '';
}
