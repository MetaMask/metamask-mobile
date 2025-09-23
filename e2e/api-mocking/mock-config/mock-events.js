/**
 * Mock events for gas fee API responses.
 */

import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';
import {
  suggestedGasApiResponses,
  suggestedGasFeesApiGanache,
} from '../mock-responses/gas-api-responses.json';
import defiPositionsWithData from '../mock-responses/defi-api-response-data.json';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder';

export const mockEvents = {
  /**
   * Mock GET request events.
   */
  GET: {
    /**
     * Mainnet gas fees endpoint with a mock 500 error response.
     * @property {string} urlEndpoint - API endpoint for mainnet gas fees.
     * @property {Object} response - Error response data.
     */
    suggestedGasFeesMainNetError: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.error,
      responseCode: 500,
    },

    /**
     * Ganache gas fees endpoint with a mock 200 success response.
     * @property {string} urlEndpoint - API endpoint for Ganache gas fees.
     * @property {Object} response - Success response data.
     */
    suggestedGasFeesApiGanache: {
      urlEndpoint:
        'https://gas.api.cx.metamask.io/networks/1337/suggestedGasFees',
      response: suggestedGasFeesApiGanache,
      responseCode: 200,
    },
    remoteFeatureFlagsOldConfirmations: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
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
      ],
      responseCode: 200,
    },

    remoteFeatureFlagsRedesignedConfirmations: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
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
            },
            supportedChains: ['0xaa36a7', '0x539', '0x1'],
          },
        },
      ],
      responseCode: 200,
    },

    remoteFeatureFlagsRedesignedConfirmationsFlask: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
      response: [
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
      ],
      responseCode: 200,
    },

    remoteFeatureFlagSendRedesignDisabled: {
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
    },

    // TODO: Remove when this feature is no longer behind a feature flag
    remoteFeatureFlagsDefiPositionsEnabled: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
        {
          assetsDefiPositionsEnabled: true,
        },
      ],
      responseCode: 200,
    },

    // TODO: Remove when this feature is no longer behind a feature flag
    remoteFeatureFlagsNotificationsEnabledByDefault: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
        {
          assetsEnableNotificationsByDefault: true,
        },
      ],
      responseCode: 200,
    },

    defiPositionsWithNoData: {
      urlEndpoint: `https://defiadapters.api.cx.metamask.io/positions/${DEFAULT_FIXTURE_ACCOUNT}`,
      response: { data: [] },
      responseCode: 200,
    },

    defiPositionsError: {
      urlEndpoint: `https://defiadapters.api.cx.metamask.io/positions/${DEFAULT_FIXTURE_ACCOUNT}`,
      response: { error: 'Internal server error' },
      responseCode: 500,
    },

    defiPositionsWithData: {
      urlEndpoint: `https://defiadapters.api.cx.metamask.io/positions/${DEFAULT_FIXTURE_ACCOUNT}`,
      response: { data: defiPositionsWithData },
      responseCode: 200,
    },

    remoteFeatureMultichainAccountsAccountDetails: (enabled = true) => ({
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
        {
          enableMultichainAccounts: {
            enabled,
            featureVersion: '1',
            minimumVersion: '7.46.0',
          },
        },
      ],
      responseCode: 200,
    }),

    remoteFeatureEip7702: {
      urlEndpoint:
        'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
      response: [
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
            },
            supportedChains: ['0xaa36a7', '0x539', '0x1'],
          },
        },
      ],
      responseCode: 200,
    },
  },

  /**
   * Mock POST request events.
   */
  POST: {
    /**
     * Mainnet gas fees endpoint with a mock success response for POST requests.
     * @property {string} urlEndpoint - API endpoint for mainnet gas fees.
     * @property {Object} response - Success response data.
     * @property {Object} requestBody - Expected fields for the POST request body.
     */
    suggestedGasApiPostResponse: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.success,
      requestBody: {
        priorityFee: '2',
        maxFee: '2.000855333',
      },
    },

    securityAlertApiValidate: {
      urlEndpoint:
        'https://security-alerts.api.cx.metamask.io/validate/0xaa36a7',
      response: {
        block: 20733513,
        result_type: 'Benign',
        reason: '',
        description: '',
        features: [],
      },
      requestBody: {
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
        origin: 'metamask',
        params: [
          {
            from: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
            to: '0x50587e46c5b96a3f6f9792922ec647f13e6efae4',
            value: '0x0',
          },
        ],
      },
      responseCode: 201,
    },

    segmentTrack: {
      urlEndpoint: E2E_METAMETRICS_TRACK_URL,
      responseCode: 200,
      response: { success: true },
    },
  },
};
