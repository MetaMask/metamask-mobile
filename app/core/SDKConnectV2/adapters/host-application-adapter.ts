import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';

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

  syncConnectionList(_connections: Connection[]): void {
    console.warn(
      '[SDKConnectV2] HostApplicationAdapter.syncConnectionList called but is not yet implemented in this PR.',
    );
  }
}
