import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';

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

  showOTPModal(): Promise<void> {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.showOTPModal called but is not yet implemented.',
    );
    return Promise.resolve();
  }

  /**
   * Sync the connection list from the host application to the redux store.
   * It transforms the V2 Connection[] array into the SDKSessions object format
   * so that we can reuse the existing UI components and UX flows.
   * @param connections - A list of dApps connections.
   */
  syncConnectionList(connections: Connection[]): void {
    const v2Sessions: SDKSessions = connections.reduce((acc, connection) => {
      const connectionProps: ConnectionProps & { isV2: boolean } = {
        id: connection.id,
        otherPublicKey: '',
        origin: connection.dappMetadata.url,
        originatorInfo: {
          title: connection.dappMetadata.name,
          url: connection.dappMetadata.url,
          icon: connection.dappMetadata.icon,
          dappId: connection.dappMetadata.name,
          apiVersion: connection.dappMetadata.sdk?.version,
          platform: connection.dappMetadata.sdk?.platform || 'unknown',
        },
        connected: true, // V2 connections in the registry are always considered live
        isV2: true, // Flag to identify this as a V2 connection
      };
      acc[connection.id] = connectionProps;
      return acc;
    }, {} as SDKSessions);

    store.dispatch(setSdkV2Connections(v2Sessions));
  }
}
