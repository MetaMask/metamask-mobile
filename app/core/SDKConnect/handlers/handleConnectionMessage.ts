import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  CommunicationLayerMessage,
  MessageType,
} from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
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

  const processedRpc = await handleCustomRpcCalls({
    batchRPCManager: connection.batchRPCManager,
    selectedAddress,
    rpc: {
      id: message.id,
      method: message.method,
      params: message.params as any,
    },
  });

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
