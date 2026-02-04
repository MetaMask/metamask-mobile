///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  caveatSpecifications as snapsCaveatsSpecifications,
  endowmentCaveatSpecifications as snapsEndowmentCaveatSpecifications,
} from '@metamask/snaps-rpc-methods';
///: END:ONLY_INCLUDE_IF
import { RestrictedMethods } from './constants';
import {
  caip25CaveatBuilder,
  Caip25CaveatType,
  caip25EndowmentBuilder,
  createCaip25Caveat,
} from '@metamask/chain-agnostic-permission';

/**
 * This file contains the specifications of the permissions and caveats
 * that are recognized by our permission system. See the PermissionController
 * README in @metamask/snaps-controllers for details.
 */

/**
 * The "keys" of all of permissions recognized by the PermissionController.
 * Permission keys and names have distinct meanings in the permission system.
 */
export const PermissionKeys = Object.freeze({
  ...RestrictedMethods,
  permittedChains: 'endowment:permitted-chains',
});

/**
 * Factory functions for all caveat types recognized by the
 * PermissionController.
 */
export const CaveatFactories = Object.freeze({
  [Caip25CaveatType]: createCaip25Caveat,
});

/**
 * A PreferencesController identity object.
 *
 * @typedef {Object} Identity
 * @property {string} address - The address of the identity.
 * @property {string} name - The name of the identity.
 * @property {number} [lastSelected] - Unix timestamp of when the identity was
 * last selected in the UI.
 */

/**
 * Gets the specifications for all caveats that will be recognized by the
 * PermissionController.
 *
 * @param {{
 * listAccounts: () => import('@metamask/keyring-api').InternalAccount[],
 * findNetworkClientIdByChainId: (chainId: `0x${string}`) => string,
 * isNonEvmScopeSupported: (scope: import('@metamask/chain-agnostic-permission').InternalScopeString) => import('@metamask/utils').Json | unknown
 * getNonEvmAccountAddresses: (scope: import('@metamask/chain-agnostic-permission').InternalScopeString) => import('@metamask/utils').CaipAccountId[] | unknown,
 * }} options - Options bag.
 */
export const getCaveatSpecifications = ({
  listAccounts,
  findNetworkClientIdByChainId,
  isNonEvmScopeSupported,
  getNonEvmAccountAddresses,
}) => ({
  [Caip25CaveatType]: caip25CaveatBuilder({
    listAccounts,
    findNetworkClientIdByChainId,
    isNonEvmScopeSupported,
    getNonEvmAccountAddresses,
  }),
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  ...snapsCaveatsSpecifications,
  ...snapsEndowmentCaveatSpecifications,
  ///: END:ONLY_INCLUDE_IF
});

/**
 * Gets the specifications for all permissions that will be recognized by the
 * PermissionController.
 *
 */
export const getPermissionSpecifications = () => ({
  [caip25EndowmentBuilder.targetName]:
    caip25EndowmentBuilder.specificationBuilder({}),
});

/**
 * All unrestricted methods recognized by the PermissionController.
 * Unrestricted methods are ignored by the permission system, but every
 * JSON-RPC request seen by the permission system must correspond to a
 * restricted or unrestricted method, or the request will be rejected with a
 * "method not found" error.
 */
export const unrestrictedMethods = Object.freeze([
  'eth_blockNumber',
  'eth_call',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_signTypedData_v1',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'metamask_watchAsset',
  'net_peerCount',
  'web3_sha3',
  // Define unrestricted methods below to bypass PermissionController. These are eventually handled by RPCMethodMiddleware (User facing RPC methods)
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'wallet_revokePermissions',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_chainId',
  'eth_hashrate',
  'eth_mining',
  'net_listening',
  'net_version',
  'eth_requestAccounts',
  'eth_coinbase',
  'parity_defaultAccount',
  'eth_sendTransaction',
  'personal_sign',
  'personal_ecRecover',
  'parity_checkRequest',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'web3_clientVersion',
  'wallet_scanQRCode',
  'wallet_watchAsset',
  'metamask_showTutorial',
  'metamask_getProviderState',
  'metamask_logWeb3ShimUsage',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_sendCalls',
  'wallet_getCallsStatus',
  'wallet_getCapabilities',
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  'wallet_getAllSnaps',
  'wallet_getSnaps',
  'wallet_requestSnaps',
  'wallet_invokeSnap',
  'wallet_invokeKeyring',
  'snap_getClientStatus',
  'snap_clearState',
  'snap_endTrace',
  'snap_getFile',
  'snap_getState',
  'snap_listEntropySources',
  'snap_createInterface',
  'snap_updateInterface',
  'snap_getInterfaceState',
  'snap_getInterfaceContext',
  'snap_resolveInterface',
  'snap_setState',
  'snap_scheduleBackgroundEvent',
  'snap_startTrace',
  'snap_trackError',
  'snap_trackEvent',
  'snap_cancelBackgroundEvent',
  'snap_getBackgroundEvents',
  'snap_experimentalProviderRequest',
  'snap_openWebSocket',
  'snap_sendWebSocketMessage',
  'snap_closeWebSocket',
  'snap_getWebSockets',
  ///: END:ONLY_INCLUDE_IF
]);
