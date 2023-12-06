import { SecurityAlertResponse } from '../../../components/UI/BlockaidBanner/BlockaidBanner.types';
import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

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

const reducer = (
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

const signatureRequestPersistConfig = {
  key: 'signatureRequest',
  blacklist: [],
  storage: MigratedStorage,
};

const signatureRequestReducer = persistReducer(
  signatureRequestPersistConfig,
  reducer,
);

export default signatureRequestReducer;
