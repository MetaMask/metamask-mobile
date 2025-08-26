import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { Metadata } from '../types/metadata';

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showConnectionApproval(
    _connectionId: string,
    _dappMetadata: Metadata['dapp'],
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

  syncConnectionList(_connections: Connection[]): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.syncConnectionList called but is not yet implemented.',
    );
  }
}
