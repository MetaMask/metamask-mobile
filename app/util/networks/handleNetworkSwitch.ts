import { toHex } from '@metamask/controller-utils';
import { NetworkController } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';

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

  const networkController = Engine.context
    .NetworkController as NetworkController;
  const chainId = selectChainId(store.getState());
  const networkConfigurations = selectNetworkConfigurations(store.getState());

  // If current network is the same as the one we want to switch to, do nothing
  if (chainId === toHex(switchToChainId)) {
    return;
  }

  const entry = Object.entries(networkConfigurations).find(
    ([, { chainId: configChainId }]) =>
      configChainId === toHex(switchToChainId),
  );

  if (entry) {
    const [, { name: nickname, rpcEndpoints, defaultRpcEndpointIndex }] = entry;

    const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];

    networkController.setActiveNetwork(networkClientId);
    return nickname;
  }
};

export { handleNetworkSwitch };
