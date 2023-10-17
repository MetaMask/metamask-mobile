export class RPCQueueManager {
  private rpcQueue: { [id: string]: string } = {};

  add({ id, method }: { id: string; method: string }) {
    this.rpcQueue[id] = method;
  }

  reset() {
    this.rpcQueue = {};
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
