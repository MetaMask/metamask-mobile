import BackgroundBridge from 'app/core/BackgroundBridge/BackgroundBridge';
import BatchRPCManager, { BatchRPCState } from '../BatchRPCManager';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import handleSendMessage from './handleSendMessage';
import RPCQueueManager from '../RPCQueueManager';

export const handleBatchRpcResponse = async ({
  chainRpcs,
  msg,
  rpcQueueManager,
  backgroundBridge,
  batchRpcManager,
  connection,
}: {
  chainRpcs: BatchRPCState;
  rpcQueueManager: RPCQueueManager;
  backgroundBridge?: BackgroundBridge;
  batchRpcManager: BatchRPCManager;
  connection: Connection;
  msg: any;
}): Promise<void> => {
  const isLastRpc = chainRpcs.index === chainRpcs.rpcs.length - 1;
  const hasError = msg?.data?.error;
  const origRpcId = parseInt(chainRpcs.baseId);
  const result = chainRpcs.rpcs
    .filter((rpc) => rpc.response !== undefined)
    .map((rpc) => rpc.response);
  result.push(msg?.data?.result);

  DevLogger.log(
    `handleChainRpcResponse origRpcId=${origRpcId} isLastRpc=${isLastRpc} hasError=${hasError}`,
    chainRpcs,
  );

  if (hasError) {
    // Cancel the whole chain if any of the rpcs fails, send previous responses with current error
    const data = {
      id: `${origRpcId}`,
      jsonrpc: '2.0',
      result,
      error: msg?.data?.error,
    };
    const response = {
      data,
      name: 'metamask-provider',
    };
    await handleSendMessage({
      msg: response,
      connection,
      backgroundBridge,
      batchRpcManager,
      rpcQueueManager,
    });
    // Delete the chain from the chainRPCManager
    batchRpcManager.remove(chainRpcs.baseId);
  } else if (isLastRpc) {
    // Respond to the original rpc call with the list of responses append the current response
    DevLogger.log(
      `handleChainRpcResponse id=${chainRpcs.baseId} result`,
      result,
    );
    const data = {
      id: `${origRpcId}`,
      jsonrpc: '2.0',
      result,
    };
    const response = {
      data,
      name: 'metamask-provider',
    };
    await handleSendMessage({
      msg: response,
      connection,
      backgroundBridge,
      batchRpcManager,
      rpcQueueManager,
    });
    // Delete the chain from the chainRPCManager
    batchRpcManager.remove(chainRpcs.baseId);
  } else {
    // Save response and send the next rpc method
    batchRpcManager.addResponse({
      id: chainRpcs.baseId,
      index: chainRpcs.index,
      response: msg?.data?.result,
    });

    // wait 1s before sending the next rpc method To give user time to process UI feedbacks
    await wait(1000);

    // Send the next rpc method to the background bridge
    const nextRpc = chainRpcs.rpcs[chainRpcs.index + 1];
    nextRpc.id = chainRpcs.baseId + `_${chainRpcs.index + 1}`; // Add index to id to keep track of the order
    nextRpc.jsonrpc = '2.0';
    DevLogger.log(
      `handleChainRpcResponse method=${nextRpc.method} id=${nextRpc.id}`,
      nextRpc.params,
    );

    backgroundBridge?.onMessage({
      name: 'metamask-provider',
      data: nextRpc,
      origin: 'sdk',
    });
  }
};

export default handleBatchRpcResponse;
