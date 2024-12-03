import { NavigationActionType } from '../../actions/navigation/types';
import { NavigationState } from './types';

export * from './types';

export * from './selectors';

/**
 * Initial navigation state
 */
const initialState: NavigationState = {
  currentRoute: 'WalletView',
  currentBottomNavRoute: 'Wallet',
};

/**
 * Navigation reducer
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navigationReducer = (state = initialState, action: any = {}) => {
  switch (action.type) {
    case NavigationActionType.SET_CURRENT_ROUTE:
      return {
        ...state,
        currentRoute: action.payload.route,
      };
    case NavigationActionType.SET_CURRENT_BOTTOM_NAV_ROUTE:
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
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentRoute = (state: any) => state.navigation.currentRoute;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentBottomNavRoute = (state: any) =>
  state.navigation.currentBottomNavRoute;

export default navigationReducer;
