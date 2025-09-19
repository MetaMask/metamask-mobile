import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import {
  getPermittedAccounts,
  removePermittedAccounts,
} from '../../../core/Permissions';
import {
  hideNotificationById,
  showSimpleNotification,
} from '../../../actions/notification';
import { ConnectionRequest } from '../types/connection-request';
import { strings } from '../../../../locales/i18n';

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showConnectionLoading(connreq: ConnectionRequest): void {
    store.dispatch(
      showSimpleNotification({
        id: connreq.sessionRequest.id,
        autodismiss: 8000,
        title: strings('sdk_connect_v2.show_loading.title'),
        description: strings('sdk_connect_v2.show_loading.description', {
          dappName: connreq.metadata.dapp.name,
        }),
        status: 'pending',
      }),
    );
  }

  hideConnectionLoading(connreq: ConnectionRequest): void {
    store.dispatch(hideNotificationById(connreq.sessionRequest.id));
  }

  showConnectionError(): void {
    store.dispatch(
      showSimpleNotification({
        id: Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_error.title'),
        description: strings('sdk_connect_v2.show_error.description'),
        status: 'error',
      }),
    );
  }

  syncConnectionList(connections: Connection[]): void {
    const v2Sessions: SDKSessions = connections.reduce((acc, connection) => {
      const connectionProps: ConnectionProps & { isV2: boolean } = {
        id: connection.id,
        otherPublicKey: '',
        origin: connection.metadata.dapp.url,
        originatorInfo: {
          title: connection.metadata.dapp.name,
          url: connection.metadata.dapp.url,
          icon: connection.metadata.dapp.icon,
          dappId: connection.metadata.dapp.name,
          apiVersion: connection.metadata.sdk.version,
          platform: connection.metadata.sdk.platform,
        },
        isV2: true, // Flag to identify this as a V2 connection
      };
      acc[connection.id] = connectionProps;
      return acc;
    }, {} as SDKSessions);

    store.dispatch(setSdkV2Connections(v2Sessions));
  }

  revokePermissions(connectionId: string): void {
    const allAccountsForOrigin = getPermittedAccounts(connectionId);
    if (allAccountsForOrigin.length > 0) {
      removePermittedAccounts(connectionId, allAccountsForOrigin);
    }
  }
}
