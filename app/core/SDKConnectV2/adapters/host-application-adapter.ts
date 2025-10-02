import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import Engine from '../../Engine';
import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';

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

  /**
   * Revokes {@link Caip25EndowmentPermissionName} permission from a connection / origin.
   * @param connectionId - The origin of the connection.
   */
  revokePermissions(connectionId: string): void {
    try {
      Engine.context.PermissionController.revokePermission(
        connectionId,
        Caip25EndowmentPermissionName,
      );
    } catch {
      console.warn(
        `[SDKConnectV2] HostApplicationAdapter.revokePermissions called but no ${Caip25EndowmentPermissionName} permission for ${connectionId}.`,
      );
    }
  }
}
