import { SecurityAlertResponse } from '../../components/Views/confirmations/legacy/components/BlockaidBanner/BlockaidBanner.types';

export interface SignatureRequestState {
  securityAlertResponse?: SecurityAlertResponse;
}

interface ActionType {
  type: string;
  securityAlertResponse?: SecurityAlertResponse;
}

const initialState: SignatureRequestState = {
  securityAlertResponse: undefined,
};

const signatureRequestReducer = (
  state: SignatureRequestState = initialState,
  action: ActionType = { type: 'NONE' },
) => {
  switch (action.type) {
    case 'SET_SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE':
      return {
        securityAlertResponse: action.securityAlertResponse,
      };
    default:
      return state;
  }
};
export default signatureRequestReducer;
