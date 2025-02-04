import { RemoteFeatureFlagControllerMessenger, RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

export interface RemoteFeatureFlagInitParamTypes {
  state?: RemoteFeatureFlagControllerState;
  messenger: RemoteFeatureFlagControllerMessenger;
  disabled: boolean;
  getMetaMetricsId: () => string;
  fetchInterval?: number;
}

