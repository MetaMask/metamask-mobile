import { useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { isCaipChainId, CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';

export function useAggregatorOrderNetworkName() {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return (order: Order | undefined): string | undefined => {
    const shortName = order?.cryptoCurrency?.network?.shortName;
    if (shortName) {
      return shortName;
    }

    const chainId = order?.cryptoCurrency?.network?.chainId;
    if (!chainId) {
      return undefined;
    }

    let caipChainId: CaipChainId | undefined;

    try {
      if (isCaipChainId(chainId)) {
        caipChainId = chainId;
      } else if (chainId.startsWith('0x')) {
        caipChainId = toEvmCaipChainId(chainId as `0x${string}`);
      } else if (!isNaN(Number(chainId))) {
        caipChainId = toEvmCaipChainId(toHex(chainId));
      }
    } catch (error) {
      return undefined;
    }

    if (caipChainId && networkConfigurations[caipChainId]) {
      return networkConfigurations[caipChainId].name;
    }

    return undefined;
  };
}
