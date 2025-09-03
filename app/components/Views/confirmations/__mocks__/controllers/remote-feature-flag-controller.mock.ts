export const rffSendRedesignDisabledMock = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          sendRedesign: { enabled: false },
        },
      },
    },
  },
};

export const rffSendRedesignEnabledMock = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: { sendRedesign: { enabled: true } },
      },
    },
  },
};
