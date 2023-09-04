import type { NetworkController } from '@metamask/network-controller';
import { getNetworkTypeById } from './index';
import type { CurrencyRateController } from '@metamask/assets-controllers';

const handleNetworkSwitch = (
  switchToChainId: string,
  {
    networkController,
    currencyRateController,
  }: {
    networkController: NetworkController;
    currencyRateController: CurrencyRateController;
  },
): string | undefined => {
  // If not specified, use the current network
  if (!switchToChainId) {
    return;
  }

  // If current network is the same as the one we want to switch to, do nothing
  if (
    networkController?.state?.providerConfig?.chainId ===
    String(switchToChainId)
  ) {
    return;
  }

  const entry = Object.entries(
    networkController.state.networkConfigurations,
  ).find(([, { chainId }]) => chainId === switchToChainId);

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
    networkController.setProviderType(networkType);
    return networkType;
  }
};

export default handleNetworkSwitch;
