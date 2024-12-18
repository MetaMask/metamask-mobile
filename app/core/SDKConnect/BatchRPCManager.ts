import DevLogger from './utils/DevLogger';

export interface RPCMethod {
  id: string;
  method: string;
  params: unknown;
  jsonrpc: string;
  response?: unknown;
}

export interface BatchRPCState {
  baseId: string; // base rpc method id
  rpcs: RPCMethod[]; // list of depend rpcs methods
  index: number; // current rpc index
}

export class BatchRPCManager {
  // keep track of channelId which could be useful for debugging purpose
  private channelId: string;
  private rpcChain: {
    [id: string]: RPCMethod[]; // list of depend rpcs methods
  } = {}; // initial rpc method id as key and list of linked rpcs as value
  // Each rpc method depends on the previous one, so we need to keep track of the order
  // As soon as an error occur in any of the rpcs, we need to cancel the whole chain

  constructor(channelId: string) {
    this.channelId = channelId;
  }

  add({ id, rpcs }: { id: string; rpcs: RPCMethod[] }) {
    DevLogger.log(`BatchRPCManager::add id=${id} rpcs=`, rpcs);
    this.rpcChain[id] = rpcs;
  }

  addResponse({
    id,
    index,
    response,
  }: {
    id: string;
    index: number;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any;
  }) {
    if (this.rpcChain[id]) {
      this.rpcChain[id][index].response = response;
    } else {
      throw new Error(`RPC method ${id} not found in chain`);
    }
  }

  reset() {
    this.rpcChain = {};
  }

  remove(id: string) {
    delete this.rpcChain[id];
  }

  getAll() {
    return this.rpcChain;
  }

  getById(id: string) {
    if (id?.includes('_')) {
      // id format is baseId_index
      // extract index from base id
      const [baseId, index] = id.split('_');
      if (this.rpcChain[baseId]) {
        return {
          baseId,
          rpcs: this.rpcChain[baseId],
          index: parseInt(index, 10),
        };
      }
    }
    return undefined;
  }
}

export default BatchRPCManager;
