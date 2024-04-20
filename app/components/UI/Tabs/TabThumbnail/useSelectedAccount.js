import { useMemo } from 'react';
import { useAccounts } from '../../../hooks/useAccounts';

export const useSelectedAccount = () => {
  const { accounts } = useAccounts();

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.isSelected) ?? undefined;
  }, [accounts]);

  return selectedAccount;
};