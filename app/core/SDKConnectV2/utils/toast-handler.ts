import { strings } from '../../../../locales/i18n';
import { showSimpleNotification } from '../../../actions/notification';
import { store } from '../../../store';
import { RPCMethodResult } from '@metamask/sdk-communication-layer';
import { JsonRpcRequest } from '@metamask/utils';
import { EVM_READ_ONLY_METHODS } from './evm-read-only-methods';

/**
 * Handles tracking and displaying toast notifications for SDKConnectV2 requests.
 * Maintains a list of pending JSON-RPC requests that require user attention,
 * and triggers a "Return to App" toast after the user accepts the request.
 */
export class ToastHandler {
  /**
   * Array of pending JSON-RPC requests
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
        ? // TODO (wenfix): fix before merge
          // @ts-expect-error type mismatch
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
        this.showReturnToAppToast(payload);
      }

      // TODO (wenfix): how should we handle errors?
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

  /**
   * Displays a "Return to App" toast notification.
   *
   * @param payload - The JSON-RPC response payload.
   */
  private showReturnToAppToast(payload: RPCMethodResult) {
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
}
