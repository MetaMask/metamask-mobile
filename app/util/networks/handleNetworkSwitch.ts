import { CurrencyRateController } from '@metamask/assets-controllers';
import { NetworkType } from '@metamask/controller-utils';
import { NetworkController } from '@metamask/network-controller';
import { getNetworkTypeById } from './index';
import Engine from '../../core/Engine';

/**
 * Switch to the given chain ID.
 *
 * @returns The network type of the build-in network switched to, or the
 * network ID of the custom network switched to, or undefined if no switch
 * occurred.
 */
const handleNetworkSwitch = (switchToChainId: string): string | undefined => {
  // If not specified, use the current network
  if (!switchToChainId) {
    return;
  }

  const currencyRateController = Engine.context
    .CurrencyRateController as CurrencyRateController;
  const networkController = Engine.context
    .NetworkController as NetworkController;

  // If current network is the same as the one we want to switch to, do nothing
  if (networkController.state.providerConfig.chainId === switchToChainId) {
    return;
  }

  const entry = Object.entries(
    networkController.state.networkConfigurations,
  ).find(([, { chainId: configChainId }]) => configChainId === switchToChainId);

  if (entry) {
    const [networkConfigurationId, networkConfiguration] = entry;
    const { ticker, nickname } = networkConfiguration;
    currencyRateController.setNativeCurrency(ticker);
    networkController.setActiveNetwork(networkConfigurationId);
    return nickname;
  }

  const networkType = getNetworkTypeById(switchToChainId);

  if (networkType) {
    currencyRateController.setNativeCurrency('ETH');
    // TODO: Align mobile and core types to remove this type cast
    networkController.setProviderType(networkType as NetworkType);
    return networkType;
  }
};

export default handleNetworkSwitch;
