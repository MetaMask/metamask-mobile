import { KeyringController } from '@metamask/keyring-controller';
import {
  CommunicationLayerMessage,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
import { Platform } from 'react-native';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { waitForCondition, waitForKeychainUnlocked } from '../utils/wait.util';
import handleConnectionMessage from './handleConnectionMessage';

const QRCODE_PARAM_PATTERN = '&t=q';

const handleDeeplink = async ({
  sdkConnect,
  channelId,
  origin,
  url,
  originatorInfo,
  rpc,
  protocolVersion,
  otherPublicKey,
  context,
}: {
  sdkConnect: SDKConnect;
  channelId: string;
  origin: string;
  url: string;
  originatorInfo?: OriginatorInfo;
  rpc?: string;
  protocolVersion: number;
  otherPublicKey: string;
  context: string;
}) => {
  if (!sdkConnect.hasInitialized()) {
    DevLogger.log(
      `handleDeeplink:: sdkConnect not initialized --- waiting for it`,
    );
    await waitForCondition({
      fn: () => sdkConnect.hasInitialized(),
      context: 'deeplink',
      waitTime: 500,
    });
    DevLogger.log(
      `handleDeeplink:: sdkConnect initialized --- continue with deeplink`,
    );
  }

  DevLogger.log(`handleDeeplink:: origin=${origin} url=${url}`);

  // Wait for keychain to be unlocked before handling rpc calls.
  const keyringController = (
    Engine.context as { KeyringController: KeyringController }
  ).KeyringController;

  await waitForKeychainUnlocked({
    keyringController,
    context: 'connection::on_message',
  });

  // Detect if origin matches qrcode param
  // SDKs should all add the type of intended use in the qrcode so it can be used correctly when scaning with the camera
  // does url contains t=d (deelink) or t=q (qrcode)
  if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
    // Confirm that the url doesn't contain a qrcode param
    // If it happens, it means the user scaned the qrcode with the camera (outside metamask app)
    if (url.includes(QRCODE_PARAM_PATTERN)) {
      DevLogger.log(
        `handleDeeplink:: url=${url} contains qrcode param --- change origin to qrcode`,
      );
      origin = AppConstants.DEEPLINKS.ORIGIN_QR_CODE;
    }
  }
  DevLogger.log(`handleDeeplink:: url=${url}`);
  const connections = sdkConnect.getConnections();
  const channelExists = connections[channelId] !== undefined;

  DevLogger.log(
    `handleDeeplink:: channel=${channelId} exists=${channelExists}`,
  );

  try {
    if (channelExists) {
      // is it already connected?
      let connected =
        sdkConnect.getConnected()[channelId]?.remote.isConnected() ?? false;

      if (!connected) {
        if (sdkConnect.state.connecting[channelId] === true) {
          // skip reconnect if connecting
          DevLogger.log(
            `handleDeeplink:: channel=${channelId} is connecting --- SKIP reconnect`,
            sdkConnect.state.connecting,
          );
          // wait for connection to be established
          await waitForCondition({
            fn: () => {
              DevLogger.log(
                `handleDeeplink:: channel=${channelId} is connecting --- wait for connection to be established`,
                sdkConnect.state.connecting,
              );
              return sdkConnect.state.connecting[channelId] === false;
            },
            context: 'handleDeeplink',
            waitTime: 1000,
          });
        } else {
          DevLogger.log(`handleDeeplink:: channel=${channelId} reconnecting`);
          await sdkConnect.reconnect({
            channelId,
            otherPublicKey,
            context,
            protocolVersion,
            initialConnection: false,
            trigger: 'deeplink',
            updateKey: true,
          });
        }
      } else {
        DevLogger.log(
          `handleDeeplink:: channel=${channelId} is already connected`,
        );
      }

      connected =
        sdkConnect.getConnected()[channelId]?.remote.isConnected() ?? false;
      DevLogger.log(
        `handleDeeplink:: channel=${channelId} reconnected=${connected} -- handle rcp ${rpc}`,
      );
      // If msg contains rpc calls, handle them
      if (rpc) {
        const connection = sdkConnect.getConnected()[channelId];
        if (!connection) {
          DevLogger.log(`handleDeeplink:: connection not found`);
          return;
        }

        // Decode rpc and directly process it - simulate network reception
        const decodedRPC = Buffer.from(rpc, 'base64').toString('utf-8');

        DevLogger.log(`decoded rpc`, decodedRPC);
        // Decode rpc and directly process it - simulate network reception
        const clearRPC = connection.remote.decrypt(decodedRPC);
        DevLogger.log(`handleDeeplink:: clearRPC rpc`, clearRPC);

        const message = JSON.parse(clearRPC) as CommunicationLayerMessage;
        DevLogger.log(`handleDeeplink:: message`, message);

        // Check if already received via websocket
        const rpcQueueManager = connection.rpcQueueManager;
        if (message.id && rpcQueueManager.getId(message.id)) {
          // Already received via websocket
          DevLogger.log(
            `handleDeeplink:: rpcId=${message.id} already received via websocket`,
          );
          return;
        }

        await handleConnectionMessage({
          message,
          connection,
          engine: Engine,
        });
      }
    } else {
      const trigger =
        rpc !== undefined && origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
          ? undefined // temporarily unset trigger on android to prevent goBack after connection approval
          : 'deeplink';

      DevLogger.log(
        `handleDeeplink:: connectToChannel - trigger=${trigger} origin=${origin} platform=${Platform.OS} rpc=${rpc}`,
      );
      await sdkConnect.connectToChannel({
        id: channelId,
        origin,
        originatorInfo,
        initialConnection: true,
        protocolVersion,
        trigger,
        otherPublicKey,
      });

      // When RPC is provided on new connection, it means connectWith.
      if (rpc) {
        const connection = sdkConnect.getConnected()[channelId];
        if (!connection) {
          DevLogger.log(`handleDeeplink:: connection not found`);
          return;
        }

        if (!trigger) {
          // set trigger back to deeplink on android
          connection.trigger = 'deeplink';
        }

        // Decode rpc and directly process it - simulate network reception
        const decodedRPC = Buffer.from(rpc, 'base64').toString('utf-8');

        DevLogger.log(`decoded rpc`, decodedRPC);

        const message = JSON.parse(decodedRPC) as CommunicationLayerMessage;
        DevLogger.log(`handleDeeplink:: message`, message);

        await handleConnectionMessage({
          message,
          connection,
          engine: Engine,
        });
      }
    }
  } catch (error) {
    Logger.error(error as Error, 'Failed to connect to channel');
  }
};

export default handleDeeplink;
