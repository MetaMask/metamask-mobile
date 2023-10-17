/* eslint-disable import/prefer-default-export */
import {
  SET_CURRENT_ROUTE,
  SET_CURRENT_BOTTOM_NAV_ROUTE,
} from '../../reducers/navigation';

/**
 * Action Creators
 */
export const setCurrentRoute = (route: string) => ({
  type: SET_CURRENT_ROUTE,
  payload: { route },
});

export const setCurrentBottomNavRoute = (route: string) => ({
  type: SET_CURRENT_BOTTOM_NAV_ROUTE,
  payload: { route },
});
