/**
 * Constants
 */
export const SET_CURRENT_ROUTE = 'SET_CURRENT_ROUTE';

/**
 * Reducers
 */
interface InitialState {
  currentRoute: string;
}

const initialState: InitialState = {
  currentRoute: 'WalletView',
};

const navigationReducer = (state = initialState, action: any = {}) => {
  switch (action.type) {
    case SET_CURRENT_ROUTE:
      return {
        ...state,
        currentRoute: action.payload.route,
      };
    default:
      return state;
  }
};

/**
 * Selectors
 */
export const getCurrentRoute = (state: any) => state.navigation.currentRoute;

export default navigationReducer;
