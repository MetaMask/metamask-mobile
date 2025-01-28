import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';

export const getNetworkClientIdByChainId = (chainId: Hex) => {
  const networkConfiguration =
    Engine.context.NetworkController.getNetworkConfigurationByChainId(chainId);

  return networkConfiguration?.rpcEndpoints?.[
    networkConfiguration.defaultRpcEndpointIndex
  ]?.networkClientId;
};
