import { MESSAGE_TYPE } from '../../createTracingMiddleware';
import requestEthereumAccounts from '../eth-request-accounts';
import ethAccounts from '../eth_accounts';
import getProviderState from '../getProviderState';
import { makeMethodMiddlewareMaker } from '../utils';
import { wallet_addEthereumChain } from '../wallet_addEthereumChain';
import { wallet_watchAsset } from '../wallet_watchAsset';

/**
 * Wrapper handler for wallet_watchAsset to match expected format from {@link makeMethodMiddlewareMaker}.
 * Used by Multichain API, and to avoid breaking previously existing APIs and deliver at the desired dates, we follow this approach.
 * We should refactor original implementation in the future and updated all it's references to avoid having this extra piece.
 *
 * @param req - The JsonRpcEngine request
 * @param res - The JsonRpcEngine result object
 * @param _ - JsonRpcEngine next() callback - unused
 * @param __ - JsonRpcEngine end() callback - unused
 * @param hooks - Method hooks passed to the method implementation
 * @returns {void}
 */
const watchAssetHandler = (req, res, _, __, hooks) =>
  wallet_watchAsset({
    req,
    res,
    hostname: hooks.hostname,
    checkTabActive: hooks.checkTabActive,
  });

/**
 * Wrapper handler for wallet_addEthereumChain to match expected format from {@link makeMethodMiddlewareMaker}.
 * Used by Multichain API, and to avoid breaking previously existing APIs and deliver at the desired dates, we follow this approach.
 * We should refactor original implementation in the future and updated all it's references to avoid having this extra piece.
 *
 * @param req - The JsonRpcEngine request
 * @param res - The JsonRpcEngine result object
 * @param _ - JsonRpcEngine next() callback - unused
 * @param __ - JsonRpcEngine end() callback - unused
 * @param hooks - Method hooks passed to the method implementation
 * @returns {void}
 */
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
];
