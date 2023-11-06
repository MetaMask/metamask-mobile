import AppConstants from '../AppConstants';
import SDKConnect from './SDKConnect';
import DevLogger from './utils/DevLogger';
import { waitForCondition } from './utils/wait.util';

const handleDeeplink = async ({
  sdkConnect,
  channelId,
  origin,
  otherPublicKey,
  context,
}: {
  sdkConnect: SDKConnect;
  channelId: string;
  origin: string;
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

  const connections = sdkConnect.getConnections();
  const channelExists = connections[channelId] !== undefined;
  // TODO:  or like this? Need to compare...
  // const channelExists = sdkConnect.getApprovedHosts()[params.channelId];

  DevLogger.log(
    `handleDeeplink:: channel=${channelId} exists=${channelExists}`,
  );

  if (channelExists) {
    if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
      // Automatically re-approve hosts.
      sdkConnect.revalidateChannel({
        channelId,
      });
    }
    sdkConnect.reconnect({
      channelId,
      otherPublicKey,
      context,
      initialConnection: false,
      updateKey: true,
    });
  } else {
    sdkConnect.connectToChannel({
      id: channelId,
      origin,
      otherPublicKey,
    });
  }
};

export default handleDeeplink;
