import { Platform } from 'react-native';
import Logger from '../../../util/Logger';
import BatchRPCManager from '../BatchRPCManager';
import { RPC_METHODS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import overwriteRPCWith from './handleRpcOverwrite';

export const handleCustomRpcCalls = async ({
  rpc,
  batchRPCManager,
  selectedAddress,
  selectedChainId,
}: {
  selectedAddress: string;
  selectedChainId: string;
  batchRPCManager: BatchRPCManager;
  rpc: { id: string; method: string; params: any[] };
}) => {
  const { id, method, params } = rpc;
  const lcMethod = method.toLowerCase();
  const processedMessage = { method, id, params, jsonrpc: '2.0' };
  DevLogger.log(
    `handleCustomRpcCalls selectedAddress=${selectedAddress} selectedChainId=${selectedChainId}`,
    processedMessage,
  );
  // Special case for metamask_connectSign
  if (lcMethod === RPC_METHODS.METAMASK_CONNECTWITH.toLowerCase()) {
    if (!(Array.isArray(params) && params.length > 0)) {
      throw new Error('Invalid message format');
    }

    if (Platform.OS === 'ios') {
      // TODO: why does ios (older devices) requires a delay after request is initially approved?
      await wait(1000);
    }

    const targetRpc = params[0];
    const wrapedRpc = overwriteRPCWith({
      rpc: targetRpc as any,
      accountAddress: selectedAddress,
      selectedChainId,
    });
    processedMessage.params = wrapedRpc.params;
    processedMessage.method = wrapedRpc.method;
  } else if (lcMethod === RPC_METHODS.METAMASK_CONNECTSIGN.toLowerCase()) {
    if (!(Array.isArray(params) && params.length > 0)) {
      throw new Error('Invalid message format');
    }

    if (Platform.OS === 'ios') {
      // TODO: why does ios (older devices) requires a delay after request is initially approved?
      await wait(1000);
    }

    processedMessage.method = RPC_METHODS.PERSONAL_SIGN;
    processedMessage.params = [...params, selectedAddress];
    DevLogger.log(
      `metamask_connectSign selectedAddress=${selectedAddress} id=${id}`,
      processedMessage,
    );
    Logger.log(
      `metamask_connectSign selectedAddress=${selectedAddress}`,
      params,
    );
  } else if (lcMethod === RPC_METHODS.METAMASK_BATCH.toLowerCase()) {
    if (!(Array.isArray(params) && params.length > 0)) {
      throw new Error('Invalid message format');
    }
    const rpcs = params;
    // Add rpcs to the batch manager
    batchRPCManager.add({ id, rpcs });

    // Send the first rpc method to the background bridge
    const batchRpc = rpcs[0];
    processedMessage.id = id + `_0`; // Add index to id to keep track of the order
    processedMessage.jsonrpc = '2.0';
    processedMessage.method = batchRpc.method;
    processedMessage.params = batchRpc.params;
    DevLogger.log(
      `handleCustomRpcCalls method=${method} id=${id}`,
      processedMessage,
    );
  }
  return processedMessage;
};

export default handleCustomRpcCalls;
