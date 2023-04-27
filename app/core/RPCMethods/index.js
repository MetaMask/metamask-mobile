import eth_sendTransaction from './eth_sendTransaction';
import wallet_addEthereumChain from './wallet_addEthereumChain.js';
import wallet_switchEthereumChain from './wallet_switchEthereumChain.js';

const RPCMethods = {
  eth_sendTransaction,
  wallet_addEthereumChain,
  wallet_switchEthereumChain,
};

export default RPCMethods;
