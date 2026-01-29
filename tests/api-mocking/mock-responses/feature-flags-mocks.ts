export const confirmationFeatureFlags = [
  {
    mobileMinimumVersions: {
      appMinimumBuild: 1243,
      appleMinimumOS: 6,
      androidMinimumAPIVersion: 21,
    },
  },
  {
    confirmations_eip_7702: {
      contracts: {
        '0xaa36a7': [
          {
            signature:
              '0x016cf109489c415ba28e695eb3cb06ac46689c5c49e2aba101d7ec2f68c890282563b324f5c8df5e0536994451825aa235438b7346e8c18b4e64161d990781891c',
            address: '0xCd8D6C5554e209Fbb0deC797C6293cf7eAE13454',
          },
        ],
        '0x539': [
          {
            address: '0x8438Ad1C834623CfF278AB6829a248E37C2D7E3f',
            signature:
              '0x4c15775d0c6d5bd37a7aa7aafc62e85597ea705024581b8b5cb0edccc4e6a69e26c495b3ae725815a377c9789bff43bf19e4dd1eaa679e65133e49ceee3ea87f1b',
          },
        ],
        '0x1': [
          {
            address: '0xabcabcabcabcabcabcabcabcabcabcabcabcabca',
            signature:
              '0x5b394cc656b760fc15e855f9b8b9d0eec6337328361771c696d7f5754f0348e06298d34243e815ff8b5ce869e5f310c37dd100c1827e91b56bb208d1fafcf3a71c',
          },
        ],
        '0x89': [
          {
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
            signature:
              '0x302aa2d59940e88f35d2fa140fe6a1e9dc682218a444a7fb2d88f007fbe7792b2b8d615f5ae1e4f184533a02c47d8ac0f6ba3f591679295dff93c65095c0f03d1b',
          },
        ],
      },
      supportedChains: ['0xaa36a7', '0x539', '0x1', '0x89'],
    },
  },
];

export const remoteFeatureEip7702 = [
  {
    mobileMinimumVersions: {
      appMinimumBuild: 1243,
      appleMinimumOS: 6,
      androidMinimumAPIVersion: 21,
    },
  },
  {
    confirmations_eip_7702: {
      contracts: {
        '0xaa36a7': [
          {
            signature:
              '0x016cf109489c415ba28e695eb3cb06ac46689c5c49e2aba101d7ec2f68c890282563b324f5c8df5e0536994451825aa235438b7346e8c18b4e64161d990781891c',
            address: '0xCd8D6C5554e209Fbb0deC797C6293cf7eAE13454',
          },
        ],
        '0x539': [
          {
            address: '0x8438Ad1C834623CfF278AB6829a248E37C2D7E3f',
            signature:
              '0x4c15775d0c6d5bd37a7aa7aafc62e85597ea705024581b8b5cb0edccc4e6a69e26c495b3ae725815a377c9789bff43bf19e4dd1eaa679e65133e49ceee3ea87f1b',
          },
        ],
        '0x1': [
          {
            address: '0xabcabcabcabcabcabcabcabcabcabcabcabcabca',
            signature:
              '0x5b394cc656b760fc15e855f9b8b9d0eec6337328361771c696d7f5754f0348e06298d34243e815ff8b5ce869e5f310c37dd100c1827e91b56bb208d1fafcf3a71c',
          },
        ],
        '0x89': [
          {
            name: 'Polygon',
            signature:
              '0x302aa2d59940e88f35d2fa140fe6a1e9dc682218a444a7fb2d88f007fbe7792b2b8d615f5ae1e4f184533a02c47d8ac0f6ba3f591679295dff93c65095c0f03d1b',
            address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          },
        ],
      },
      supportedChains: ['0xaa36a7', '0x539', '0x1', '0x89'],
    },
  },
];

export const remoteFeatureMultichainAccountsAccountDetails = (
  enabled = true,
) => ({
  enableMultichainAccounts: {
    enabled,
    featureVersion: '1',
    minimumVersion: '7.46.0',
  },
});

export const remoteFeatureMultichainAccountsAccountDetailsV2 = (
  enabled = true,
) => ({
  enableMultichainAccountsState2: {
    enabled,
    featureVersion: '2',
    minimumVersion: '7.46.0',
  },
});

export const remoteFeatureFlagPredictEnabled = (enabled = true) => ({
  predictEnabled: enabled,
  predictTradingEnabled: {
    enabled,
    minimumVersion: '7.60.0',
  },
  predictGtmOnboardingModalEnabled: {
    enabled: false,
    minimumVersion: '7.60.0',
  },
});

export const remoteFeatureFlagTrendingTokensEnabled = (enabled = true) => ({
  trendingTokens: enabled,
});

export const remoteFeatureFlagExtensionUxPna25 = (enabled = true) => ({
  extensionUxPna25: enabled,
});

export const remoteFeatureFlagTronAccounts = (enabled = true) => ({
  tronAccounts: {
    enabled,
    minimumVersion: '0.0.0',
  },
});
