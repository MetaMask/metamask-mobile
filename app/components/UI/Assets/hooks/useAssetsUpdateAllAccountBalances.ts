import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectEVMEnabledNetworks } from '../../../../selectors/networkEnablementController';
import Logger from '../../../../util/Logger';

/**
 * Assets hook to update balance state for ALL accounts when account lists are displayed.
 *
 * This hook ensures the Redux state contains current balance information for every account
 * across all enabled EVM networks, including both native currencies and tokens. This is
 * essential for account list components where users expect to see up-to-date balances
 * for all accounts without requiring manual interaction.
 *
 * The hook triggers TokenBalancesController.updateBalances() which is configured
 * with queryMultipleAccounts to update state for all accounts, not just the selected one.
 *
 * @returns Object containing updateBalances function for manual triggering if needed
 *
 * @example
 * ```tsx
 * const AccountListComponent = () => {
 *
 *   useAssetsUpdateAllAccountBalances();
 *
 *   return <AccountList />;
 * };
 * ```
 */
export const useAssetsUpdateAllAccountBalances = (): {
  updateBalances: () => Promise<void>;
} => {
  const enabledChainIds = useSelector(selectEVMEnabledNetworks);

  const updateBalances = useCallback(async () => {
    try {
      const { TokenBalancesController } = Engine.context;

      if (enabledChainIds.length > 0) {
        // Update balance state for ALL accounts across all enabled EVM chains
        // TokenBalancesController is configured with queryMultipleAccounts: true
        // so this will update balances for all accounts, not just the selected one
        await TokenBalancesController.updateBalances({
          chainIds: enabledChainIds,
          queryAllAccounts: true,
        });
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Error updating balances state for all accounts',
      );
    }
  }, [enabledChainIds]);

  // Automatically update balances when component mounts or enabled chains change
  useEffect(() => {
    updateBalances();
  }, [updateBalances]);

  return { updateBalances };
};

export default useAssetsUpdateAllAccountBalances;
