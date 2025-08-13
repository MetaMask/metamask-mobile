import { Connection } from '../types/connection';
import { IHostApplicationAdapter } from './IHostApplicationAdapter';

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showConnectionApproval(
    connectionId: string,
    dappMetadata: Connection['dappMetadata'],
  ): Promise<void> {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.showConnectionApproval called but is not yet implemented.',
    );
    return Promise.resolve();
  }

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

  syncConnectionList(connections: Connection[]): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.syncConnectionList called but is not yet implemented.',
    );
  }
}
