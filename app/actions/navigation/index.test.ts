import { setCurrentRoute, setCurrentBottomNavRoute } from './index';
import {
  SET_CURRENT_ROUTE,
  SET_CURRENT_BOTTOM_NAV_ROUTE,
} from '../../reducers/navigation';

describe('Navigation actions', () => {
  it('should create an action to set the current route', () => {
    const route = 'home';
    const expectedAction = {
      type: SET_CURRENT_ROUTE,
      payload: { route },
    };
    expect(setCurrentRoute(route)).toEqual(expectedAction);
  });

  it('should create an action to set the current bottom nav route', () => {
    const route = 'settings';
    const expectedAction = {
      type: SET_CURRENT_BOTTOM_NAV_ROUTE,
      payload: { route },
    };
    expect(setCurrentBottomNavRoute(route)).toEqual(expectedAction);
  });
});
