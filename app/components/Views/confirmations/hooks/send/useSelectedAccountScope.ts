import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';

interface SelectedAccountScope {
  account?: InternalAccount;
  isSolana?: boolean;
  isEvm?: boolean;
}

// This hook is temporary solution to handle separated send flows for evm and solana
// And will be removed after version `7.55`
export function useSelectedAccountScope(): SelectedAccountScope {
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const selectedAccountScope: SelectedAccountScope = {
    account: selectedAccount as InternalAccount,
    isSolana: undefined,
    isEvm: undefined,
  };

  if (!selectedAccount) {
    return selectedAccountScope;
  }

  const { type } = selectedAccount;

  if (type.includes('solana')) {
    selectedAccountScope.isSolana = true;
  } else if (type.includes('eip155')) {
    selectedAccountScope.isEvm = true;
  }

  return selectedAccountScope;
}
