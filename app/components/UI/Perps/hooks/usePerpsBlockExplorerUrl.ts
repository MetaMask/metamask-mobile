import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';

export interface UsePerpsBlockExplorerUrlResult {
  getExplorerUrl: (address?: string) => string | null;
  baseExplorerUrl: string | null;
}

/**
 * Hook to get Perps block explorer URL
 * @param defaultAddress - Optional default address to use if none provided to getExplorerUrl
 * @returns Object with getExplorerUrl function and baseExplorerUrl
 */
export const usePerpsBlockExplorerUrl = (
  defaultAddress?: string,
): UsePerpsBlockExplorerUrlResult => {
  const controller = Engine.context.PerpsController;
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  const baseExplorerUrl = useMemo(() => {
    try {
      return controller.getBlockExplorerUrl();
    } catch (error) {
      console.error('Failed to get base explorer URL:', error);
      return null;
    }
  }, [controller]);

  const getExplorerUrl = useCallback(
    (address?: string) => {
      try {
        const targetAddress = address || defaultAddress || selectedAddress;
        if (!targetAddress) {
          return null;
        }
        return controller.getBlockExplorerUrl(targetAddress);
      } catch (error) {
        console.error('Failed to get explorer URL:', error);
        return null;
      }
    },
    [controller, defaultAddress, selectedAddress],
  );

  return {
    getExplorerUrl,
    baseExplorerUrl,
  };
};
