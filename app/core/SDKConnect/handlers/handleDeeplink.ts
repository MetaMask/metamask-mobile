import {
  CommunicationLayerMessage,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import { getPermittedAccounts } from '../../Permissions';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { waitForAsyncCondition, waitForCondition } from '../utils/wait.util';
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
    // First display the loading modal to give user feedback
    await sdkConnect.updateSDKLoadingState({ channelId, loading: true });
    DevLogger.log(`handleDeeplink:: channel=${channelId} loading=true`);

    if (channelExists) {
      if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
        // Automatically re-approve hosts.
        sdkConnect.revalidateChannel({
          channelId,
        });
      }
      await sdkConnect.reconnect({
        channelId,
        otherPublicKey,
        context,
        protocolVersion,
        initialConnection: false,
        trigger: 'deeplink',
        updateKey: true,
      });

      DevLogger.log(
        `handleDeeplink:: channel=${channelId} reconnected -- handle rcp`,
      );
      // If msg contains rpc calls, handle them
      if (rpc) {
        // wait for accounts to be loaded
        await waitForAsyncCondition({
          fn: async () => {
            const accounts = await getPermittedAccounts(channelId);
            DevLogger.log(
              `handleDeeplink::waitForAsyncCondition accounts`,
              accounts,
            );
            return accounts.length > 0;
          },
          context: 'deeplink',
          waitTime: 500,
        });

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

        await handleConnectionMessage({
          message,
          connection,
          engine: Engine,
        });
      }
    } else {
      await sdkConnect.connectToChannel({
        id: channelId,
        origin,
        originatorInfo,
        initialConnection: true,
        protocolVersion,
        trigger: 'deeplink',
        otherPublicKey,
      });
    }
  } catch (error) {
    Logger.error(error as Error, 'Failed to connect to channel');
  }
};

export default handleDeeplink;
