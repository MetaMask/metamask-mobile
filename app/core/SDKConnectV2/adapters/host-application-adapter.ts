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
import { strings } from '../../../../locales/i18n';
import { ConnectionInfo } from '../types/connection-info';

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showConnectionLoading(conninfo: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo.id,
        autodismiss: 8000,
        title: strings('sdk_connect_v2.show_loading.title'),
        description: strings('sdk_connect_v2.show_loading.description', {
          dappName: conninfo.metadata.dapp.name,
        }),
        status: 'pending',
      }),
    );
  }

  hideConnectionLoading(conninfo: ConnectionInfo): void {
    store.dispatch(hideNotificationById(conninfo.id));
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

  syncConnectionList(conns: Connection[]): void {
    const v2Sessions: SDKSessions = conns.reduce((acc, conn) => {
      const props: ConnectionProps & { isV2: boolean } = {
        id: conn.id,
        otherPublicKey: '',
        origin: conn.info.metadata.dapp.url,
        originatorInfo: {
          title: conn.info.metadata.dapp.name,
          url: conn.info.metadata.dapp.url,
          icon: conn.info.metadata.dapp.icon,
          dappId: conn.info.metadata.dapp.name,
          apiVersion: conn.info.metadata.sdk.version,
          platform: conn.info.metadata.sdk.platform,
        },
        isV2: true, // Flag to identify this as a V2 connection
      };
      acc[conn.id] = props;
      return acc;
    }, {} as SDKSessions);

    store.dispatch(setSdkV2Connections(v2Sessions));
  }

  revokePermissions(connId: string): void {
    const allAccountsForOrigin = getPermittedAccounts(connId);
    if (allAccountsForOrigin.length > 0) {
      removePermittedAccounts(connId, allAccountsForOrigin);
    }
  }
}
