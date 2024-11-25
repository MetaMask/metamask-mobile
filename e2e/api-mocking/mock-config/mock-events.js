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
  },
};
