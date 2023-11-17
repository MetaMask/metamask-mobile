export class RPCQueueManager {
  private rpcQueue: { [id: string]: string } = {};

  add({ id, method }: { id: string; method: string }) {
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
