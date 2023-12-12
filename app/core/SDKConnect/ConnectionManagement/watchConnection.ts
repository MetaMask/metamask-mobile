import { ConnectionStatus, EventType } from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';
import { Connection } from '../Connection';
import SDKConnect from '../SDKConnect';
import { CONNECTION_LOADING_EVENT } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';

function watchConnection(connection: Connection, instance: SDKConnect) {
  connection.remote.on(
    EventType.CONNECTION_STATUS,
    (connectionStatus: ConnectionStatus) => {
      if (connectionStatus === ConnectionStatus.TERMINATED) {
        instance.removeChannel(connection.channelId);
      }
    },
  );

  connection.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
    const host = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
    // Prevent disabled connection ( if user chose do not remember session )
    const isDisabled = instance.state.disabledHosts[host]; // should be 0 when disabled.
    DevLogger.log(
      `SDKConnect::watchConnection CLIENTS_DISCONNECTED channel=${connection.channelId} origin=${connection.origin} isDisabled=${isDisabled}`,
    );
    if (isDisabled !== undefined) {
      instance
        .updateSDKLoadingState({
          channelId: connection.channelId,
          loading: false,
        })
        .catch((err) => {
          Logger.log(
            err,
            `SDKConnect::watchConnection can't update SDK loading state`,
          );
        });
      // Force terminate connection since it was disabled (do not remember)
      instance.removeChannel(connection.channelId, true);
    }
  });

  connection.on(CONNECTION_LOADING_EVENT, (event: { loading: boolean }) => {
    const channelId = connection.channelId;
    const { loading } = event;
    instance.updateSDKLoadingState({ channelId, loading }).catch((err) => {
      Logger.log(
        err,
        `SDKConnect::watchConnection can't update SDK loading state`,
      );
    });
  });
}

export default watchConnection;
