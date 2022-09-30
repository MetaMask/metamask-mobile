import Engine from './../../core/Engine';
import { getNetworkTypeById } from './index';

const handleNetworkSwitch = (
  switchToChainId: string,
  frequentRpcList: {
    rpcUrl: string;
    chainId: string;
    ticker: string;
    nickname: string;
  }[],
): string | undefined => {
  const { NetworkController, CurrencyRateController } = Engine.context as any;

  // If not specified, use the current network
  if (!switchToChainId) {
    const error = 'Missing network id';
    throw new Error(error);
  }

  // If current network is the same as the one we want to switch to, do nothing
  if (NetworkController?.state?.provider?.chainId === String(switchToChainId)) {
    const error = 'Already in current network';
    throw new Error(error);
  }

  const rpc = frequentRpcList.find(
    ({ chainId }: { chainId: string }) => chainId === switchToChainId,
  );

  if (rpc) {
    const { rpcUrl, chainId, ticker, nickname } = rpc;
    CurrencyRateController.setNativeCurrency(ticker);
    NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
    return nickname;
  }

  const networkType = getNetworkTypeById(switchToChainId);

  if (networkType) {
    CurrencyRateController.setNativeCurrency('ETH');
    NetworkController.setProviderType(networkType);
    return networkType;
  }
};

export default handleNetworkSwitch;
