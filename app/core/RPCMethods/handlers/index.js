import requestEthereumAccounts from '../eth-request-accounts';
import { addEthereumChainHandler } from '../wallet_addEthereumChain.js';
import { switchEthereumChainHandler } from '../wallet_switchEthereumChain.js';
import { watchAssetHandler } from '../wallet_watchAsset.ts';
import ethAccounts from '../eth_accounts';

export const eip1193OnlyHandlers = [
  switchEthereumChainHandler,
  ethAccounts,
  requestEthereumAccounts,
];

export const localHandlers = [addEthereumChainHandler, watchAssetHandler];
