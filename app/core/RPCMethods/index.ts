import eth_sendTransaction from './eth_sendTransaction';
import wallet_addEthereumChain from './wallet_addEthereumChain';
import wallet_switchEthereumChain from './wallet_switchEthereumChain';
import wallet_watchAsset from './wallet_watchAsset';

const RPCMethods = {
  eth_sendTransaction,
  wallet_addEthereumChain,
  wallet_switchEthereumChain,
  wallet_watchAsset,
};

export default RPCMethods;
