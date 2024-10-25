import { suggestedGasApiResponses, suggestedGasFeesApiGanache } from '../mock-responses/mock-responses.json';

export const mockEvents = {
  GET: {
    suggestedGasFeesMainNetError: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      response: suggestedGasApiResponses.error, // Ensure this exists
      responseCode: 500
    },
    suggestedGasFeesApiGanache: {
      urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1337/suggestedGasFees',
      response: suggestedGasFeesApiGanache,
      responseCode: 200
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
