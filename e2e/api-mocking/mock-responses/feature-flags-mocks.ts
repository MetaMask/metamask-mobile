export const oldConfirmationsRemoteFeatureFlags = [
  {
    mobileMinimumVersions: {
      appMinimumBuild: 1243,
      appleMinimumOS: 6,
      androidMinimumAPIVersion: 21,
    },
  },
  {
    confirmation_redesign: {
      signatures: false,
      staking_confirmations: false,
      contract_deployment: false,
      contract_interaction: false,
      transfer: false,
      approve: false,
    },
    sendRedesign: {
      enabled: false,
    },
  },
];

export const confirmationsRedesignedFeatureFlags = [
  {
    mobileMinimumVersions: {
      appMinimumBuild: 1243,
      appleMinimumOS: 6,
      androidMinimumAPIVersion: 21,
    },
  },
  {
    confirmation_redesign: {
      signatures: true,
      staking_confirmations: true,
      contract_deployment: true,
      contract_interaction: true,
      transfer: true,
      approve: true,
    },
    sendRedesign: {
      enabled: false,
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
  predictTradingEnabled: {
    enabled,
    minimumVersion: '7.60.0',
  },
});

export const remoteFeatureFlagCardFeature = () => ({
  cardFeature: {
    constants: {
      accountsApiUrl: 'https://accounts.api.cx.metamask.io',
      onRampApiUrl: 'https://on-ramp.uat-api.cx.metamask.io',
    },
    chains: {
      'eip155:59144': {
        tokens: [
          {
            symbol: 'USDC',
            address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
            decimals: 6,
            enabled: true,
            name: 'USD Coin',
          },
          {
            enabled: true,
            name: 'Tether USD',
            symbol: 'USDT',
            address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
            decimals: 6,
          },
          {
            address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
            decimals: 18,
            enabled: true,
            name: 'Wrapped Ether',
            symbol: 'WETH',
          },
          {
            decimals: 18,
            enabled: true,
            name: 'EURe',
            symbol: 'EURe',
            address: '0x3ff47c5Bf409C86533FE1f4907524d304062428D',
          },
          {
            name: 'GBPe',
            symbol: 'GBPe',
            address: '0x3Bce82cf1A2bc357F956dd494713Fe11DC54780f',
            decimals: 18,
            enabled: true,
          },
          {
            decimals: 6,
            enabled: true,
            name: 'Aave USDC',
            symbol: 'aUSDC',
            address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
          },
        ],
        balanceScannerAddress: '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a',
        enabled: true,
        foxConnectAddresses: {
          us: '0xA90b298d05C2667dDC64e2A4e17111357c215dD2',
          global: '0x9dd23A4a0845f10d65D293776B792af1131c7B30',
        },
      },
    },
  },
});

export const remoteFeatureFlagDisplayCardButtonEnabled = (enabled = true) => ({
  displayCardButton: {
    enabled,
    minimumVersion: '7.58.2',
  },
});

export const remoteFeatureFlagCardExperimentalSwitch2Enabled = (
  enabled = true,
) => ({
  cardExperimentalSwitch2: {
    enabled,
    minimumVersion: '7.58.2',
  },
});

export const remoteFeatureFlagSendRedesignDisabled = {
  urlEndpoint:
    'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
  response: [
    {
      sendRedesign: {
        enabled: false,
      },
    },
  ],
  responseCode: 200,
};
