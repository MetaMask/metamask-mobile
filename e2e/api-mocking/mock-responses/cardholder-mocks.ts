import { TestSpecificMock } from '../../framework/types';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder';
import { mockProxyGet } from '../mockHelpers';

/**
 * Mock responses for cardholder API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

const clientConfig = {
  urlEndpoint:
    'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
  response: [
    {
      depositConfig: {
        active: true,
        entrypoints: {
          walletActions: true,
        },
        minimumVersion: '1.0.0',
        providerApiKey: 'DUMMY_VALUE',
        providerFrontendAuth: 'DUMMY_VALUE',
      },
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
    },
  ],
  responseCode: 200,
};

export const testSpecificMock: TestSpecificMock = async (mockServer) => {
  await mockProxyGet(
    mockServer,
    'https://on-ramp.dev-api.cx.metamask.io/geolocation',
    'PT',
  );
  await mockProxyGet(
    mockServer,
    clientConfig.urlEndpoint,
    clientConfig.response,
  );
  await mockProxyGet(
    mockServer,
    /^https:\/\/accounts\.api\.cx\.metamask\.io\/v1\/metadata\?.*$/,
    {
      is: [`eip155:0:${DEFAULT_FIXTURE_ACCOUNT.toLowerCase()}`],
    },
  );
};
