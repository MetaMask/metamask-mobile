import { useEffect } from 'react';
import Engine from '../../../core/Engine';

/**
 * Custom hook to update token balances when EVM networks change
 * @param enabledEvmNetworks - Array of enabled EVM network chain IDs
 */
export const useTokenBalancesUpdate = (enabledEvmNetworks: `0x${string}`[]) => {
  useEffect(() => {
    const updateBalances = async () => {
      const { TokenBalancesController } = Engine.context;

      await TokenBalancesController.updateBalances({
        chainIds: enabledEvmNetworks,
        queryAllAccounts: true,
      });
    };

    updateBalances();
  }, [enabledEvmNetworks]);
};
