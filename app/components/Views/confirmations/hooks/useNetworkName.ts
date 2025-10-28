import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import NetworkList from '../../../../util/networks';

export function useNetworkName(chainId: Hex | undefined) {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  if (!chainId) {
    return undefined;
  }

  const nickname = networkConfigurations[chainId]?.name;

  const name = Object.values(NetworkList).find(
    (network: { chainId?: Hex; shortName: string }) =>
      network.chainId === chainId,
  )?.shortName;

  return name ?? nickname ?? chainId;
}
