import requestEthereumAccounts from '../eth-request-accounts';
import wallet_addEthereumChain from '../wallet_addEthereumChain.js';
import wallet_switchEthereumChain from '../wallet_switchEthereumChain.js';
import wallet_watchAsset from '../wallet_watchAsset.ts';
import ethAccounts from '../eth_accounts';

export const eip1193OnlyHandlers = [
  wallet_switchEthereumChain,
  ethAccounts,
  requestEthereumAccounts,
];

export const localHandlers = [wallet_addEthereumChain, wallet_watchAsset];
