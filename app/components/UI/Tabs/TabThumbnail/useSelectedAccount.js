import { useMemo } from 'react';
import { useAccounts } from '../../../hooks/useAccounts';

export default useSelectedAccount = () => {
  const { accounts } = useAccounts();

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.isSelected) ?? undefined,
    [accounts],
  );

  return selectedAccount;
};
