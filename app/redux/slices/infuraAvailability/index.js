import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

const initialState = {
  isBlocked: false,
};

export const INFURA_AVAILABILITY_BLOCKED = 'INFURA_AVAILABILITY_BLOCKED';
export const INFURA_AVAILABILITY_NOT_BLOCKED =
  'INFURA_AVAILABILITY_NOT_BLOCKED';

export const getInfuraBlockedSelector = (state) =>
  state.infuraAvailability?.isBlocked;

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case INFURA_AVAILABILITY_BLOCKED:
      return {
        ...state,
        isBlocked: true,
      };
    case INFURA_AVAILABILITY_NOT_BLOCKED:
      return {
        ...state,
        isBlocked: false,
      };
    default:
      return state;
  }
};

const infuraAvailabilityConfig = {
  key: 'infuraAvailability',
  blacklist: [],
  storage: MigratedStorage,
};

const infuraAvailabilityReducer = persistReducer(
  infuraAvailabilityConfig,
  reducer,
);

export default infuraAvailabilityReducer;
