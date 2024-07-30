import { ConnectionStatus, EventType } from '@metamask/sdk-communication-layer';
import { resetConnections } from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
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
        instance.removeChannel({
          channelId: connection.channelId,
          sendTerminate: false,
        });
        if (instance.state.connections[connection.channelId]) {
          instance.state.connections[connection.channelId].connected = false;
        }
      } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
        instance.updateSDKLoadingState({
          channelId: connection.channelId,
          loading: false,
        });
        if (instance.state.connections[connection.channelId]) {
          instance.state.connections[connection.channelId].connected = false;
        }
      } else if (connectionStatus === ConnectionStatus.WAITING) {
        if (instance.state.connections[connection.channelId]) {
          instance.state.connections[connection.channelId].connected = false;
        }
      }
      store.dispatch(resetConnections(instance.state.connections));
      DevLogger.log(
        `SDKConnect::watchConnection CONNECTION_STATUS ${connection.channelId} ${connectionStatus}`,
      );
    },
  );

  connection.remote.on(EventType.CHANNEL_PERSISTENCE, () => {
    DevLogger.log(
      `SDKConnect::watchConnection CHANNEL_PERSISTENCE ${connection.channelId}`,
    );
    if (instance.state.connections[connection.channelId]) {
      instance.state.connections[connection.channelId].relayPersistence = true;
      store.dispatch(resetConnections(instance.state.connections));
    }
  });

  connection.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
    const host = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
    // Prevent disabled connection ( if user chose do not remember session )
    const isDisabled = instance.state.disabledHosts[host]; // should be 0 when disabled.
    DevLogger.log(
      `SDKConnect::watchConnection CLIENTS_DISCONNECTED channel=${connection.channelId} origin=${connection.origin} isDisabled=${isDisabled}`,
    );

    // update initialConnection state
    if (instance.state.connections[connection.channelId]) {
      instance.state.connections[connection.channelId].initialConnection =
        false;
    }

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
      instance.removeChannel({
        channelId: connection.channelId,
        sendTerminate: true,
      });
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
