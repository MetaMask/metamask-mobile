import { useSelector } from 'react-redux';
import { DepositOrder } from '@consensys/native-ramps-sdk';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { CaipChainId } from '@metamask/utils';

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
