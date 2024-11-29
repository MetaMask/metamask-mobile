import { RemoteFeatureFlagControllerMessenger, RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

export interface RemoteFeatureFlagInitParamTypes {
  state?: RemoteFeatureFlagControllerState;
  messenger: RemoteFeatureFlagControllerMessenger,
  fetch: typeof fetch,
  disabled: boolean
}

