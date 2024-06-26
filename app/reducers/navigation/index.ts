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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navigationReducer = (state = initialState, action: any = {}) => {
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
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentRoute = (state: any) => state.navigation.currentRoute;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentBottomNavRoute = (state: any) =>
  state.navigation.currentBottomNavRoute;

export default navigationReducer;
