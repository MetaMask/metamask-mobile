import { strings } from '../../../../locales/i18n';
import { showSimpleNotification } from '../../../actions/notification';
import { store } from '../../../store';
import { RPCMethodResult } from '@metamask/sdk-communication-layer';
import { JsonRpcRequest } from '@metamask/utils';

function showReturnToAppToast(payload: RPCMethodResult) {
  store.dispatch(
    showSimpleNotification({
      id: payload.id,
      autodismiss: 8000,
      title: strings('sdk_return_to_app_toast.returnToAppLabel'),
      description: null,
      status: 'success',
    }),
  );
}

// Read-only EVM methods - these query blockchain state without modifying it or requiring user action
export const EVM_READ_ONLY_METHODS = [
  // Balance & Account Info
  'eth_getBalance',
  'eth_getCode',
  'eth_getTransactionCount',

  // Block Information
  'eth_blockNumber',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',

  // Transaction Information
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionReceipt',

  // Contract Calls & Estimates
  'eth_call',
  'eth_estimateGas',

  // Storage & State
  'eth_getStorageAt',
  'eth_getProof',

  // Gas & Fees
  'eth_gasPrice',
  'eth_feeHistory',

  // Logs & Filters
  'eth_getLogs',
  'eth_getFilterLogs',
  'eth_getFilterChanges',
  'eth_newFilter',
  'eth_newBlockFilter',
  'eth_newPendingTransactionFilter',
  'eth_uninstallFilter',

  // Network Info
  'eth_chainId',
  'net_version',
  'net_listening',
  'net_peerCount',

  // Protocol Info
  'eth_protocolVersion',
  'eth_syncing',
  'eth_mining',
  'eth_hashrate',
  'eth_coinbase',
  'eth_getWork',

  // Utility
  'web3_sha3',
  'web3_clientVersion',
  'parity_defaultAccount',

  // Permissions (read-only)
  'wallet_getPermissions',
  'wallet_getCallsStatus',
  'wallet_getCapabilities',
];

/**
 * Handles tracking and displaying toast notifications for SDKConnectV2 requests.
 * Maintains a list of pending JSON-RPC requests that require user attention,
 * and triggers a "Return to App" toast when a relevant response is received.
 */
export class SdkToastHandler {
  /**
   * Array of pending JSON-RPC requests that are not read-only and may require user action.
   */
  public requests: JsonRpcRequest[] = [];

  /**
   * Adds a new JSON-RPC request to the pending requests list if it is not a read-only method.
   *
   * @param request - The JSON-RPC request object to add.
   */
  public addRequest(request: JsonRpcRequest) {
    const method =
      request.method === 'wallet_invokeMethod'
        ? //TODO (wenfix): fix before merge
          //@ts-expect-error type mismatch
          request.params?.request?.method
        : request.method;

    if (EVM_READ_ONLY_METHODS.includes(method)) {
      return;
    }

    this.requests.push(request);
  }

  /**
   * Handles a JSON-RPC response payload. If the response matches a pending request,
   * and there is no error, triggers a "Return to App" toast, clearing the request.
   *
   * @param payload - The JSON-RPC response payload.
   */
  public handleRequest(payload: RPCMethodResult) {
    if (this.requests.find((request) => request.id === payload.id)) {
      if (!payload.error) {
        showReturnToAppToast(payload);
      }

      //TODO (wenfix): how should we handle errors?
      this.removeRequest(payload.id);
    }
  }

  /**
   * Removes a request from the pending requests list by its ID.
   *
   * @param id - The ID of the request to remove.
   * @private
   */
  private removeRequest(id: string) {
    this.requests = this.requests.filter((request) => request.id !== id);
  }
}
