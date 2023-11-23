import { Platform } from 'react-native';
import Logger from '../../../util/Logger';
import BatchRPCManager from '../BatchRPCManager';
import { RPC_METHODS } from '../Connection';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';

export const handleCustomRpcCalls = async ({
  rpc,
  batchRPCManager,
  selectedAddress,
}: {
  selectedAddress?: string;
  batchRPCManager: BatchRPCManager;
  rpc: { id: string; method: string; params: any[] };
}) => {
  const { id, method, params } = rpc;
  const lcMethod = method.toLowerCase();
  const processedMessage = { method, id, params, jsonrpc: '2.0' };
  DevLogger.log(`handleCustomRpcCalls`, processedMessage);
  DevLogger.log(`rpc`, rpc);
  // Special case for metamask_connectSign
  if (lcMethod === RPC_METHODS.METAMASK_CONNECTWITH.toLowerCase()) {
    // TODO activate once refactor is vetted.
    // // format of the message:
    // // { method: 'metamask_connectWith', params: [ { method: 'personalSign' | 'eth_sendTransaction', params: any[] ] } ] } }
    // if (
    //   !(
    //     message?.params &&
    //     Array.isArray(params) &&
    //     params.length > 0
    //   )
    // ) {
    //   throw new Error('Invalid message format');
    // }
    // // Extract the rpc method from the params
    // const rpc = params[0];
    // message.message = rpc.method;
    // params = rpc.params;
    // // Replace params with the selected address
    // if (Platform.OS === 'ios') {
    //   // TODO: why does ios (older devices) requires a delay after request is initially approved?
    //   await wait(1000);
    // }
  } else if (lcMethod === RPC_METHODS.METAMASK_CONNECTSIGN.toLowerCase()) {
    // Replace with personal_sign
    processedMessage.method = RPC_METHODS.PERSONAL_SIGN;
    if (!(Array.isArray(params) && params.length > 0)) {
      throw new Error('Invalid message format');
    }

    if (Platform.OS === 'ios') {
      // TODO: why does ios (older devices) requires a delay after request is initially approved?
      await wait(1000);
    }

    processedMessage.params = ['hello world', selectedAddress];
    DevLogger.log(
      `metamask_connectSign selectedAddress=${selectedAddress} id=${id}`,
      processedMessage,
    );
    Logger.log(
      `metamask_connectSign selectedAddress=${selectedAddress}`,
      params,
    );
  } else if (lcMethod === RPC_METHODS.METAMASK_BATCH.toLowerCase()) {
    DevLogger.log(`metamask_batch`, JSON.stringify(params, null, 2));
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
  }
  return processedMessage;
};

export default handleCustomRpcCalls;
