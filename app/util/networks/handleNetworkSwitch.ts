import { toHex } from '@metamask/controller-utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import { isNonEvmChainId } from '../../core/Multichain/utils';

/**
 * Switch to the given chain ID.
 *
 * @param switchToChainId - This chain ID has a decimal format, usually provided from deeplinks
 * @returns The network name of the network switched to (i.e. the network type
 * or nickname, for built-in or custom networks respectively), or undefined if
 * no switch occurred.
 */
const handleNetworkSwitch = (switchToChainId: string): string | undefined => {
  // If not specified, use the current network
  if (!switchToChainId) {
    return;
  }

  const chainId = selectChainId(store.getState());
  const networkConfigurations = selectNetworkConfigurations(store.getState());

  // If current network is the same as the one we want to switch to, do nothing
  if (!isNonEvmChainId(switchToChainId)) {
    if (chainId === toHex(switchToChainId)) {
      return;
    }
  }
  const entry = Object.entries(networkConfigurations).find(
    ([, { chainId: configChainId }]) =>
      configChainId === toHex(switchToChainId),
  );

  if (entry && !isNonEvmChainId(entry[1].chainId)) {
    const [, { name: nickname, rpcEndpoints, defaultRpcEndpointIndex }] =
      entry as unknown as [string, NetworkConfiguration];

    const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];
    Engine.context.MultichainNetworkController.setActiveNetwork({
      evmClientId: networkClientId,
    });

    return nickname;
  }
  // If is already in the same non evm network, do nothing
  if (chainId === switchToChainId) {
    return;
  }

  if (entry && isNonEvmChainId(entry[1].chainId)) {
    const [, { name: nickname }] = entry;
    Engine.context.MultichainNetworkController.setActiveNetwork({
      nonEvmChainId: entry[1].chainId,
    });
    return nickname;
  }
};

export { handleNetworkSwitch };
