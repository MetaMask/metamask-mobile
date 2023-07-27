import { getNetworkTypeById } from './index';
import type { NetworkController } from '@metamask/network-controller';
import type { PreferencesController } from '@metamask/preferences-controller';
import type { CurrencyRateController } from '@metamask/assets-controllers';

const handleNetworkSwitch = (
  switchToChainId: string,
  {
    networkController,
    currencyRateController,
    preferencesController,
  }: {
    networkController: NetworkController;
    currencyRateController: CurrencyRateController;
    preferencesController: PreferencesController;
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

  const rpc = preferencesController.state.frequentRpcList.find(
    ({ chainId }) => chainId === switchToChainId,
  );

  if (rpc) {
    const { rpcUrl, chainId, ticker, nickname } = rpc;
    currencyRateController.setNativeCurrency(ticker);
    networkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
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
