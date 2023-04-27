import { getNetworkTypeById } from './index';

const handleNetworkSwitch = (
  switchToChainId: string,
  frequentRpcList: {
    rpcUrl: string;
    chainId: string;
    ticker: string;
    nickname: string;
  }[],
  { networkController, currencyRateController }: any,
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

  const rpc = frequentRpcList.find(
    ({ chainId }: { chainId: string }) => chainId === switchToChainId,
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
