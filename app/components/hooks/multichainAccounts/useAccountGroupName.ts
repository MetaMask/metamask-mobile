import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';

/**
 * Hook that returns the account group name when multichain accounts state 2 is enabled.
 * Returns null when the feature is disabled or no account group is selected.
 */
export const useAccountGroupName = () => {
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);

  return useMemo(() => {
    if (selectedAccountGroup) {
      return selectedAccountGroup.metadata.name;
    }
    return null;
  }, [selectedAccountGroup]);
};
