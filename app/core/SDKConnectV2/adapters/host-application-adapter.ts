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

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showLoading(): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.showLoading called but is not yet implemented.',
    );
  }

  hideLoading(): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.hideLoading called but is not yet implemented.',
    );
  }

  showAlert(): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.showAlert called but is not yet implemented.',
    );
  }

  showOTPModal(): Promise<void> {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.showOTPModal called but is not yet implemented.',
    );
    return Promise.resolve();
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
