import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  CommunicationLayerMessage,
  MessageType,
} from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import { Connection, RPC_METHODS } from '../Connection';
import { METHODS_TO_REDIRECT } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import {
  waitForConnectionReadiness,
  waitForKeychainUnlocked,
} from '../utils/wait.util';
import checkPermissions from './checkPermissions';
import handleCustomRpcCalls from './handleCustomRpcCalls';
import handleSendMessage from './handleSendMessage';

export const handleConnectionMessage = async ({
  message,
  Engine,
  connection,
}: {
  message: CommunicationLayerMessage;
  Engine: any;
  connection: Connection;
}) => {
  // TODO should probably handle this in a separate EventType.TERMINATE event.
  // handle termination message
  if (message.type === MessageType.TERMINATE) {
    // Delete connection from storage
    connection.onTerminate({ channelId: connection.channelId });
    return;
  } else if (message.type === 'ping') {
    DevLogger.log(`Connection::ping id=${connection.channelId}`);
    return;
  }

  // ignore anything other than RPC methods
  if (!message.method || !message.id) {
    DevLogger.log(`Connection::onMessage invalid message`, message);
    return;
  }

  const lcMethod = message.method.toLowerCase();
  let needsRedirect = METHODS_TO_REDIRECT[message?.method] ?? false;

  if (needsRedirect) {
    connection.requestsToRedirect[message?.id] = true;
  }

  // Keep this section only for backward compatibility otherwise metamask doesn't redirect properly.
  if (
    !connection.originatorInfo?.apiVersion &&
    !needsRedirect &&
    // connection.originatorInfo?.platform !== 'unity' &&
    lcMethod === RPC_METHODS.METAMASK_GETPROVIDERSTATE.toLowerCase()
  ) {
    // Manually force redirect if apiVersion isn't defined for backward compatibility
    needsRedirect = true;
    connection.requestsToRedirect[message?.id] = true;
  }

  // Wait for keychain to be unlocked before handling rpc calls.
  const keyringController = (
    Engine.context as { KeyringController: KeyringController }
  ).KeyringController;
  await waitForKeychainUnlocked({
    keyringController,
    context: 'connection::on_message',
  });

  connection.setLoading(false);

  const preferencesController = (
    Engine.context as {
      PreferencesController: PreferencesController;
    }
  ).PreferencesController;
  const selectedAddress = preferencesController.state.selectedAddress;

  DevLogger.log(`Connection::onMessage`, message);
  // Wait for bridge to be ready before handling messages.
  // It will wait until user accept/reject the connection request.
  try {
    await checkPermissions({ message, connection, Engine });
    if (!connection.receivedDisconnect) {
      await waitForConnectionReadiness({ connection });
      connection.sendAuthorized();
    } else {
      // Reset state to continue communication after reconnection.
      connection.isReady = true;
      connection.receivedDisconnect = false;
    }
  } catch (error) {
    // Approval failed - redirect to app with error.
    const msg = {
      data: {
        error,
        id: message.id,
        jsonrpc: '2.0',
      },
      name: 'metamask-provider',
    };
    handleSendMessage({
      msg,
      connection,
    }).catch(() => {
      Logger.log(error, `Connection approval failed`);
    });
    connection.approvalPromise = undefined;
    return;
  }

  // // Special case for metamask_connectSign
  // if (lcMethod === RPC_METHODS.METAMASK_CONNECTWITH.toLowerCase()) {
  //   // TODO activate once refactor is vetted.
  //   // // format of the message:
  //   // // { method: 'metamask_connectWith', params: [ { method: 'personalSign' | 'eth_sendTransaction', params: any[] ] } ] } }
  //   // if (
  //   //   !(
  //   //     message?.params &&
  //   //     Array.isArray(message.params) &&
  //   //     message.params.length > 0
  //   //   )
  //   // ) {
  //   //   throw new Error('Invalid message format');
  //   // }
  //   // // Extract the rpc method from the params
  //   // const rpc = message.params[0];
  //   // message.message = rpc.method;
  //   // message.params = rpc.params;
  //   // // Replace message.params with the selected address
  //   // if (Platform.OS === 'ios') {
  //   //   // TODO: why does ios (older devices) requires a delay after request is initially approved?
  //   //   await wait(1000);
  //   // }
  // } else if (lcMethod === RPC_METHODS.METAMASK_CONNECTSIGN.toLowerCase()) {
  //   // Replace with personal_sign
  //   message.method = RPC_METHODS.PERSONAL_SIGN;
  //   if (
  //     !(
  //       message?.params &&
  //       Array.isArray(message.params) &&
  //       message.params.length > 0
  //     )
  //   ) {
  //     throw new Error('Invalid message format');
  //   }

  //   if (Platform.OS === 'ios') {
  //     // TODO: why does ios (older devices) requires a delay after request is initially approved?
  //     await wait(1000);
  //   }

  //   message.params = [(message.params as string[])[0], selectedAddress];

  //   Logger.log(
  //     `metamask_connectSign selectedAddress=${selectedAddress}`,
  //     message.params,
  //   );
  // } else if (lcMethod === RPC_METHODS.METAMASK_BATCH.toLowerCase()) {
  //   DevLogger.log(`metamask_batch`, JSON.stringify(message, null, 2));
  //   if (
  //     !(
  //       message?.params &&
  //       Array.isArray(message.params) &&
  //       message.params.length > 0
  //     )
  //   ) {
  //     throw new Error('Invalid message format');
  //   }
  //   const rpcs = message.params;
  //   // Add rpcs to the batch manager
  //   connection.batchRPCManager.add({ id: message.id, rpcs });

  //   // Send the first rpc method to the background bridge
  //   const rpc = rpcs[0];
  //   rpc.id = message.id + `_0`; // Add index to id to keep track of the order
  //   rpc.jsonrpc = '2.0';
  //   DevLogger.log(
  //     `metamask_batch method=${rpc.method} id=${rpc.id}`,
  //     rpc.params,
  //   );

  //   connection.backgroundBridge?.onMessage({
  //     name: 'metamask-provider',
  //     data: rpc,
  //     origin: 'sdk',
  //   });

  //   return;
  // }
  // Handle custom rpc method
  const processedRpc = await handleCustomRpcCalls({
    batchRPCManager: connection.batchRPCManager,
    selectedAddress,
    backgroundBridge: connection.backgroundBridge,
    rpc: {
      id: message.id,
      method: message.method,
      params: message.params as any,
    },
  });
  DevLogger.log(`message`, message);
  DevLogger.log(`processedRpc`, processedRpc);

  connection.rpcQueueManager.add({
    id: processedRpc?.id ?? message.id,
    method: processedRpc?.method ?? message.method,
  });

  connection.backgroundBridge?.onMessage({
    name: 'metamask-provider',
    data: processedRpc,
    origin: 'sdk',
  });
};

export default handleConnectionMessage;
