import { suggestedGasApiResponses } from '../mock-responses/mockResponses.json';

export const mockEvents = {
  GET: {
    suggestedGasApiErrorResponse: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.error, // Ensure this exists
    },
    suggestedGasApiSuccessResponse: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.success,
    },
  },
  POST: {
    suggestedGasApiPostResponse: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.success,
      requestBody: {
        // Example fields for the request body, modify as needed
        priorityFee: '2',
        maxFee: '2.000855333',
      },
    },
  },
};
