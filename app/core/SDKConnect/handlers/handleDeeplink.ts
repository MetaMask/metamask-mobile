import AppConstants from '../../AppConstants';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { waitForCondition } from '../utils/wait.util';
import Logger from '../../../util/Logger';

const QRCODE_PARAM_PATTERN = '&t=q';

const handleDeeplink = async ({
  sdkConnect,
  channelId,
  origin,
  url,
  protocolVersion,
  otherPublicKey,
  context,
}: {
  sdkConnect: SDKConnect;
  channelId: string;
  origin: string;
  url: string;
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
  // TODO:  or like this? Need to compare...
  // const channelExists = sdkConnect.getApprovedHosts()[params.channelId];

  DevLogger.log(
    `handleDeeplink:: channel=${channelId} exists=${channelExists}`,
  );

  // First display the loading modal to give user feedback
  sdkConnect.updateSDKLoadingState({ channelId, loading: true }).catch(() => {
    // Ignore error --- We don't want to block while state is being updated.
  });

  DevLogger.log(`handleDeeplink:: channel=${channelId} loading=true`);

  try {
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
    } else {
      await sdkConnect.connectToChannel({
        id: channelId,
        origin,
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
