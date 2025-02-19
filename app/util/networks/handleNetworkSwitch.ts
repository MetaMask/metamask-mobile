import { toHex } from '@metamask/controller-utils';
import Engine from '../../core/Engine';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../selectors/networkController';
import { store } from '../../store';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';

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

  const multichainNetworkController = Engine.context
    .MultichainNetworkController as MultichainNetworkController;
  const chainId = selectEvmChainId(store.getState());
  const networkConfigurations = selectEvmNetworkConfigurationsByChainId(
    store.getState(),
  );

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
    multichainNetworkController.setActiveNetwork(networkClientId);

    return nickname;
  }
};

export { handleNetworkSwitch };
