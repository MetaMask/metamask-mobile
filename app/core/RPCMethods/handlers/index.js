import requestEthereumAccounts from '../eth-request-accounts';
import wallet_addEthereumChain from '../wallet_addEthereumChain.js';
import wallet_switchEthereumChain from '../wallet_switchEthereumChain.js';
import wallet_watchAsset from '../wallet_watchAsset.ts';
import ethAccounts from '../eth_accounts';
import { MESSAGE_TYPE } from '../../createTracingMiddleware';

// TODO: [ffmcgee] Store these handlers elsewhere
const addEthereumChainHandler = {
  methodNames: [MESSAGE_TYPE.ADD_ETHEREUM_CHAIN],
  implementation: wallet_addEthereumChain,
  hookNames: {
    addNetwork: true,
    updateNetwork: true,
    getNetworkConfigurationByChainId: true,
    setActiveNetwork: true,
    requestUserApproval: true,
    getCurrentChainIdForDomain: true,
    getCaveat: true,
    requestPermittedChainsPermissionIncrementalForOrigin: true,
    rejectApprovalRequestsForOrigin: true,
  },
};
const switchEthereumChainHandler = {
  methodNames: [MESSAGE_TYPE.SWITCH_ETHEREUM_CHAIN],
  implementation: wallet_switchEthereumChain,
  hookNames: {
    getNetworkConfigurationByChainId: true,
    setActiveNetwork: true,
    requestUserApproval: true,
    getCaveat: true,
    getCurrentChainIdForDomain: true,
    requestPermittedChainsPermissionIncrementalForOrigin: true,
    setTokenNetworkFilter: true,
    hasApprovalRequestsForOrigin: true,
  },
};

const watchAssetHandler = {
  methodNames: [MESSAGE_TYPE.WATCH_ASSET],
  implementation: wallet_watchAsset,
  hookNames: {
    handleWatchAssetRequest: true,
  },
};

export const eip1193OnlyHandlers = [
  switchEthereumChainHandler,
  ethAccounts,
  requestEthereumAccounts,
];

export const localHandlers = [addEthereumChainHandler, watchAssetHandler];
