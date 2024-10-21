import { suggestedGasApiResponses } from '../mock-responses/mockResponses';

export const mockEvents = {
  suggestedGasApiErrorResponse: {
    urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
    response: suggestedGasApiResponses.error,
  },
  suggestedGasOkayResponse: {
    urlEndpoint: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
    response: suggestedGasApiResponses.okayResponse,
  },
};
