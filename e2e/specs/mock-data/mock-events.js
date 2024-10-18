export const mockEvents = {
    suggestedGasApiSuccessResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 200,
      responseBodyFile: '/mock-responses/suggestGasApi.js',
      responseType: 'success',
    },
    suggestedGasApiErrorResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 500,
      responseBodyFile: '/mock-responses/suggestGasApi.js',
      responseType: 'error',
    },
    suggestedGasApiSlowResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 200,
      responseBodyFile: '/mock-responses/suggestGasApi.js',
      responseType: 'slowResponse',
    },
  };
