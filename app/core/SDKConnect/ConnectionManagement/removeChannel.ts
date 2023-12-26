import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import DefaultPreference from 'react-native-default-preference';

function removeChannel({
  channelId,
  sendTerminate,
  instance,
}: {
  channelId: string;
  sendTerminate?: boolean;
  instance: SDKConnect;
}) {
  DevLogger.log(
    `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} connectedted=${
      instance.state.connected[channelId] !== undefined
    }`,
  );

  if (instance.state.connected[channelId]) {
    try {
      instance.state.connected[channelId].removeConnection({
        terminate: sendTerminate ?? false,
        context: 'SDKConnect::removeChannel',
      });
    } catch (err) {
      // Ignore error
    }

    delete instance.state.connected[channelId];
    delete instance.state.connections[channelId];
    delete instance.state.approvedHosts[
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
    ];

    delete instance.state.disabledHosts[
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
    ];

    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(instance.state.connections),
    ).catch((err) => {
      throw err;
    });

    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(instance.state.approvedHosts),
    ).catch((err) => {
      throw err;
    });
  }
  delete instance.state.connecting[channelId];
  instance.emit('refresh');
}

export default removeChannel;
