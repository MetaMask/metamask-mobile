const initialState = {
  securityAlertResponse: undefined,
};

const signatureRequestReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE':
      return {
        securityAlertResponse: action.securityAlertResponse,
      };
    default:
      return state;
  }
};
export default signatureRequestReducer;
