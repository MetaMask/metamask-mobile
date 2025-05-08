import { useMemo } from 'react';
import { useAccounts } from '../../../hooks/useAccounts';
import { Account } from './../../../hooks/useAccounts/useAccounts.types';

const useSelectedAccount = (): Account | undefined => {
  const { evmAccounts: accounts } = useAccounts();

  const selectedAccount = useMemo(
    () => accounts.find((account: Account) => account.isSelected),
    [accounts],
  );

  return selectedAccount;
};

export default useSelectedAccount;
