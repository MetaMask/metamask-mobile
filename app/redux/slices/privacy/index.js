import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

const initialState = {
  approvedHosts: {},
  revealSRPTimestamps: [],
};

const reducer = (state = initialState, action) => {
  const newHosts = { ...state.approvedHosts };
  switch (action.type) {
    case 'APPROVE_HOST':
      return {
        ...state,
        approvedHosts: {
          ...state.approvedHosts,
          [action.hostname]: true,
        },
      };
    case 'REJECT_HOST':
      delete newHosts[action.hostname];
      return {
        ...state,
        approvedHosts: newHosts,
      };
    case 'CLEAR_HOSTS':
      return {
        ...state,
        approvedHosts: {},
      };
    case 'RECORD_SRP_REVEAL_TIMESTAMP':
      return {
        ...state,
        revealSRPTimestamps: [...state.revealSRPTimestamps, action.timestamp],
      };
    default:
      return state;
  }
};

const privacyPersistConfig = {
  key: 'privacy',
  blacklist: '',
  storage: MigratedStorage,
};

const privacyReducer = persistReducer(privacyPersistConfig, reducer);

export default privacyReducer;
