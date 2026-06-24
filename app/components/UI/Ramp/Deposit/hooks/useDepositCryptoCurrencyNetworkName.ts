import { useSelector } from 'react-redux';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

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
