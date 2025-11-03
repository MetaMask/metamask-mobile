import { useSelector } from 'react-redux';
import { DepositOrder } from '@consensys/native-ramps-sdk';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { CaipChainId } from '@metamask/utils';

/**
 * Hook that returns a function to get the human-readable network name for a deposit order
 *
 * The returned function uses the following priority order:
 * 1. Network name from the deposit order
 * 2. Network name from network configurations (for custom/added networks)
 * 3. 'Unknown Network' as final fallback
 *
 * @returns A function that takes a deposit order and returns the network name
 */
export function useDepositOrderNetworkName() {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return (depositOrder: DepositOrder | undefined): string => {
    if (!depositOrder?.network) {
      return 'Unknown Network';
    }

    const depositNetwork = depositOrder.network;
    const chainId = depositNetwork.chainId;

    return (
      depositNetwork.name ||
      networkConfigurations[chainId as CaipChainId]?.name ||
      'Unknown Network'
    );
  };
}
