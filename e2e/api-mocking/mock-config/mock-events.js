/**
 * Mock events for gas fee API responses.
 */

import {
  suggestedGasApiResponses,
  suggestedGasFeesApiGanache,
} from '../mock-responses/gas-api-responses.json';

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

    securityAlertApiSupportedChains: {
      urlEndpoint: 'https://security-alerts.api.cx.metamask.io/supportedChains',
      response: [
        '0xa4b1',
        '0xa86a',
        '0x2105',
        '0x138d5',
        '0x38',
        '0xe708',
        '0x1',
        '0x1b6e6',
        '0xcc',
        '0xa',
        '0x89',
        '0x82750',
        '0xaa36a7',
        '0x144',
      ],
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
        { confirmation_redesign: { signatures: false } },
      ],
      responseCode: 200,
    },

    remoteFeatureFlagsReDesignedConfirmations: {
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
        { confirmation_redesign: { signatures: true } },
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
  },
};
