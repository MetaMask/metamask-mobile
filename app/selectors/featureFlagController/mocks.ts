import { FeatureFlags } from "@metamask/remote-feature-flag-controller";
import { mockedMinimumAppVersion } from "./minimumAppVersion/mocks";

export const mockedState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: [
          mockedMinimumAppVersion
        ] as FeatureFlags,
        cacheTimestamp: 0,
      },
    },
  },
};
