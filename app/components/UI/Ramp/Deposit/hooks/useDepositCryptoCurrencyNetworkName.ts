import { useSelector } from 'react-redux';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

/**
 * Hook that returns a function to get the human-readable network name for a deposit cryptocurrency
 *
 * The returned function looks up the network name from network configurations by CAIP chain ID.
 * Falls back to the chainId itself if not found, or 'Unknown Network' if no chainId provided.
 *
 * @returns A function that takes a chainId and returns the network name
 */
export function useDepositCryptoCurrencyNetworkName() {
  const networkConfigurationsByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return (chainId?: string): string => {
    if (!chainId) {
      return 'Unknown Network';
    }
    return (
      networkConfigurationsByCaipChainId[chainId as `${string}:${string}`]
        ?.name || chainId
    );
  };
}
