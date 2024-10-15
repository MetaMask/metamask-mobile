export const mockEvents = {
    suggestedGasApiSuccessResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 200,
      responseBodyFile: '../responseBodies/suggestedGasApi',
      responseType: 'success',
    },
    suggestedGasApiErrorResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 500,
      responseBodyFile: '../responseBodies/suggestedGasApi',
      responseType: 'error',
    },
    suggestedGasApiSlowResponse: {
      mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      responseCode: 200,
      responseBodyFile: '../responseBodies/suggestedGasApi',
      responseType: 'slowResponse',
    },
  };
