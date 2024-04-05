import eth_sendTransaction from './eth_sendTransaction';
import wallet_addEthereumChain from './wallet_addEthereumChain.js';
import wallet_switchEthereumChain from './wallet_switchEthereumChain.js';
import wallet_watchAsset from './wallet_watchAsset.ts';

const RPCMethods = {
  eth_sendTransaction,
  wallet_addEthereumChain,
  wallet_switchEthereumChain,
  wallet_watchAsset,
};

export default RPCMethods;
