import { Hex } from '@metamask/utils';
import NetworkList from '../../../../util/networks';
import Engine from '../../../../core/Engine';

export const getNetworkName = (chainId?: Hex) => {
  if (!chainId) return 'Unknown Network';

  const { NetworkController } = Engine.context;

  const networkConfigurations =
    NetworkController.state.networkConfigurationsByChainId;

  const nickname = networkConfigurations[chainId]?.name;

  const name = Object.values(NetworkList).find(
    (network: { chainId?: Hex; shortName: string }) =>
      network.chainId === chainId,
  )?.shortName;

  return name ?? nickname ?? chainId;
};
