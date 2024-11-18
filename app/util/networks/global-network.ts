import EthQuery from '@metamask/eth-query';
import {
  NetworkClientId,
  NetworkController,
} from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../core/Engine';

export function getGlobalEthQuery(
  networkController?: NetworkController,
): EthQuery {
  const finalController = networkController ?? Engine.context.NetworkController;
  const { provider } = finalController.getSelectedNetworkClient() ?? {};

  if (!provider) {
    throw new Error('No selected network client');
  }

  return new EthQuery(provider);
}

export function getGlobalChainId(networkController?: NetworkController): Hex {
  const finalController = networkController ?? Engine.context.NetworkController;

  return finalController.getNetworkClientById(
    getGlobalNetworkClientId(finalController),
  ).configuration.chainId;
}

export function getGlobalNetworkClientId(
  networkController?: NetworkController,
): NetworkClientId {
  const finalController = networkController ?? Engine.context.NetworkController;
  return finalController.state.selectedNetworkClientId;
}
