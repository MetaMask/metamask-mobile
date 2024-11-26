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

export const mockedEmptyFlagsState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: [] as FeatureFlags,
        cacheTimestamp: 0,
      },
    },
  },
};
