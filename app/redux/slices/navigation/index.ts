/**
 * @ deprecated: this reducer is being used in DrawerView but we no longer use that section of code form it
 * reducer can be removed entirely
 */
import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';
/**
 * Constants
 */
export const SET_CURRENT_ROUTE = 'SET_CURRENT_ROUTE';
export const SET_CURRENT_BOTTOM_NAV_ROUTE = 'SET_CURRENT_TAB_BAR_ROUTE';

/**
 * Reducers
 */
interface InitialState {
  currentRoute: string;
  currentBottomNavRoute: string;
}

const initialState: InitialState = {
  currentRoute: 'WalletView',
  currentBottomNavRoute: 'Wallet',
};

const reducer = (state = initialState, action: any = {}) => {
  switch (action.type) {
    case SET_CURRENT_ROUTE:
      return {
        ...state,
        currentRoute: action.payload.route,
      };
    case SET_CURRENT_BOTTOM_NAV_ROUTE:
      return {
        ...state,
        currentBottomNavRoute: action.payload.route,
      };
    default:
      return state;
  }
};

/**
 * Selectors
 */
export const getCurrentRoute = (state: any) => state.navigation.currentRoute;

const navigationConfig = {
  key: 'navigation',
  blacklist: [],
  storage: MigratedStorage,
};

const navigationReducer = persistReducer(navigationConfig, reducer);

export default navigationReducer;
