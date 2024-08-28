import eth_sendTransaction from './eth_sendTransaction';
import wallet_addEthereumChain from './wallet_addEthereumChain';
import wallet_switchEthereumChain from './wallet_switchEthereumChain';
import wallet_watchAsset from './wallet_watchAsset';

interface RPCMethodsType {
  eth_sendTransaction: typeof eth_sendTransaction;
  wallet_addEthereumChain: typeof wallet_addEthereumChain;
  wallet_switchEthereumChain: typeof wallet_switchEthereumChain;
  wallet_watchAsset: typeof wallet_watchAsset;
}

const RPCMethods: RPCMethodsType = {
  eth_sendTransaction,
  wallet_addEthereumChain,
  wallet_switchEthereumChain,
  wallet_watchAsset,
};

export default RPCMethods;
