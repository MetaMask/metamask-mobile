import { MESSAGE_TYPE } from '../../createTracingMiddleware';
import requestEthereumAccounts from '../eth-request-accounts';
import ethAccounts from '../eth_accounts';
import getProviderState from '../getProviderState';
import { wallet_addEthereumChain } from '../wallet_addEthereumChain';
import { wallet_watchAsset } from '../wallet_watchAsset';
import logWeb3ShimUsage from '../logWeb3ShimUsage';
import sendMetadata from '../sendMetadata';

// TODO: [ffmcgee] tsdocs why we want different handlers defined here for these two watchAsset and addEthereumCHain
const watchAssetHandler = (req, res, _, __, hooks) =>
  wallet_watchAsset({
    req,
    res,
    hostname: hooks.hostname,
    checkTabActive: hooks.checkTabActive,
  });

const addEthereumChainHandler = (req, res, _, __, hooks) =>
  wallet_addEthereumChain({
    req,
    res,
    requestUserApproval: hooks.requestUserApproval,
    analytics: hooks.analytics,
    hooks,
  });

const caipWatchAsset = {
  methodNames: [MESSAGE_TYPE.WATCH_ASSET, MESSAGE_TYPE.WATCH_ASSET_LEGACY],
  implementation: watchAssetHandler,
  hookNames: {
    hostname: true,
    checkActiveTab: true,
  },
};

const caipAddEthereumChain = {
  methodNames: [MESSAGE_TYPE.ADD_ETHEREUM_CHAIN],
  implementation: addEthereumChainHandler,
  hookNames: {
    getCaveat: true,
    getNetworkConfigurationByChainId: true,
    hasApprovalRequestsForOrigin: true,
    toNetworkConfiguration: true,
    requestUserApproval: true,
    requestPermittedChainsPermissionIncrementalForOrigin: true,
    rejectApprovalRequestsForOrigin: true,
  },
};

export const eip1193OnlyHandlers = [ethAccounts, requestEthereumAccounts];

export const multichainLocalHandlers = [
  caipWatchAsset,
  caipAddEthereumChain,
  getProviderState,
  logWeb3ShimUsage,
  sendMetadata,
];
