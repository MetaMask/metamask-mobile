import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';

/**
 * Hook that returns the account group name when multichain accounts state 2 is enabled.
 * Returns null when the feature is disabled or no account group is selected.
 */
export const useAccountGroupName = () => {
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);

  return useMemo(() => {
    if (isMultichainAccountsState2Enabled && selectedAccountGroup) {
      return selectedAccountGroup.metadata.name;
    }
    return null;
  }, [isMultichainAccountsState2Enabled, selectedAccountGroup]);
};
