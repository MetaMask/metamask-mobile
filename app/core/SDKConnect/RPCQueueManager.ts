import { METHODS_TO_REDIRECT } from './SDKConnectConstants';
import DevLogger from './utils/DevLogger';

export class RPCQueueManager {
  private rpcQueue: { [id: string]: string } = {};

  add({ id, method }: { id: string; method: string }) {
    DevLogger.log(`RPCQueueManager::add id=${id} method=${method}`);
    this.rpcQueue[id] = method;
  }

  reset() {
    const queuLength = Object.keys(this.rpcQueue).length;
    if (queuLength > 0) {
      console.warn(
        `RPCQueueManager: ${queuLength} RPCs still in the queue`,
        this.rpcQueue,
      );
    }
    this.rpcQueue = {};
  }

  isEmpty() {
    return Object.keys(this.rpcQueue).length === 0;
  }

  /**
   * Check if the queue doesn't contains a redirectable RPC
   * if it does, we can't redirect the user to the app
   *
   * We also pass the current rpc method as a prameters because not all message are saved inside the rpcqueue.
   * For example metamask_getProviderState is sent directly to the backgroundBridge.
   */
  canRedirect({ method }: { method: string }) {
    const redirect = METHODS_TO_REDIRECT[method];
    Object.keys(this.rpcQueue).forEach((id) => {
      const rpcMethod = this.rpcQueue[id];
      if (METHODS_TO_REDIRECT[rpcMethod]) {
        return false;
      }
    });
    return redirect;
  }

  remove(id: string) {
    delete this.rpcQueue[id];
  }

  get() {
    return this.rpcQueue;
  }

  getId(id: string) {
    return this.rpcQueue?.[id];
  }
}

export default RPCQueueManager;
