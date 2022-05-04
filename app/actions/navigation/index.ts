/* eslint-disable import/prefer-default-export */
import { SET_CURRENT_ROUTE } from '../../reducers/navigation';

/**
 * Action Creators
 */
export const setCurrentRoute = (route: string) => ({
  type: SET_CURRENT_ROUTE,
  payload: { route },
});
