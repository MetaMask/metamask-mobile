import { useSelector } from 'react-redux';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../../selectors/assets/balances';

/**
 * Hook to check if the currently selected account has zero balance
 * across all mainnet networks (excludes testnets).
 *
 * @returns true if the account has zero balance, false otherwise
 */
const useIsZeroBalanceAccount = (): boolean => {
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );

  return (
    accountGroupBalance !== null &&
    accountGroupBalance.totalBalanceInUserCurrency === 0
  );
};

export default useIsZeroBalanceAccount;
