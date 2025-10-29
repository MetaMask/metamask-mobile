import { SecurityAlertResponse } from '../../components/Views/confirmations/legacy/components/BlockaidBanner/BlockaidBanner.types';

interface StateType {
  securityAlertResponse?: SecurityAlertResponse;
}

interface ActionType {
  type: string;
  securityAlertResponse?: SecurityAlertResponse;
}

const initialState: StateType = {
  securityAlertResponse: undefined,
};

const signatureRequestReducer = (
  state: StateType = initialState,
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
