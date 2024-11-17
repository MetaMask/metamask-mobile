import EthQuery from '@metamask/eth-query';
import {
  NetworkClientId,
  NetworkController,
} from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../core/Engine';

/**
 * @deprecated Avoid new references to the global network.
 * Will be removed once multi-chain support is fully implemented.
 * @returns An instance of EthQuery for the currently selected network.
 */
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

/**
 * @deprecated Avoid new references to the global network.
 * Will be removed once multi-chain support is fully implemented.
 * @returns The chain ID of the currently selected network.
 */
export function getGlobalChainId(networkController?: NetworkController): Hex {
  const finalController = networkController ?? Engine.context.NetworkController;

  return finalController.getNetworkClientById(
    getGlobalNetworkClientId(finalController),
  ).configuration.chainId;
}

/**
 * @deprecated Avoid new references to the global network.
 * Will be removed once multi-chain support is fully implemented.
 * @returns The ID of the currently selected network client.
 */
export function getGlobalNetworkClientId(
  networkController?: NetworkController,
): NetworkClientId {
  const finalController = networkController ?? Engine.context.NetworkController;
  return finalController.state.selectedNetworkClientId;
}
